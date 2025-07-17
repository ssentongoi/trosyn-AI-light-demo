# Tauri v1 to v2 Migration Guide: File Dialog Changes

## Overview
This document outlines the changes made to the file dialog functionality when upgrading from Tauri v1 to v2, specifically focusing on the `open_dialog` command.

## Key Changes

### 1. Return Type Change
- **v1**: `Result<Option<Vec<String>>>`
- **v2**: `Result<Vec<String>, String>`

The function now always returns a `Vec<String>` for consistency, even for single file selection. An empty vector is returned when the user cancels the dialog.

### 2. Error Handling
- **v1**: Used custom error types
- **v2**: Returns errors as `String` for simplicity

### 3. File Path Handling
- **v1**: Returned `None` when no file was selected
- **v2**: Returns an empty vector `[]` when no file is selected

## Migration Steps

### Backend Changes

1. **Update Function Signature**
   ```rust
   // Old
   pub async fn open_dialog<R: Runtime>(
       app: AppHandle<R>,
       options: OpenDialogOptions,
   ) -> Result<Option<Vec<String>>>
   
   // New
   pub async fn open_dialog<R: Runtime>(
       app: AppHandle<R>,
       options: OpenDialogOptions,
   ) -> Result<Vec<String>, String>
   ```

2. **Update Call Sites**
   - Check for empty vector instead of `None`
   - Update error handling to use string errors

### Frontend Changes

1. **Update Type Definitions**
   ```typescript
   // Old
   type FileDialogResult = string[] | null;
   
   // New
   type FileDialogResult = string[]; // Empty array means no selection
   ```

2. **Update Error Handling**
   ```typescript
   // Old
   const [selectedFiles, setSelectedFiles] = useState<string[] | null>(null);
   
   // New
   const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
   
   // Check for no selection
   if (selectedFiles.length === 0) {
     // Handle no selection
   }
   ```

## Testing

### Backend Tests
Run the new test suite to verify the changes:

```bash
cd src-tauri
cargo test
```

### Manual Testing
1. Test single file selection
2. Test multiple file selection
3. Test cancellation (should return empty vector)
4. Test with file filters
5. Test error cases (e.g., permission denied)

## Rollback Plan
If issues are encountered, you can revert to the previous version by:

1. Reverting the changes to `filesystem.rs`
2. Updating any frontend code that was modified
3. Running the test suite to ensure everything still works

## Additional Notes
- The new implementation is more consistent with Rust idioms
- Error messages are now more descriptive
- The API is more predictable with a single return type
