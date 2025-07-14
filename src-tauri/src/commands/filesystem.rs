use crate::error::Result;
use serde::Deserialize;
use std::path::{Path, PathBuf};
use tauri::api::dialog::FileDialogBuilder;
use tokio::fs;

#[derive(Debug, Deserialize)]
pub struct OpenDialogOptions {
    pub multiple: Option<bool>,
    pub filters: Option<Vec<FileFilter>>,
}

#[derive(Debug, Deserialize)]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[tauri::command]
pub async fn check_file_exists(file_path: String) -> Result<bool> {
    Ok(Path::new(&file_path).exists())
}

#[tauri::command]
pub async fn open_dialog(options: OpenDialogOptions) -> Result<Option<Vec<String>>> {
    let mut dialog = FileDialogBuilder::new();
    
    if let Some(filters) = options.filters {
        for filter in filters {
            dialog = dialog.add_filter(filter.name, &filter.extensions);
        }
    }

    let result = if options.multiple.unwrap_or(false) {
        dialog.pick_files().await
    } else {
        dialog.pick_file().await.map(|f| f.map(|p| vec![p]))
    };

    match result {
        Some(paths) => {
            let paths: Vec<String> = paths
                .into_iter()
                .map(|p| p.to_string_lossy().into_owned())
                .collect();
            Ok(Some(paths))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String> {
    let content = fs::read_to_string(path).await?;
    Ok(content)
}
