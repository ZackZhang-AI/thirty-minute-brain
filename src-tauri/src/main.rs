mod cleanup;
mod commands;
mod context_pack;
mod db;
mod events;
mod models;
mod sensitive;
mod watcher;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use events::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        show_main_window(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            let state = AppState::new(app.handle())?;
            cleanup::cleanup_expired_events(&state)?;
            app.manage(state);
            setup_tray(app)?;
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
            app.global_shortcut().register(shortcut)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_event,
            commands::create_manual_event,
            commands::create_clipboard_event,
            commands::list_recent_events,
            commands::search_events,
            commands::update_event,
            commands::toggle_pin_event,
            commands::delete_event,
            commands::delete_events,
            commands::clear_events,
            commands::generate_context_pack,
            commands::get_privacy_status,
            commands::clear_all_events,
            commands::add_watched_folder,
            commands::list_watched_folders,
            commands::remove_watched_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running Thirty-Minute Brain");
}

fn main() {
    run();
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Thirty-Minute Brain", true, None::<&str>)?;
    let toggle_clipboard = MenuItem::with_id(app, "toggle_clipboard", "Pause or resume clipboard capture", true, None::<&str>)?;
    let clear = MenuItem::with_id(app, "clear_events", "Clear unpinned events", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &toggle_clipboard, &clear, &quit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main_window(app),
            "toggle_clipboard" => {
                let _ = app.emit("toggle-clipboard-capture", ());
            }
            "clear_events" => {
                let state = app.state::<AppState>();
                if let Ok(connection) = state.connection.lock() {
                    let _ = crate::events::clear_events(&connection, None);
                    let _ = app.emit("events-changed", ());
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit("focus-search", ());
    }
}
