use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const MIGRATION: &str = include_str!("../migrations/001_init.sql");

pub fn open_database(app: &AppHandle) -> tauri::Result<Connection> {
    let app_data_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_data_dir)?;
    let db_path: PathBuf = app_data_dir.join("thirty-minute-brain.sqlite3");
    let connection = Connection::open(db_path)?;
    connection.execute_batch(MIGRATION)?;
    ensure_column(&connection, "events", "pinned_at", "TEXT")?;
    Ok(connection)
}

fn ensure_column(connection: &Connection, table: &str, column: &str, definition: &str) -> rusqlite::Result<()> {
    let mut statement = connection.prepare(&format!("PRAGMA table_info({})", table))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if !columns.iter().any(|existing| existing == column) {
        connection.execute(&format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, definition), [])?;
    }
    Ok(())
}
