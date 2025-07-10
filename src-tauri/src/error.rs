use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error, Serialize)]
pub enum Error {
    #[error("I/O Error: {0}")]
    Io(String),
    #[error("Tauri Error: {0}")]
    Tauri(String),
    #[error("Serde Error: {0}")]
    Serde(String),
    #[error("Database Error: {0}")]
    Database(String),
    #[error("File Watcher Error: {0}")]
    FileWatcher(String),
    #[error("Not Found: {0}")]
    NotFound(String),
    #[error("Invalid Path: {0}")]
    InvalidPath(String),
    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),
    #[error("Operation cancelled: {0}")]
    OperationCancelled(String),
}

impl From<std::io::Error> for Error {
    fn from(err: std::io::Error) -> Self {
        Error::Io(err.to_string())
    }
}

impl From<tauri::Error> for Error {
    fn from(err: tauri::Error) -> Self {
        Error::Tauri(err.to_string())
    }
}

impl From<serde_json::Error> for Error {
    fn from(err: serde_json::Error) -> Self {
        Error::Serde(err.to_string())
    }
}
