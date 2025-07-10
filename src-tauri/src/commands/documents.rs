use crate::error::{Error, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{Emitter, Window};
use uuid::Uuid;
use tauri_plugin_dialog::DialogExt;
use tokio::sync::oneshot;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub content: String, // Assuming Editor.js data as JSON string
    pub created_at: String,
    pub updated_at: String,
    pub file_path: Option<String>,
}

fn get_document_title(file_path: &Option<String>) -> String {
    file_path
        .as_ref()
        .and_then(|p| Path::new(p).file_stem())
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "Untitled".to_string())
}

// Save document with optional file dialog
#[tauri::command]
pub async fn save_document(
    window: Window,
    content: String,
    file_path: Option<String>,
) -> Result<Document> {
    let now = Utc::now().to_rfc3339();
    
    let final_path = match file_path {
        Some(path) => path,
        None => {
            let (tx, rx) = tokio::sync::oneshot::channel();
            window.dialog()
                .file()
                .add_filter("JSON", &["json"])
                .set_title("Save Document")
                .save_file(move |path| {
                    let _ = tx.send(path);
                });

            match rx.await {
                Ok(Some(path)) => path.to_string(),
                Ok(None) => return Err(Error::OperationCancelled("Save operation cancelled by user.".to_string())),
                Err(_) => return Err(Error::Tauri("Failed to get save file path".to_string())),
            }
        }
    };

    let doc = Document {
        id: Uuid::new_v4().to_string(),
        title: get_document_title(&Some(final_path.clone())),
        content: content.clone(),
        created_at: now.clone(),
        updated_at: now,
        file_path: Some(final_path.clone()),
    };

    // Write file to disk
    tokio::fs::write(&final_path, content).await?;
    
    // Emit event to frontend
    window.emit("document_saved", doc.clone())?;

    Ok(doc)
}

// Load document with file dialog
#[tauri::command]
pub async fn load_document_with_dialog(window: Window) -> Result<Document> {
    let (tx, rx) = oneshot::channel();
    
    window.dialog()
        .file()
        .add_filter("JSON files", &["json"])
        .add_filter("All files", &["*"])
        .set_title("Load Document")
        .pick_file(move |result| {
            let _ = tx.send(result);
        });
    
    match rx.await {
        Ok(Some(path)) => {
            let path_str = path.to_string();
            load_document(path_str).await
        }
        Ok(None) | Err(_) => Err(Error::InvalidPath("No file selected ".to_string())),
    }
}

// List documents (placeholder for now - could be enhanced with a document database)
#[tauri::command]
pub async fn list_documents() -> Result<Vec<Document>> {
    // For now, return empty list. This could be enhanced to:
    // 1. List files in a documents directory
    // 2. Read from a document database
    // 3. Read from app data directory
    Ok(vec![])
}

// Get document by ID (placeholder for now)
#[tauri::command]
pub async fn get_document(_id: String) -> Result<Option<Document>> {
    // For now, return None. This could be enhanced to:
    // 1. Look up document in database
    // 2. Load from file system based on ID
    Ok(None)
}

// Delete document (placeholder for now)
#[tauri::command]
pub async fn delete_document(_id: String) -> Result<bool> {
    // For now, return false. This could be enhanced to:
    // 1. Delete from database
    // 2. Delete file from file system
    Ok(false)
}

#[tauri::command]
pub async fn load_document(file_path: String) -> Result<Document> {
    let content = tokio::fs::read_to_string(&file_path).await?;
    let metadata = tokio::fs::metadata(&file_path).await?;
    let created_at = metadata.created()?;
    let updated_at = metadata.modified()?;
    let created_at = chrono::DateTime::<Utc>::from(created_at).to_rfc3339();
    let updated_at = chrono::DateTime::<Utc>::from(updated_at).to_rfc3339();

    let doc = Document {
        id: Uuid::new_v4().to_string(),
        title: get_document_title(&Some(file_path.clone())),
        content,
        created_at,
        updated_at,
        file_path: Some(file_path),
    };


    Ok(doc)
}

#[tauri::command]
pub async fn export_document(
    window: Window,
    content: String, // Expects JSON string from Editor.js
    format: String,
    file_path: Option<String>,
) -> Result<()> {
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
            let (tx, rx) = tokio::sync::oneshot::channel();
            window.dialog()
                .file()
                .add_filter(&format!("{} files", format.to_uppercase()), &[extension])
                .add_filter("All files", &["*"])
                .set_title(&format!("Export as {}", format.to_uppercase()))
                .save_file(move |path| {
                    let _ = tx.send(path);
                });

            match rx.await {
                Ok(Some(path)) => path.to_string(),
                Ok(None) => return Ok(()), // User cancelled, so we return Ok.
                Err(_) => return Err(Error::Tauri("Failed to get export file path".to_string())),
            }
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
