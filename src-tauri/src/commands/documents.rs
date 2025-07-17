use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Window, Runtime, Emitter};
use std::time::SystemTime;
use uuid::Uuid;
use thiserror::Error;
use dirs;

use crate::error::Error;

/// Maximum number of versions to keep per document
const MAX_VERSIONS: usize = 10;
/// Auto-save interval in seconds
const AUTO_SAVE_INTERVAL: u64 = 30;

#[derive(Error, Debug)]
pub enum DocumentError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),
    
    #[error("Operation cancelled by user")]
    OperationCancelled,
    
    #[error("Invalid document format")]
    InvalidFormat,
    
    #[error("Document not found")]
    NotFound,
    
    #[error("Permission denied")]
    PermissionDenied,
    
    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<DocumentError> for Error {
    fn from(error: DocumentError) -> Self {
        match error {
            DocumentError::Io(e) => Error::Io(e.to_string()),
            DocumentError::Serde(e) => Error::Serde(e.to_string()),
            DocumentError::OperationCancelled => Error::OperationCancelled("Operation cancelled by user".to_string()),
            DocumentError::InvalidFormat => Error::UnsupportedFormat("Invalid document format".to_string()),
            DocumentError::NotFound => Error::NotFound("Document not found".to_string()),
            DocumentError::PermissionDenied => Error::Io("Permission denied".to_string()),
            DocumentError::Unknown(msg) => Error::Io(format!("Unknown error: {}", msg)),
        }
    }
}

/// Represents a document version
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct DocumentVersion {
    pub id: String,
    pub content: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub is_auto_save: bool,
    pub size: usize,
    pub timestamp: i64,
}

impl DocumentVersion {
    /// Create a new document version
    pub fn new(content: serde_json::Value, is_auto_save: bool) -> Self {
        let now = Utc::now();
        let content_str = content.to_string();
        
        Self {
            id: Uuid::new_v4().to_string(),
            content,
            created_at: now,
            is_auto_save,
            size: content_str.len(),
            timestamp: now.timestamp(),
        }
    }
}

/// Represents a document with version history
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub content: serde_json::Value,
    pub file_path: Option<String>,
    pub versions: Vec<DocumentVersion>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_dirty: bool,
    pub last_auto_save: Option<DateTime<Utc>>,
    pub last_save_time: Option<i64>,
}

impl Document {
    /// Create a new document with the provided content
    pub fn new(title: String, content: serde_json::Value) -> Self {
        let now = Utc::now();
        
        // Create the document with empty content by default
        let mut doc = Self {
            id: Uuid::new_v4().to_string(),
            title,
            content: json!({ "content": "" }), // Start with empty content
            file_path: None,
            versions: vec![],
            created_at: now,
            updated_at: now,
            is_dirty: false,
            last_auto_save: None,
            last_save_time: None,
        };
        
        // Always add an empty version first
        doc.versions.push(DocumentVersion::new(json!({ "content": "" }), false));
        
        // If content was provided and not empty, add it as a version
        if content != json!({ "content": "" }) {
            doc.add_version(content, false);
        }
        
        doc
    }
    
    /// Add a new version of the document
    pub fn add_version(&mut self, content: serde_json::Value, is_auto_save: bool) -> &DocumentVersion {
        let now = Utc::now();
        
        // First, check if we already have a version with the same content
        // Skip the empty version at index 0 when checking for duplicates
        let existing_index = self.versions.iter().skip(1).position(|v| v.content == content)
            .map(|i| i + 1); // Adjust index since we skipped the first element
        
        if let Some(index) = existing_index {
            // Update the existing version's timestamp
            self.versions[index].timestamp = now.timestamp();
            
            // Update document metadata if this is not an auto-save
            if !is_auto_save {
                self.content = content;
                self.updated_at = now;
                self.last_save_time = Some(now.timestamp());
                self.is_dirty = false;
            } else {
                self.last_auto_save = Some(now);
            }
            
            // Return a reference to the existing version
            // SAFETY: We know the index is valid because we just got it from position()
            unsafe { self.versions.get_unchecked(index) }
        } else {
            // Create a new version
            let version = DocumentVersion::new(content.clone(), is_auto_save);
            
            // Add the new version to the end of the vector
            self.versions.push(version);
            
            // If we have more than MAX_VERSIONS + 1 (including the empty version),
            // remove the oldest non-empty version (which is at index 1)
            while self.versions.len() > MAX_VERSIONS + 1 && self.versions.len() > 1 {
                self.versions.remove(1);
            }
            
            // Update document metadata
            self.content = content;
            self.updated_at = now;
            
            // Update save metadata
            if is_auto_save {
                self.last_auto_save = Some(now);
            } else {
                self.last_save_time = Some(now.timestamp());
                self.is_dirty = false;
            }
            
            // Return the most recent version (the one we just added)
            // SAFETY: We just pushed a new version, so the vector is not empty
            unsafe { self.versions.get_unchecked(self.versions.len() - 1) }
        }
    }
    
    /// Get a specific version by ID
    pub fn get_version(&self, version_id: &str) -> Option<&DocumentVersion> {
        self.versions.iter().find(|v| v.id == version_id)
    }
}

/// Get the documents directory, creating it if it doesn't exist
fn get_documents_dir() -> PathBuf {
    dirs::document_dir()
        .map(|dir| dir.join("Trosyn"))
        .unwrap_or_else(|| PathBuf::from("./documents"))
}

/// Ensure the documents directory exists
fn ensure_documents_dir() -> std::io::Result<()> {
    let dir = get_documents_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(())
}

/// Get the recovery directory path
fn get_recovery_dir() -> PathBuf {
    get_documents_dir().join(".recovery")
}

/// Ensure the recovery directory exists
fn ensure_recovery_dir() -> std::io::Result<()> {
    let dir = get_recovery_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(())
}

/// Save a recovery file for crash recovery
fn save_recovery_file(doc: &Document) -> std::io::Result<()> {
    ensure_recovery_dir()?;
    let recovery_path = get_recovery_dir().join(format!("recovery_{}.json", doc.id));
    let recovery_data = serde_json::to_vec(doc)?;
    std::fs::write(recovery_path, recovery_data)
}

/// Clean up recovery files for a document
fn cleanup_recovery_file(doc_id: &str) -> std::io::Result<()> {
    let recovery_path = get_recovery_dir().join(format!("recovery_{}.json", doc_id));
    if recovery_path.exists() {
        std::fs::remove_file(recovery_path)?;
    }
    Ok(())
}

/// Initialize the recovery system
pub fn initialize_recovery() -> std::io::Result<()> {
    // Ensure recovery directory exists
    ensure_recovery_dir()?;
    
    // Clean up old recovery files (older than 7 days)
    let recovery_files = get_recovery_files()?;
    let now = SystemTime::now();
    
    for path in recovery_files {
        if let Ok(metadata) = std::fs::metadata(&path) {
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = now.duration_since(modified) {
                    // Delete recovery files older than 7 days
                    if duration.as_secs() > 7 * 24 * 60 * 60 {
                        let _ = std::fs::remove_file(&path);
                    }
                }
            }
        }
    }
    
    Ok(())
}

/// Check for documents that need auto-saving
pub async fn check_auto_save<R: Runtime>(app: &AppHandle<R>) -> Result<(), Error> {
    // In a real implementation, you would track open documents that need saving
    // For now, we'll just check for recovery files that need to be processed
    let recovery_files = get_recovery_files()?;
    
    if !recovery_files.is_empty() {
        // Notify the frontend about recovery files
        if let Err(e) = app.emit("recovery_files_available", recovery_files.len()) {
            eprintln!("Failed to emit recovery_files_available event: {}", e);
        }
    }
    
    Ok(())
}

/// Get a list of recovery files
fn get_recovery_files() -> std::io::Result<Vec<PathBuf>> {
    let dir = get_recovery_dir();
    if !dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut files = Vec::new();
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
            files.push(path);
        }
    }
    
    Ok(files)
}

/// Save a document to disk
#[tauri::command]
pub async fn save_document(
    window: Window,
    content: String,
    file_path: Option<String>,
) -> Result<Document, Error> {
    // Parse the document content as JSON
    let content_value: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| DocumentError::Serde(e))?;
    
    // Create or update the document
    let mut doc = if let Some(ref path) = file_path {
        // Try to load existing document
        let mut doc = match load_document(window.clone(), Some(path.clone())).await {
            Ok(doc) => doc,
            Err(_) => {
                // If document doesn't exist, create a new one
                let title = Path::new(path)
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled")
                    .to_string();
                Document::new(title, content_value.clone())
            }
        };
        
        // Update content and add version if changed
        if doc.content != content_value {
            doc.content = content_value;
            doc.add_version(doc.content.clone(), false);
        }
        doc.file_path = Some(path.clone());
        doc
    } else {
        // Create new document
        let title = "Untitled".to_string();
        let mut doc = Document::new(title, content_value);
        doc.add_version(doc.content.clone(), false);
        doc
    };
    
    // Get the save path if not provided
    let path = match doc.file_path.as_ref() {
        Some(p) => PathBuf::from(p),
        None => {
            // Prompt user to select save location
            rfd::FileDialog::new()
                .set_title("Save Document")
                .add_filter("JSON files", &["json"])
                .set_file_name(&format!("{}.json", doc.title))
                .save_file()
                .ok_or_else(|| Error::from(DocumentError::OperationCancelled))
        }?,
    };
    
    // Ensure the directory exists
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| DocumentError::Io(e))?;
        }
    }
    
    // Update document metadata
    let now = Utc::now();
    doc.updated_at = now;
    doc.is_dirty = false;
    doc.file_path = Some(path.to_string_lossy().to_string());
    doc.last_save_time = Some(now.timestamp());
    
    // Save the document
    let doc_json = serde_json::to_string_pretty(&doc)
        .map_err(|e| DocumentError::Serde(e))?;
        
    std::fs::write(&path, doc_json)
        .map_err(|e| DocumentError::Io(e))?;
    
    // Clean up any recovery files for this document
    cleanup_recovery_file(&doc.id).ok();
    
    // Emit event that document was saved
    if let Err(e) = window.emit("document_saved", &doc) {
        eprintln!("Failed to emit document_saved event: {}", e);
    }
    
    Ok(doc)
}

/// Auto-save the current document
#[tauri::command]
pub async fn auto_save_document(
    window: Window,
    content: String,
) -> Result<Document, Error> {
    // Parse the document content as JSON
    let content_value: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| DocumentError::Serde(e))?;
    
    // Create a new document with the content
    let mut doc = Document::new("Auto-saved Document".to_string(), content_value);
    
    // Only auto-save if there's a file path
    if doc.file_path.is_none() {
        return Ok(doc);
    }
    
    let now = Utc::now();
    
    // Check if enough time has passed since the last auto-save
    if let Some(last_auto_save) = doc.last_auto_save {
        if (now - last_auto_save).num_seconds() < AUTO_SAVE_INTERVAL as i64 {
            return Ok(doc);
        }
    }
    
    // Add an auto-save version
    doc.add_version(doc.content.clone(), true);
    doc.last_auto_save = Some(now);
    doc.is_dirty = true;
    
    // Save recovery file
    if let Err(e) = save_recovery_file(&doc) {
        eprintln!("Failed to save recovery file: {}", e);
    }
    
    // Don't update last_save_time for auto-saves
    // This ensures manual saves are still needed to update the main file
    
    // Emit auto-save event
    if let Err(e) = window.emit("document_auto_saved", &doc) {
        eprintln!("Failed to emit document_auto_saved event: {}", e);
    }
    
    Ok(doc)
}

/// Load a document from disk with version history
#[tauri::command]
pub async fn load_document(
    window: Window,
    file_path: Option<String>,
) -> Result<Document, Error> {
    // If no file path is provided, show file dialog
    let path = if let Some(p) = file_path {
        PathBuf::from(p)
    } else {
        // Show file dialog to select the backup file
        rfd::FileDialog::new()
            .set_title("Select Backup File")
            .add_filter("JSON files", &["json"])
            .pick_file()
            .ok_or_else(|| Error::from(DocumentError::OperationCancelled))?
    };
    
    // Check if file exists
    if !path.exists() {
        return Err(DocumentError::NotFound.into());
    }
    
    // Read the file
    let content = std::fs::read_to_string(&path)
        .map_err(|e| DocumentError::Io(e))?;
        
    // Parse the document
    let mut doc: Document = serde_json::from_str(&content)
        .map_err(|e| DocumentError::Serde(e))?;
    
    // Update the file path and timestamps
    let now = Utc::now();
    doc.file_path = Some(path.to_string_lossy().to_string());
    doc.updated_at = now;
    cleanup_recovery_file(&doc.id).ok();
    
    // Emit document loaded event
    if let Err(e) = window.emit("document_loaded", &doc) {
        eprintln!("Failed to emit document_loaded event: {}", e);
    }
    
    Ok(doc)
}

/// Get a specific version of a document
#[tauri::command]
pub async fn get_document_version(
    _doc_id: String,
    _version_id: String,
) -> Result<DocumentVersion, Error> {
    // In a real implementation, you would load the document and find the version
    // For now, we'll return an error indicating the version wasn't found
    Err(DocumentError::NotFound.into())
}

/// Restore a document to a previous version
#[tauri::command]
pub async fn restore_document_version(
    window: Window,
    _doc_id: String,
    _version_id: String,
) -> Result<Document, Error> {
    // In a real implementation, you would:
    // 1. Load the document
    // 2. Find the specified version
    // 3. Create a new version with the old content
    // 4. Save the document
    // 5. Return the updated document
    
    // For now, we'll return an error
    Err(DocumentError::NotFound.into())
}

/// List all available recovery files
#[tauri::command]
pub async fn list_recovery_files() -> Result<Vec<Document>, Error> {
    let recovery_files = get_recovery_files()?;
    let mut docs = Vec::new();
    
    for path in recovery_files {
        match std::fs::read_to_string(&path) {
            Ok(content) => {
                if let Ok(doc) = serde_json::from_str::<Document>(&content) {
                    docs.push(doc);
                }
            }
            Err(e) => eprintln!("Failed to read recovery file {}: {}", path.display(), e),
        }
    }
    
    Ok(docs)
}

/// Recover a document from a recovery file
#[tauri::command]
pub async fn recover_document(
    window: Window,
    doc_id: String,
) -> Result<Document, Error> {
    let recovery_path = get_recovery_dir().join(format!("recovery_{}.json", doc_id));
    
    if !recovery_path.exists() {
        return Err(DocumentError::NotFound.into());
    }
    
    // Read and parse the document
    let content = std::fs::read_to_string(&recovery_path)?;
    let mut doc: Document = serde_json::from_str(&content)?;
    
    // Mark as recovered
    doc.is_dirty = true;
    
    // Emit document recovered event
    if let Err(e) = window.emit("document_recovered", &doc) {
        eprintln!("Failed to emit document_recovered event: {}", e);
    }
    
    Ok(doc)
}



/// Load document with file dialog
#[tauri::command]
pub async fn load_document_with_dialog(window: Window) -> Result<Document, Error> {
    // Get the documents directory and create Trosyn subdirectory if it doesn't exist
    let documents_dir = get_documents_dir();
    
    // Create the directory if it doesn't exist
    if !documents_dir.exists() {
        std::fs::create_dir_all(&documents_dir)?;
    }
    
    // Show file dialog
    let path = rfd::FileDialog::new()
        .add_filter("JSON files", &["json"])
        .set_title("Open Document")
        .set_directory(documents_dir)
        .pick_file()
        .ok_or_else(|| Error::from(DocumentError::OperationCancelled))?;
    
    // Load the selected document
    load_document(window, Some(path.to_string_lossy().to_string())).await
}

// List documents (placeholder for now - could be enhanced with a document database)
#[tauri::command]
pub async fn list_documents() -> Result<Vec<Document>, Error> {
    // For now, return empty list. This could be enhanced to:
    // 1. List files in a documents directory
    // 2. Read from a document database
    // 3. Read from app data directory
    Ok(vec![])
}

// Get document by ID (placeholder for now)
#[tauri::command]
pub async fn get_document(_id: String) -> Result<Option<Document>, Error> {
    // For now, return None. This could be enhanced to:
    // 1. Look up document in database
    // 2. Load from file system based on ID
    Ok(None)
}

/// Delete a document from disk
/// 
/// # Arguments
/// * `window` - The Tauri window
/// * `doc_id` - The ID of the document to delete
/// * `file_path` - Optional path to the document file
#[tauri::command]
pub async fn delete_document(
    window: Window,
    doc_id: String,
    file_path: Option<String>,
) -> Result<(), Error> {
    // If file path is provided, try to delete the file
    if let Some(path) = file_path {
        let path = PathBuf::from(&path);
        
        // Check if file exists
        if !path.exists() {
            return Err(DocumentError::NotFound.into());
        }
        
        // Try to remove the file
        if let Err(e) = std::fs::remove_file(&path) {
            return Err(DocumentError::Io(e).into());
        }
        
        // Clean up any recovery files
        cleanup_recovery_file(&doc_id).ok();
        
        // Emit event that document was deleted
        if let Err(e) = window.emit("document_deleted", &doc_id) {
            eprintln!("Failed to emit document_deleted event: {}", e);
        }
        
        return Ok(());
    }
    
    // If no file path is provided, just clean up recovery files
    cleanup_recovery_file(&doc_id).ok();
    
    // Emit event that document was deleted
    if let Err(e) = window.emit("document_deleted", &doc_id) {
        eprintln!("Failed to emit document_deleted event: {}", e);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn export_document(
    _window: Window,
    content: String, // Expects JSON string from Editor.js
    format: String,
    file_path: Option<String>,
) -> Result<(), Error> {
    let format_lower = format.to_lowercase();
    
    // Determine file extension based on format
    let extension = match format_lower.as_str() {
        "html" => "html",
        "md" => "md",
        "txt" => "txt",
        _ => return Err(Error::UnsupportedFormat(format)),
    };
    
    let final_path = match file_path {
        Some(path) => path,
        None => {
            rfd::FileDialog::new()
                .add_filter(&format!("{} files", format.to_uppercase()), &[extension])
                .set_title("Export Document")
                .save_file()
                .ok_or_else(|| Error::from(DocumentError::OperationCancelled))
                .map(|p| p.to_string_lossy().to_string())?
        }
    };

    // Convert content based on format
    let exported_content = match format_lower.as_str() {
        "html" => {
            // Parse Editor.js JSON and convert to HTML
            match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(json) => {
                    if let Some(blocks) = json.get("blocks").and_then(|v| v.as_array()) {
                        let mut html_content = String::from(
                            r#"<!DOCTYPE html>
                            <html>
                            <head>
                                <title>Document</title>
                                <meta charset="utf-8">
                            </head>
                            <body>"#
                        );
                        
                        for block in blocks {
                            if let (Some(block_type), Some(data)) = (block.get("type").and_then(|v| v.as_str()), block.get("data")) {
                                match block_type {
                                    "header" => {
                                        if let (Some(text), Some(level)) = (data.get("text").and_then(|v| v.as_str()), data.get("level").and_then(|v| v.as_u64())) {
                                            html_content.push_str("    <h");
                                            html_content.push_str(&level.to_string());
                                            html_content.push_str(">");
                                            html_content.push_str(text);
                                            html_content.push_str("</h");
                                            html_content.push_str(&level.to_string());
                                            html_content.push_str(">\n");
                                        }
                                    }
                                    "paragraph" => {
                                        if let Some(text) = data.get("text").and_then(|v| v.as_str()) {
                                            html_content.push_str("    <p>");
                                            html_content.push_str(text);
                                            html_content.push_str("</p>\n");
                                        }
                                    }
                                    "list" => {
                                        if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
                                            html_content.push_str("    <ul>\n");
                                            for item in items {
                                                if let Some(text) = item.as_str() {
                                                    html_content.push_str("        <li>");
                                                    html_content.push_str(text);
                                                    html_content.push_str("</li>\n");
                                                }
                                            }
                                            html_content.push_str("    </ul>\n");
                                        }
                                    }
                                    _ => {
                                        // For unknown block types, just output as div
                                        html_content.push_str("    <div><!-- ");
                                        html_content.push_str(block_type);
                                        html_content.push_str(" block --></div>\n");
                                    }
                                }
                            }
                        }
                        
                        html_content.push_str(r#"
                            </body>
                            </html>
                        "#);
                        html_content
                    } else {
                        format!("<html><body><pre>{}</pre></body></html>", content)
                    }
                }
                Err(_) => format!("<html><body><pre>{}</pre></body></html>", content)
            }
        }
        "md" => {
            // Parse Editor.js JSON and convert to Markdown
            use std::fmt::Write;
            match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(json) => {
                    if let Some(blocks) = json.get("blocks").and_then(|v| v.as_array()) {
                        let mut md_content = String::with_capacity(1024);
                        for block in blocks {
                            if let (Some(block_type), Some(data)) = (block.get("type").and_then(|v| v.as_str()), block.get("data")) {
                                match block_type {
                                    "header" => {
                                        if let (Some(text), Some(level)) = (data.get("text").and_then(|v| v.as_str()), data.get("level").and_then(|v| v.as_u64())) {
                                            let _ = writeln!(md_content, "{} {}", "#".repeat(level as usize), text);
                                            let _ = writeln!(md_content);
                                        }
                                    }
                                    "paragraph" => {
                                        if let Some(text) = data.get("text").and_then(|v| v.as_str()) {
                                            let _ = writeln!(md_content, "{}", text);
                                            let _ = writeln!(md_content);
                                        }
                                    }
                                    "list" => {
                                        if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
                                            for item in items {
                                                if let Some(text) = item.as_str() {
                                                    let _ = writeln!(md_content, "- {}", text);
                                                }
                                            }
                                            let _ = writeln!(md_content);
                                        }
                                    }
                                    _ => {
                                        let _ = writeln!(md_content, "<!-- {} block -->", block_type);
                                        let _ = writeln!(md_content);
                                    }
                                }
                            }
                        }
                        md_content
                    } else {
                        content
                    }
                }
                Err(_) => content
            }
        }
        "txt" => {
            // Parse Editor.js JSON and convert to plain text
            use std::fmt::Write;
            match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(json) => {
                    if let Some(blocks) = json.get("blocks").and_then(|v| v.as_array()) {
                        let mut txt_content = String::new();
                        for block in blocks {
                            if let (Some(block_type), Some(data)) = (block.get("type").and_then(|v| v.as_str()), block.get("data")) {
                                match block_type {
                                    "header" | "paragraph" => {
                                        if let Some(text) = data.get("text").and_then(|v| v.as_str()) {
                                            let _ = writeln!(txt_content, "{}", text);
                                            let _ = writeln!(txt_content);
                                        }
                                    }
                                    "list" => {
                                        if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
                                            for item in items {
                                                if let Some(text) = item.as_str() {
                                                    let _ = writeln!(txt_content, "- {}", text);
                                                }
                                            }
                                            let _ = writeln!(txt_content);
                                        }
                                    }
                                    _ => {}
                                }
                            }
                        }
                        txt_content
                    } else {
                        content
                    }
                }
                Err(_) => content
            }
        }
        _ => return Err(Error::UnsupportedFormat(format)),
    };

    // Write the exported content to file
    tokio::fs::write(final_path, exported_content).await?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use std::time::Duration;

    // Test Data Builder
    struct DocumentBuilder {
        title: String,
        content: serde_json::Value,
        versions: Vec<serde_json::Value>,
    }

    impl DocumentBuilder {
        fn new(title: &str) -> Self {
            Self {
                title: title.to_string(),
                content: json!({ "content": "" }),
                versions: vec![],
            }
        }

        fn with_content(mut self, content: &str) -> Self {
            self.content = json!({ "content": content });
            self
        }

        fn with_versions(mut self, versions: Vec<serde_json::Value>) -> Self {
            self.versions = versions;
            self
        }

        fn build(self) -> Document {
            let mut doc = Document::new(self.title, self.content.clone());
            
            for version_content in self.versions {
                doc.add_version(version_content, false);
            }

            doc
        }
    }

    // Helper functions for common test scenarios
    fn create_simple_document() -> Document {
        DocumentBuilder::new("Test Document").build()
    }
    
    fn create_document_with_content() -> Document {
        DocumentBuilder::new("Document with Content")
            .with_content("Initial content")
            .build()
    }
    
    fn create_document_with_versions() -> Document {
        // Create a document with empty content
        let mut doc = Document::new(
            "Document with Versions".to_string(), 
            json!({ "content": "" })
        );
        
        // Clear any existing versions except the empty one
        doc.versions.retain(|v| v.content == json!({ "content": "" }));
        
        // Add exactly 2 versions (v1 and v2)
        doc.add_version(json!({ "content": "v1" }), false);
        doc.add_version(json!({ "content": "v2" }), false);
        
        // Should have exactly 3 versions in total: ["", "v1", "v2"]
        assert_eq!(doc.versions.len(), 3, "Document should have 3 versions (1 empty + 2 content)");
        assert_eq!(doc.versions[0].content, json!({ "content": "" }), "First version should be empty");
        
        doc
    }

    mod document_creation {
        use super::*;

        #[test]
        fn creates_document_with_title() {
            let doc = create_simple_document();
            assert_eq!(doc.title, "Test Document");
        }

        #[test]
        fn creates_document_with_unique_id() {
            let doc1 = create_simple_document();
            let doc2 = create_simple_document();
            assert_ne!(doc1.id, doc2.id);
        }

        #[test]
        fn creates_document_with_initial_version() {
            let doc = create_simple_document();
            assert_eq!(doc.versions.len(), 1);
        }

        #[test]
        fn creates_document_with_timestamps() {
            let doc = create_simple_document();
            assert!(doc.created_at <= Utc::now());
            assert!(doc.updated_at <= Utc::now());
        }
    }

    mod document_content {
        use super::*;

        #[test]
        fn updates_content_successfully() {
            let mut doc = create_simple_document();
            let new_content = json!({ "content": "New content" });
            doc.add_version(new_content.clone(), false);
            
            assert_eq!(doc.content, new_content);
        }

        #[test]
        fn increments_version_on_update() {
            let mut doc = create_simple_document();
            let original_version = 1; // First version is always 1
            
            doc.add_version(json!({ "content": "Updated content" }), false);
            // Version is tracked by the order in the versions vector
            assert_eq!(doc.versions.len() as u32, original_version + 1);
        }

        #[test]
        fn updates_timestamp_on_content_change() {
            let mut doc = create_simple_document();
            let original_time = doc.updated_at;
            
            // Small delay to ensure timestamp difference
            std::thread::sleep(Duration::from_millis(1));
            doc.add_version(json!({ "content": "Updated content" }), false);
            
            assert!(doc.updated_at > original_time);
        }

        #[test]
        fn handles_large_content() {
            let mut doc = create_simple_document();
            // Test with content just under the limit
            let large_content = "x".repeat(1_000_000);
            
            doc.add_version(json!({ "content": large_content }), false);
            assert_eq!(doc.content, json!({ "content": large_content }));
        }
    }

    mod document_versioning {
        use super::*;

        #[test]
        fn tracks_version_history() {
            let doc = create_document_with_versions();
            assert_eq!(doc.versions.len(), 3); // 3 versions added in create_document_with_versions()
        }

        #[test]
        fn retrieves_specific_version() {
            let doc = create_document_with_versions();
            
            // Get the ID of the second version (index 1)
            let version_id = &doc.versions[1].id;
            let version = doc.get_version(version_id);
            
            assert!(version.is_some());
            assert_eq!(version.unwrap().content, json!({ "content": "v1" }));
        }

        #[test]
        fn returns_none_for_nonexistent_version() {
            let doc = create_document_with_versions();
            let version = doc.get_version("nonexistent-id");
            assert!(version.is_none());
        }

        #[test]
        fn maintains_version_order() {
            let doc = create_document_with_versions();
            
            // Verify versions are in the correct order by checking their positions
            for (i, version) in doc.versions.iter().enumerate() {
                // The first version should have the initial content
                if i == 0 {
                    assert_eq!(version.content, json!({ "content": "" }));
                } else {
                    assert_eq!(version.content, json!({ "content": format!("v{}", i) }));
                }
            }
        }
    }

    mod document_serialization {
        use super::*;

        #[test]
        fn serializes_to_json() {
            let doc = create_document_with_content();
            let json = serde_json::to_string(&doc);
            assert!(json.is_ok());
        }

        #[test]
        fn deserializes_from_json() {
            let doc = create_document_with_content();
            let json = serde_json::to_string(&doc).unwrap();
            let deserialized: Document = serde_json::from_str(&json).unwrap();
            
            assert_eq!(doc.id, deserialized.id);
            assert_eq!(doc.title, deserialized.title);
            assert_eq!(doc.content, deserialized.content);
        }

        #[test]
        fn roundtrip_serialization_preserves_data() {
            let original = create_document_with_versions();
            let json = serde_json::to_string(&original).unwrap();
            let deserialized: Document = serde_json::from_str(&json).unwrap();
            
            assert_eq!(original, deserialized);
        }
    }

    mod edge_cases {
        use super::*;

        #[test]
        fn handles_empty_title() {
            let doc = Document::new("".to_string(), json!({ "content": "" }));
            assert!(doc.title.is_empty());
        }

        #[test]
        fn handles_unicode_title() {
            let title = "文档标题".to_string();
            let doc = Document::new(title.clone(), json!({ "content": "" }));
            assert_eq!(doc.title, title);
        }

        #[test]
        fn handles_empty_content_update() {
            let mut doc = create_simple_document();
            doc.add_version(json!({ "content": "" }), false);
            
            assert_eq!(doc.content, json!({ "content": "" }));
        }

        #[test]
        fn handles_multiple_rapid_updates() {
            let mut doc = create_simple_document();
            
            for i in 0..10 {
                doc.add_version(json!({ "content": format!("Content {}", i) }), false);
            }
            
            assert_eq!(doc.versions.len(), 11); // Initial + 10 updates
        }
    }

    // Integration-style tests (but still unit tests)
    mod integration_scenarios {
        use super::*;

        #[test]
        fn complete_document_lifecycle() {
            // Create document
            let mut doc = Document::new("My Document".to_string(), json!({ "content": "" }));
            assert_eq!(doc.versions.len(), 1);
            
            // Add initial content
            let initial_content = json!({ "content": "Initial content" });
            doc.add_version(initial_content.clone(), false);
            assert_eq!(doc.versions.len(), 2);
            
            // Make several updates
            let updated_content = json!({ "content": "Updated content" });
            let final_content = json!({ "content": "Final content" });
            doc.add_version(updated_content, false);
            doc.add_version(final_content.clone(), false);
            
            // Verify version history
            assert_eq!(doc.versions.len(), 4);
            assert_eq!(doc.versions[0].content, json!({ "content": "" }));
            assert_eq!(doc.versions[1].content, initial_content);
            assert_eq!(doc.versions[3].content, final_content);
            
            // Verify serialization works
            let json = serde_json::to_string(&doc).unwrap();
            let restored: Document = serde_json::from_str(&json).unwrap();
            assert_eq!(doc, restored);
        }

        #[test]
        fn batch_document_operations() {
            let mut documents = Vec::new();
            
            // Create multiple documents
            for i in 0..5 {
                let title = format!("Document {}", i);
                let content = json!({ "content": format!("Content for document {}", i) });
                let doc = Document::new(title, content);
                documents.push(doc);
            }
            
            // Verify all documents are unique and properly created
            assert_eq!(documents.len(), 5);
            
            let ids: std::collections::HashSet<_> = documents.iter().map(|d| &d.id).collect();
            assert_eq!(ids.len(), 5); // All IDs should be unique
            
            // Verify content is correct
            for (i, doc) in documents.iter().enumerate() {
                assert_eq!(doc.title, format!("Document {}", i));
                assert_eq!(doc.content, json!({ "content": format!("Content for document {}", i) }));
            }
        }
    }

    // Performance tests (simple ones)
    mod performance {
        use super::*;

        #[test]
        fn handles_many_versions_efficiently() {
            let mut doc = Document::new("Performance Test".to_string(), json!({ "content": "" }));
            
            let start = std::time::Instant::now();
            
            // Add more versions than MAX_VERSIONS to test version culling
            for i in 0..100 {
                let content = json!({ "content": format!("Content {}", i) });
                doc.add_version(content, false);
            }
            
            let duration = start.elapsed();
            
            // Should complete in a reasonable time (e.g., less than 10ms)
            assert!(duration.as_millis() < 10, "Adding versions took too long: {:?}", duration);
            
            // Should have exactly MAX_VERSIONS + 1 versions (1 empty + MAX_VERSIONS content versions)
            assert_eq!(doc.versions.len(), MAX_VERSIONS + 1, 
                     "Should have exactly {} versions (1 empty + {} content versions)", 
                     MAX_VERSIONS + 1, MAX_VERSIONS);
            
            // The first version should always be empty
            assert_eq!(doc.versions[0].content, json!({ "content": "" }), 
                      "First version should be empty");
            
            // The last version should be the most recent one we added (Content 99)
            assert_eq!(doc.versions.last().unwrap().content, 
                      json!({ "content": "Content 99" }), 
                      "Last version should be the most recent one");
            
            // The second version should be the 90th content we added (since we keep the 10 most recent)
            assert_eq!(doc.versions[1].content, 
                      json!({ "content": "Content 90" }), 
                      "Oldest kept version should be Content 90");
        }

        #[test]
        fn serialization_performance() {
            let versions: Vec<serde_json::Value> = (0..50)
                .map(|i| json!({ "content": format!("Version {}", i) }))
                .collect();
                
            let doc = DocumentBuilder::new("Large Document")
                .with_versions(versions)
                .build();
            
            let start = std::time::Instant::now();
            let json = serde_json::to_string(&doc).unwrap();
            let duration = start.elapsed();
            
            assert!(duration.as_millis() < 50); // Should serialize quickly
            assert!(!json.is_empty());
        }
    }
}
