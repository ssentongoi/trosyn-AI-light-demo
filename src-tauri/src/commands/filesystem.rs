use serde::Deserialize;
use std::path::Path;
use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FilePath;
use tokio::fs;

// Use standard Result with String error for simplicity
type CommandResult<T> = std::result::Result<T, String>;

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
pub async fn check_file_exists(file_path: String) -> CommandResult<bool> {
    Ok(Path::new(&file_path).exists())
}

/// Opens a file dialog and returns a list of selected file paths.
/// 
/// # Arguments
/// * `app` - The Tauri application handle
/// * `options` - Options for the file dialog including filters and multiple selection
/// 
/// # Returns
/// Returns a `Result` containing:
/// - `Ok(Vec<String>)`: A vector of selected file paths (can be empty if user cancels)
/// - `Err(String)`: An error message if the dialog fails to open
#[tauri::command]
pub async fn open_dialog<R: Runtime>(
    app: AppHandle<R>,
    options: OpenDialogOptions,
) -> CommandResult<Vec<String>> {
    let mut dialog = app.dialog().file();

    // Apply file filters if provided
    if let Some(filters) = options.filters {
        for filter in filters {
            let extensions: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
            dialog = dialog.add_filter(filter.name, &extensions);
        }
    }

    // Handle both single and multiple file selection
    if options.multiple.unwrap_or(false) {
        // For multiple files, we get Option<Vec<FilePath>>
        match dialog.blocking_pick_files() {
            Some(paths) => {
                let paths = paths.into_iter()
                    .map(|p| match p {
                        FilePath::Path(path) => path.to_string_lossy().into_owned(),
                        FilePath::Url(url) => url.to_string(),
                    })
                    .collect();
                Ok(paths)
            },
            None => Ok(Vec::new())
        }
    } else {
        // For single file, wrap in a Vec to match return type
        match dialog.blocking_pick_file() {
            Some(path) => {
                let path_str = match path {
                    FilePath::Path(p) => p.to_string_lossy().into_owned(),
                    FilePath::Url(url) => url.to_string(),
                };
                Ok(vec![path_str])
            },
            None => Ok(Vec::new())
        }
    }
}

#[tauri::command]
pub async fn read_file(path: String) -> CommandResult<String> {
    let content = fs::read_to_string(&path).await
        .map_err(|e| format!("Failed to read file {}: {}", path, e))?;
    Ok(content)
}
