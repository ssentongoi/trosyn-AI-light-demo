# Document Management System

This document outlines the document management features implemented in the Trosyn application, including versioning, auto-save, and recovery functionality.

## Features

### 1. Document Versioning
- Automatic version creation on save
- Manual version creation support
- Version history tracking
- Version restoration

### 2. Auto-Save
- Configurable auto-save interval (default: 30 seconds)
- Recovery of unsaved changes after crashes
- Visual indicators for auto-saved versions

### 3. Document Recovery
- Automatic recovery file creation
- Recovery after crashes
- Manual recovery interface
- Automatic cleanup of old recovery files (older than 7 days)

### 4. Cross-Platform Support
- Native file dialogs on desktop
- Browser-based fallbacks for development
- Consistent behavior across platforms

## API Reference

### Document Structure
```typescript
interface Document {
  id: string;
  title: string;
  content: any; // Editor.js output format
  filePath?: string;
  versions: DocumentVersion[];
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  lastAutoSave?: string; // ISO 8601 timestamp
  isDirty: boolean;
}

interface DocumentVersion {
  id: string;
  timestamp: string; // ISO 8601 timestamp
  content: any; // Editor.js output format
  isAutoSave: boolean;
}
```

### Available Commands

#### Save Document
```typescript
// Save or update a document
const savedDoc = await invoke<Document>('save_document', {
  content: JSON.stringify(document),
  filePath?: string // Optional, will prompt if not provided
});
```

#### Auto-Save Document
```typescript
// Auto-save the current document (called automatically by the system)
const autoSavedDoc = await invoke<Document>('auto_save_document', {
  content: JSON.stringify(document)
});
```

#### Load Document
```typescript
// Load a document by file path
const loadedDoc = await invoke<Document>('load_document', {
  filePath?: string // Optional, will show file dialog if not provided
});
```

#### List Recovery Files
```typescript
// Get a list of available recovery files
const recoveryFiles = await invoke<Document[]>('list_recovery_files');
```

#### Recover Document
```typescript
// Recover a document from a recovery file
const recoveredDoc = await invoke<Document>('recover_document', {
  docId: string // Document ID to recover
});
```

#### Get Document Version
```typescript
// Get a specific version of a document
const version = await invoke<DocumentVersion>('get_document_version', {
  docId: string,
  versionId: string
});
```

#### Restore Document Version
```typescript
// Restore a document to a previous version
const restoredDoc = await invoke<Document>('restore_document_version', {
  docId: string,
  versionId: string
});
```

## Implementation Details

### Auto-Save Mechanism
1. The system tracks the last save time for each document
2. If a document is modified and the auto-save interval has passed, an auto-save is triggered
3. Auto-saved versions are marked with `isAutoSave: true`
4. Recovery files are created for auto-saved documents

### Recovery System
1. Recovery files are stored in a `.recovery` subdirectory
2. Files are automatically cleaned up after 7 days
3. The system checks for recovery files on startup
4. Users are notified if recovery files are found

### Error Handling
- All file operations include proper error handling
- User-friendly error messages are displayed
- Failed operations can be retried

## Browser vs. Desktop Behavior

| Feature          | Desktop (Tauri) | Browser |
|------------------|----------------|---------|
| File Dialogs    | Native dialogs | Browser file picker |
| File System     | Full access    | Limited access |
| Auto-Save       | Full support   | Limited support |
| Recovery        | Full support   | Limited to localStorage |
| Version History | Full support   | Full support |

## Development Notes

- Use the `isTauri()` utility to check the current environment
- Mock file operations in browser mode
- Test recovery scenarios thoroughly
- Monitor file system operations for errors
