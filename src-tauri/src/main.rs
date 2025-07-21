// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;

use std::sync::Mutex;


// Secure storage state
#[derive(Default, Serialize, Deserialize)]
struct SecureStorage {
    store: HashMap<String, String>,
}

impl SecureStorage {
    fn new() -> Self {
        Self {
            store: HashMap::new(),
        }
    }

    fn set(&mut self, key: String, value: String) -> Result<(), String> {
        self.store.insert(key, value);
        self.save().map_err(|e| e.to_string())
    }

    fn get(&self, key: &str) -> Option<String> {
        self.store.get(key).cloned()
    }

    fn remove(&mut self, key: &str) -> Result<(), String> {
        self.store.remove(key);
        self.save().map_err(|e| e.to_string())
    }

    fn save(&self) -> std::io::Result<()> {
        let app_dir = tauri::api::path::app_data_dir(&tauri::Config::default().unwrap())
            .ok_or_else(|| std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Could not find app data directory"
            ))?;
        
        std::fs::create_dir_all(&app_dir)?;
        
        let path = app_dir.join("secure_store.json");
        let serialized = serde_json::to_string(&self.store)?;
        
        // Encrypt the data before saving (in a real app, use proper encryption)
        // This is a placeholder - in production, use a proper encryption library
        fs::write(path, serialized)?;
        
        Ok(())
    }

    fn load() -> Self {
        let app_dir = match tauri::api::path::app_data_dir(&tauri::Config::default().unwrap()) {
            Some(dir) => dir,
            None => return Self::new(),
        };
        
        let path = app_dir.join("secure_store.json");
        
        match fs::read_to_string(&path) {
            Ok(contents) => {
                // In a real app, decrypt the data here
                match serde_json::from_str(&contents) {
                    Ok(store) => Self { store },
                    Err(_) => Self::new(),
                }
            },
            Err(_) => Self::new(),
        }
    }
}

// Global application state
struct AppState {
    secure_storage: Mutex<SecureStorage>,
}

// Secure storage commands
#[tauri::command]
async fn secure_set(key: String, value: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.secure_storage.lock().unwrap().set(key, value)
}

#[tauri::command]
async fn secure_get(key: String, state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    Ok(state.secure_storage.lock().unwrap().get(&key))
}

#[tauri::command]
async fn secure_remove(key: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.secure_storage.lock().unwrap().remove(&key)
}

fn main() {
    // Initialize secure storage
    let secure_storage = SecureStorage::load();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            secure_storage: Mutex::new(secure_storage),
        })
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
            // Secure storage commands
            secure_set,
            secure_get,
            secure_remove,
            
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
