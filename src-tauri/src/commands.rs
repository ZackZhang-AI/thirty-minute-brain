use crate::context_pack;
use crate::events;
use crate::models::{
    CreateEventRequest, EventUpdateInput, MemoryEvent, NewEvent, NewManualEventInput,
    PrivacyStatus, WatchedFolder,
};
use crate::sensitive;
use crate::watcher;
use serde_json::{json, Value};
use tauri::{AppHandle, State};

use crate::events::AppState;

#[tauri::command]
pub fn create_event(
    input: CreateEventRequest,
    state: State<'_, AppState>,
) -> Result<MemoryEvent, String> {
    create_event_inner(input, state)
}

#[tauri::command]
pub fn ingest_external_event(
    input: CreateEventRequest,
    state: State<'_, AppState>,
) -> Result<MemoryEvent, String> {
    create_event_inner(input, state)
}

fn create_event_inner(
    input: CreateEventRequest,
    state: State<'_, AppState>,
) -> Result<MemoryEvent, String> {
    validate_ingestion_source(&input)?;
    validate_required_fields(&input)?;

    let filtered = input
        .content
        .as_deref()
        .map(sensitive::filter_sensitive_content);
    let content_hash = events::sha256_hex(&stable_event_hash_input(&input));
    let metadata_json = sanitize_metadata(
        input.metadata_json.as_deref(),
        &input.source,
        &input.event_type,
    );
    let connection = state.connection.lock().expect("database lock poisoned");
    if let Some(existing) =
        events::find_event_by_hash(&connection, &content_hash).map_err(|error| error.to_string())?
    {
        return Ok(existing);
    }

    events::create_event(
        &connection,
        NewEvent {
            event_type: input.event_type,
            title: if filtered
                .as_ref()
                .map(|result| result.sensitive)
                .unwrap_or(false)
            {
                filtered
                    .as_ref()
                    .map(|result| result.title.clone())
                    .unwrap_or_else(|| sensitive::SENSITIVE_CONTENT_PLACEHOLDER.to_string())
            } else if input.title.trim().is_empty() {
                filtered
                    .as_ref()
                    .map(|result| result.title.clone())
                    .unwrap_or_else(|| "Untitled".to_string())
            } else {
                input.title
            },
            content: filtered.as_ref().and_then(|result| result.content.clone()),
            source: Some(input.source),
            path: input.path,
            url: input.url,
            note: input.note,
            metadata_json,
            content_hash: Some(content_hash),
            sensitive_flag: filtered
                .as_ref()
                .map(|result| result.sensitive)
                .unwrap_or(false),
            sensitive_reason: filtered.and_then(|result| result.reason),
        },
    )
    .map_err(|error| error.to_string())
}

fn validate_ingestion_source(input: &CreateEventRequest) -> Result<(), String> {
    let allowed = match input.source.as_str() {
        "manual" => &["file", "link", "note"][..],
        "clipboard" => &["clipboard"][..],
        "watched_folder" => &["screenshot"][..],
        "browser_extension" => &["browser_tab"][..],
        "vscode_extension" => &["editor_file", "editor_selection"][..],
        "shell_hook" => &["command"][..],
        other => return Err(format!("Unauthorized event source: {}", other)),
    };

    if allowed.contains(&input.event_type.as_str()) {
        Ok(())
    } else {
        Err(format!(
            "{} cannot create {} events",
            input.source, input.event_type
        ))
    }
}

fn validate_required_fields(input: &CreateEventRequest) -> Result<(), String> {
    match input.event_type.as_str() {
        "browser_tab" | "link" if input.url.as_deref().unwrap_or("").trim().is_empty() => {
            Err(format!("{} requires url", input.event_type))
        }
        "file" | "screenshot" | "editor_file"
            if input.path.as_deref().unwrap_or("").trim().is_empty() =>
        {
            Err(format!("{} requires path", input.event_type))
        }
        "clipboard" | "note" | "editor_selection" | "command"
            if input.content.as_deref().unwrap_or("").trim().is_empty() =>
        {
            Err(format!("{} requires content", input.event_type))
        }
        _ => Ok(()),
    }
}

fn stable_event_hash_input(input: &CreateEventRequest) -> String {
    json!({
        "type": &input.event_type,
        "title": &input.title,
        "content": input.content.clone().unwrap_or_default(),
        "path": input.path.clone().unwrap_or_default(),
        "url": input.url.clone().unwrap_or_default(),
        "note": input.note.clone().unwrap_or_default(),
        "source": &input.source,
    })
    .to_string()
}

fn sanitize_metadata(
    metadata_json: Option<&str>,
    source: &str,
    event_type: &str,
) -> Option<String> {
    let mut metadata = metadata_json
        .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
        .and_then(|value| value.as_object().cloned())
        .unwrap_or_default();

    if event_type == "command" {
        for key in [
            "stdout",
            "stderr",
            "output",
            "commandOutput",
            "combinedOutput",
        ] {
            metadata.remove(key);
        }
    }

    metadata.insert("source".to_string(), Value::String(source.to_string()));
    serde_json::to_string(&metadata).ok()
}

#[tauri::command]
pub fn create_manual_event(
    input: NewManualEventInput,
    state: State<'_, AppState>,
) -> Result<MemoryEvent, String> {
    let new_event = match input.event_type.as_str() {
        "note" => {
            let filtered = sensitive::filter_sensitive_content(
                input
                    .content
                    .as_deref()
                    .or(input.note.as_deref())
                    .unwrap_or(""),
            );
            NewEvent {
                event_type: "note".to_string(),
                title: if filtered.sensitive {
                    filtered.title.clone()
                } else {
                    input.title.unwrap_or(filtered.title.clone())
                },
                content: filtered.content,
                source: Some("manual".to_string()),
                path: None,
                url: None,
                note: input.note,
                metadata_json: None,
                content_hash: None,
                sensitive_flag: filtered.sensitive,
                sensitive_reason: filtered.reason,
            }
        }
        "link" => NewEvent {
            event_type: "link".to_string(),
            title: input.title.unwrap_or_else(|| {
                input
                    .url
                    .clone()
                    .unwrap_or_else(|| "Untitled link".to_string())
            }),
            content: None,
            source: Some("manual".to_string()),
            path: None,
            url: input.url,
            note: input.note,
            metadata_json: None,
            content_hash: None,
            sensitive_flag: false,
            sensitive_reason: None,
        },
        "file" => {
            let path = input.path.unwrap_or_default();
            let title = input.title.unwrap_or_else(|| {
                path.split(['\\', '/'])
                    .last()
                    .unwrap_or("Untitled file")
                    .to_string()
            });
            NewEvent {
                event_type: "file".to_string(),
                title,
                content: None,
                source: Some("manual".to_string()),
                path: Some(path),
                url: None,
                note: input.note,
                metadata_json: None,
                content_hash: None,
                sensitive_flag: false,
                sensitive_reason: None,
            }
        }
        other => return Err(format!("Unsupported manual event type: {}", other)),
    };

    let connection = state.connection.lock().expect("database lock poisoned");
    events::create_event(&connection, new_event).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_clipboard_event(
    content: String,
    state: State<'_, AppState>,
) -> Result<MemoryEvent, String> {
    let content_hash = events::sha256_hex(&content);
    let connection = state.connection.lock().expect("database lock poisoned");
    if let Some(existing) =
        events::find_event_by_hash(&connection, &content_hash).map_err(|error| error.to_string())?
    {
        return Ok(existing);
    }

    let filtered = sensitive::filter_sensitive_content(&content);
    events::create_event(
        &connection,
        NewEvent {
            event_type: "clipboard".to_string(),
            title: filtered.title,
            content: filtered.content,
            source: Some("clipboard".to_string()),
            path: None,
            url: None,
            note: None,
            metadata_json: None,
            content_hash: Some(content_hash),
            sensitive_flag: filtered.sensitive,
            sensitive_reason: filtered.reason,
        },
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_recent_events(
    window_minutes: Option<i64>,
    types: Option<Vec<String>>,
    sensitive_only: Option<bool>,
    include_pinned: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Vec<MemoryEvent>, String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    events::list_recent_events(
        &connection,
        window_minutes.unwrap_or(30),
        types,
        sensitive_only,
        include_pinned,
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn search_events(
    query: String,
    window_minutes: Option<i64>,
    types: Option<Vec<String>>,
    sensitive_only: Option<bool>,
    include_pinned: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Vec<MemoryEvent>, String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    events::search_events(
        &connection,
        &query,
        window_minutes.unwrap_or(30),
        types,
        sensitive_only,
        include_pinned,
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_event(
    id: String,
    input: EventUpdateInput,
    state: State<'_, AppState>,
) -> Result<MemoryEvent, String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    events::update_event(&connection, &id, input).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn toggle_pin_event(
    id: String,
    pinned: bool,
    state: State<'_, AppState>,
) -> Result<MemoryEvent, String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    events::toggle_pin_event(&connection, &id, pinned).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_event(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    events::delete_event(&connection, &id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_events(ids: Vec<String>, state: State<'_, AppState>) -> Result<(), String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    events::delete_events(&connection, ids).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn clear_all_events(state: State<'_, AppState>) -> Result<(), String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    events::clear_all_events(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn clear_events(window_minutes: Option<i64>, state: State<'_, AppState>) -> Result<(), String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    events::clear_events(&connection, window_minutes).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn generate_context_pack(
    window_minutes: Option<i64>,
    types: Option<Vec<String>>,
    sensitive_only: Option<bool>,
    include_pinned: Option<bool>,
    selected_ids: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    let recent = match selected_ids {
        Some(ids) if !ids.is_empty() => {
            events::get_events_by_ids(&connection, &ids).map_err(|error| error.to_string())?
        }
        _ => events::list_recent_events(
            &connection,
            window_minutes.unwrap_or(30),
            types,
            sensitive_only,
            include_pinned.or(Some(true)),
        )
        .map_err(|error| error.to_string())?,
    };
    Ok(context_pack::generate_context_pack(&recent))
}

#[tauri::command]
pub fn get_privacy_status(state: State<'_, AppState>) -> Result<PrivacyStatus, String> {
    let connection = state.connection.lock().expect("database lock poisoned");
    let event_count = events::count_events(&connection).map_err(|error| error.to_string())?;
    Ok(PrivacyStatus {
        local_only: true,
        retention_hours: 24,
        database_path: state.db_path.clone(),
        event_count,
        enabled_sources: vec![
            "manual".to_string(),
            "clipboard".to_string(),
            "watched_folder".to_string(),
            "browser_extension".to_string(),
            "vscode_extension".to_string(),
            "shell_hook".to_string(),
        ],
        disallowed_sources: vec![
            "browser_history".to_string(),
            "terminal_history".to_string(),
            "chat_apps".to_string(),
        ],
    })
}

#[tauri::command]
pub fn add_watched_folder(
    path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<WatchedFolder, String> {
    watcher::add_watched_folder(path, app, state)
}

#[tauri::command]
pub fn list_watched_folders(state: State<'_, AppState>) -> Result<Vec<WatchedFolder>, String> {
    watcher::list_watched_folders(state)
}

#[tauri::command]
pub fn remove_watched_folder(id: String, state: State<'_, AppState>) -> Result<(), String> {
    watcher::remove_watched_folder(id, state)
}
