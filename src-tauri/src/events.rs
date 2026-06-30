use crate::db;
use crate::models::{EventUpdateInput, MemoryEvent, NewEvent};
use chrono::{Duration, Utc};
use notify::RecommendedWatcher;
use rusqlite::{params, Connection, OptionalExtension};
use sha2::{Digest, Sha256};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

pub struct AppState {
    pub connection: Mutex<Connection>,
    pub watchers: Mutex<Vec<RecommendedWatcher>>,
    pub db_path: String,
}

impl AppState {
    pub fn new(app: &AppHandle) -> tauri::Result<Self> {
        let db_path = app
            .path()
            .app_data_dir()?
            .join("thirty-minute-brain.sqlite3")
            .to_string_lossy()
            .to_string();
        Ok(Self {
            connection: Mutex::new(db::open_database(app)?),
            watchers: Mutex::new(Vec::new()),
            db_path,
        })
    }
}

pub fn create_event(connection: &Connection, event: NewEvent) -> rusqlite::Result<MemoryEvent> {
    let now = Utc::now();
    let created_at = now.to_rfc3339();
    let expires_at = (now + Duration::hours(24)).to_rfc3339();
    let id = Uuid::new_v4().to_string();

    connection.execute(
        "INSERT INTO events (
          id, type, title, content, source, path, url, note, metadata_json,
          content_hash, sensitive_flag, sensitive_reason, created_at, expires_at, pinned_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, NULL)",
        params![
            id,
            event.event_type,
            event.title,
            event.content,
            event.source,
            event.path,
            event.url,
            event.note,
            event.metadata_json,
            event.content_hash,
            event.sensitive_flag as i64,
            event.sensitive_reason,
            created_at,
            expires_at
        ],
    )?;

    get_event(connection, &id)
}

pub fn get_event(connection: &Connection, id: &str) -> rusqlite::Result<MemoryEvent> {
    connection.query_row(&select_sql("WHERE id = ?1"), params![id], row_to_event)
}

pub fn list_recent_events(
    connection: &Connection,
    window_minutes: i64,
    types: Option<Vec<String>>,
    sensitive_only: Option<bool>,
    include_pinned: Option<bool>,
) -> rusqlite::Result<Vec<MemoryEvent>> {
    let cutoff = (Utc::now() - Duration::minutes(window_minutes)).to_rfc3339();
    let mut events = all_events(connection)?;
    events.retain(|event| {
        let in_window = event.created_at >= cutoff;
        let pinned_ok = include_pinned.unwrap_or(true) && event.pinned_at.is_some();
        let type_ok = types.as_ref().map(|items| items.contains(&event.event_type)).unwrap_or(true);
        let sensitive_ok = !sensitive_only.unwrap_or(false) || event.sensitive_flag;
        (in_window || pinned_ok) && type_ok && sensitive_ok
    });
    events.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    Ok(events)
}

pub fn search_events(
    connection: &Connection,
    query: &str,
    window_minutes: i64,
    types: Option<Vec<String>>,
    sensitive_only: Option<bool>,
    include_pinned: Option<bool>,
) -> rusqlite::Result<Vec<MemoryEvent>> {
    let mut events = list_recent_events(connection, window_minutes, types, sensitive_only, include_pinned)?;
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(events);
    }

    let fts_matches = search_fts(connection, trimmed)?;
    if !fts_matches.is_empty() {
        events.retain(|event| fts_matches.contains(&event.id));
        return Ok(events);
    }

    let needle = trimmed.to_lowercase();
    events.retain(|event| {
        [
            event.title.as_str(),
            event.content.as_deref().unwrap_or(""),
            event.path.as_deref().unwrap_or(""),
            event.url.as_deref().unwrap_or(""),
            event.note.as_deref().unwrap_or(""),
        ]
            .iter()
            .any(|value| value.to_lowercase().contains(&needle))
    });
    Ok(events)
}

pub fn update_event(connection: &Connection, id: &str, input: EventUpdateInput) -> rusqlite::Result<MemoryEvent> {
    let existing = get_event(connection, id)?;
    let title = input.title.filter(|value| !value.trim().is_empty()).unwrap_or(existing.title);
    let note = input.note.or(existing.note);
    connection.execute("UPDATE events SET title = ?1, note = ?2 WHERE id = ?3", params![title, note, id])?;
    get_event(connection, id)
}

pub fn toggle_pin_event(connection: &Connection, id: &str, pinned: bool) -> rusqlite::Result<MemoryEvent> {
    let pinned_at = if pinned { Some(Utc::now().to_rfc3339()) } else { None };
    connection.execute("UPDATE events SET pinned_at = ?1 WHERE id = ?2", params![pinned_at, id])?;
    get_event(connection, id)
}

pub fn delete_event(connection: &Connection, id: &str) -> rusqlite::Result<()> {
    connection.execute("DELETE FROM events WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn delete_events(connection: &Connection, ids: Vec<String>) -> rusqlite::Result<()> {
    for id in ids {
        delete_event(connection, &id)?;
    }
    Ok(())
}

pub fn clear_all_events(connection: &Connection) -> rusqlite::Result<()> {
    connection.execute("DELETE FROM events", [])?;
    Ok(())
}

pub fn clear_events(connection: &Connection, window_minutes: Option<i64>) -> rusqlite::Result<()> {
    match window_minutes {
        Some(minutes) => {
            let cutoff = (Utc::now() - Duration::minutes(minutes)).to_rfc3339();
            connection.execute("DELETE FROM events WHERE created_at >= ?1 AND pinned_at IS NULL", params![cutoff])?;
        }
        None => {
            connection.execute("DELETE FROM events WHERE pinned_at IS NULL", [])?;
        }
    }
    Ok(())
}

pub fn cleanup_expired_events(connection: &Connection) -> rusqlite::Result<usize> {
    let now = Utc::now().to_rfc3339();
    connection.execute("DELETE FROM events WHERE expires_at <= ?1 AND pinned_at IS NULL", params![now])
}

pub fn count_events(connection: &Connection) -> rusqlite::Result<i64> {
    connection.query_row("SELECT COUNT(*) FROM events", [], |row| row.get(0))
}

pub fn find_event_by_hash(connection: &Connection, content_hash: &str) -> rusqlite::Result<Option<MemoryEvent>> {
    connection
        .query_row(
            &select_sql("WHERE content_hash = ?1 ORDER BY created_at DESC LIMIT 1"),
            params![content_hash],
            row_to_event,
        )
        .optional()
}

pub fn sha256_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn all_events(connection: &Connection) -> rusqlite::Result<Vec<MemoryEvent>> {
    let mut statement = connection.prepare(&select_sql("ORDER BY created_at DESC"))?;
    let rows = statement.query_map([], row_to_event)?;
    rows.collect()
}

fn search_fts(connection: &Connection, query: &str) -> rusqlite::Result<Vec<String>> {
    let fts_query = query
        .split_whitespace()
        .map(|term| format!("\"{}\"", term.replace('"', "\"\"")))
        .collect::<Vec<_>>()
        .join(" ");
    let mut statement = connection.prepare(
        "SELECT events.id
         FROM events_fts
         JOIN events ON events.rowid = events_fts.rowid
         WHERE events_fts MATCH ?1",
    )?;
    let rows = statement.query_map(params![fts_query], |row| row.get::<_, String>(0))?;
    rows.collect()
}

fn select_sql(where_clause: &str) -> String {
    format!(
        "SELECT id, type, title, content, source, path, url, note, metadata_json,
          content_hash, sensitive_flag, sensitive_reason, created_at, expires_at, pinned_at
         FROM events {}",
        where_clause
    )
}

fn row_to_event(row: &rusqlite::Row<'_>) -> rusqlite::Result<MemoryEvent> {
    Ok(MemoryEvent {
        id: row.get(0)?,
        event_type: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        source: row.get(4)?,
        path: row.get(5)?,
        url: row.get(6)?,
        note: row.get(7)?,
        metadata_json: row.get(8)?,
        content_hash: row.get(9)?,
        sensitive_flag: row.get::<_, i64>(10)? == 1,
        sensitive_reason: row.get(11)?,
        created_at: row.get(12)?,
        expires_at: row.get(13)?,
        pinned_at: row.get(14)?,
    })
}
