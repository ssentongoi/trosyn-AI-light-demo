// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;

use std::sync::Mutex;


// Global state for document management
struct AppState {
    // Add any global state here if needed
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(AppState {
            // Initialize global state
        }))
        .setup(|app| {
            // Initialize recovery system on startup
            if let Err(e) = commands::documents::initialize_recovery() {
                eprintln!("Failed to initialize recovery system: {}", e);
            }
            
            // Set up auto-save task
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
                    loop {
                        interval.tick().await;
                        if let Err(e) = commands::documents::check_auto_save(&app_handle).await {
                            eprintln!("Auto-save error: {}", e);
                        }
                    }
                });
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Document management commands
            commands::documents::save_document,
            commands::documents::auto_save_document,
            commands::documents::load_document,
            commands::documents::load_document_with_dialog,
            commands::documents::export_document,
            commands::documents::list_documents,
            commands::documents::get_document,
            commands::documents::delete_document,
            commands::documents::get_document_version,
            commands::documents::restore_document_version,
            commands::documents::list_recovery_files,
            commands::documents::recover_document,
            
            // Filesystem commands
            commands::filesystem::check_file_exists,
            commands::filesystem::open_dialog,
            commands::filesystem::read_file,
        ])
        .on_window_event(|_window, event| {
            // Handle window close event to save any unsaved changes
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // In a real implementation, you would check for unsaved changes here
                // and show a confirmation dialog if needed
                
                // Example of how to prevent closing the window:
                // window.close().unwrap();
                // return;
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
