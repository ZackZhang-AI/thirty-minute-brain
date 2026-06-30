use crate::events::{self, AppState};
use crate::models::{NewEvent, WatchedFolder};
use chrono::Utc;
use notify::{EventKind, RecursiveMode, Watcher};
use rusqlite::params;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

pub fn add_watched_folder(path: String, app: AppHandle, state: State<'_, AppState>) -> Result<WatchedFolder, String> {
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    {
        let connection = state.connection.lock().expect("database lock poisoned");
        connection
            .execute(
                "INSERT OR REPLACE INTO watched_folders (id, path, kind, enabled, created_at) VALUES (?1, ?2, ?3, 1, ?4)",
                params![id, path, "screenshot", created_at],
            )
            .map_err(|error| error.to_string())?;
    }

    start_folder_watcher(path.clone(), app, &state)?;

    Ok(WatchedFolder {
        id,
        path,
        kind: "screenshot".to_string(),
        enabled: true,
        created_at,
    })
}

pub fn list_watched_folders(state: State<'_, AppState>) -> Result<Vec<WatchedFolder>, String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    let mut statement = connection
        .prepare("SELECT id, path, kind, enabled, created_at FROM watched_folders ORDER BY created_at DESC")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(WatchedFolder {
                id: row.get(0)?,
                path: row.get(1)?,
                kind: row.get(2)?,
                enabled: row.get::<_, i64>(3)? == 1,
                created_at: row.get(4)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

pub fn remove_watched_folder(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    connection
        .execute("UPDATE watched_folders SET enabled = 0 WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn start_folder_watcher(path: String, app: AppHandle, state: &State<'_, AppState>) -> Result<(), String> {
    let watch_path = PathBuf::from(&path);
    let mut watcher = notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
        let Ok(event) = result else {
            return;
        };
        if !matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_)) {
            return;
        }
        for path in event.paths {
            if is_supported_image(&path) {
                let app = app.clone();
                thread::spawn(move || {
                    thread::sleep(Duration::from_millis(500));
                    let Some(file_name) = path.file_name().and_then(|value| value.to_str()).map(|value| value.to_string()) else {
                        return;
                    };
                    let path_string = path.to_string_lossy().to_string();
                    let state = app.state::<AppState>();
                    let connection = state.connection.lock().expect("database lock poisoned");
                    let _ = events::create_event(
                        &connection,
                        NewEvent {
                            event_type: "screenshot".to_string(),
                            title: file_name,
                            content: None,
                            source: Some("watched_folder".to_string()),
                            path: Some(path_string),
                            url: None,
                            note: None,
                            metadata_json: None,
                            content_hash: None,
                            sensitive_flag: false,
                            sensitive_reason: None,
                        },
                    );
                });
            }
        }
    })
    .map_err(|error| error.to_string())?;

    watcher
        .watch(&watch_path, RecursiveMode::NonRecursive)
        .map_err(|error| error.to_string())?;

    state
        .watchers
        .lock()
        .expect("watcher lock poisoned")
        .push(watcher);

    Ok(())
}

fn is_supported_image(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| matches!(extension.to_ascii_lowercase().as_str(), "png" | "jpg" | "jpeg" | "webp"))
        .unwrap_or(false)
}

