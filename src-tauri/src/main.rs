// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::documents::save_document,
            commands::documents::load_document,
            commands::documents::load_document_with_dialog,
            commands::documents::export_document,
            commands::documents::list_documents,
            commands::documents::get_document,
            commands::documents::delete_document,
            commands::filesystem::check_file_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
