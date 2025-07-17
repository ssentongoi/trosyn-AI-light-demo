
use crate::commands::filesystem::{check_file_exists, open_dialog, read_file};

mod commands;
mod error;

pub use error::Result;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      check_file_exists,
      open_dialog,
      read_file,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
