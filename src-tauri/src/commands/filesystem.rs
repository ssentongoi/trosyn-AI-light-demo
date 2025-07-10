use crate::error::Result;
use std::path::Path;

#[tauri::command]
pub async fn check_file_exists(file_path: String) -> Result<bool> {
    Ok(Path::new(&file_path).exists())
}
