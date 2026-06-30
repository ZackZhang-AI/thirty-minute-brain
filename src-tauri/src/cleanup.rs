use crate::events::{self, AppState};

pub fn cleanup_expired_events(state: &AppState) -> tauri::Result<()> {
    let connection = state.connection.lock().expect("database lock poisoned");
    events::cleanup_expired_events(&connection)?;
    Ok(())
}

