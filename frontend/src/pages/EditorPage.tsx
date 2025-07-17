import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert, 
  Snackbar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Input,
  IconButton,
  Tooltip
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import DocumentToolbar from '@/components/document/DocumentToolbar';
import { useDocumentEditor } from '@/hooks/useDocumentEditor';
import { DocumentVersion } from '@/types/document';

interface EditorPageProps {
  recoveredContent?: string;
  recoveredFilePath?: string;
}

const EditorPage: React.FC<EditorPageProps> = ({ 
  recoveredContent,
  recoveredFilePath 
}) => {
  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);
  
  // Alias recoveryAlert to alert for backward compatibility
  const recoveryAlert = alert;
  const setRecoveryAlert = setAlert;
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<{
    content: string;
    filePath: string;
  } | null>(null);
  
  // Get all necessary methods and state from useDocumentEditor
  const documentEditor = useDocumentEditor();
  const {
    content,
    setContent,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveDocument,
    saveAsDocument,
    loadDocument: loadDocumentFromEditor,
    onVersionSelect: handleVersionSelect,
    activeVersionId,
    versions = []
  } = documentEditor;
  
  // Alias saveDocument as handleSave for consistency
  const handleSave = saveDocument;
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Read the file content
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      });

      // Upload the document
      const response = await window.__TAURI__.invoke('upload_document', {
        title: file.name,
        content,
        type: file.type,
        folder: 'default' // Ensure documents are placed in the right folder
      });

      // Handle successful upload
      setAlert({
        open: true,
        message: 'Document uploaded successfully!',
        severity: 'success'
      });

      // Load the uploaded document
      if (response?.data?.id) {
        loadDocumentFromEditor(response.data.id);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setAlert({
        open: true,
        message: 'Error uploading file',
        severity: 'error'
      });
    }
  };
  
  // Close alert
  const handleCloseAlert = () => {
    setAlert(prev => prev ? { ...prev, open: false } : null);
  };
  
  // Handle version selection if available
  const handleVersionSelection = (version: any) => {
    if (handleVersionSelect) {
      handleVersionSelect(version);
    }
  };

  // Handle recovered content on mount
  useEffect(() => {
    if (recoveredContent && recoveredFilePath) {
      setPendingRecovery({
        content: recoveredContent,
        filePath: recoveredFilePath
      });
      setRecoveryDialogOpen(true);
    }
  }, [recoveredContent, recoveredFilePath]);

  // Handle recovery confirmation
  const handleRecoveryConfirm = async () => {
    if (!pendingRecovery) return;
    
    try {
      // Set the content directly since we're recovering unsaved changes
      setContent(pendingRecovery.content);
      
      // If there's a file path, try to load the document first
      if (pendingRecovery.filePath) {
        try {
          await loadDocumentFromEditor(pendingRecovery.filePath);
        } catch (error) {
          console.warn('Could not load document from path, creating new document instead');
        }
      }
      
      setRecoveryAlert({
        open: true,
        message: 'Document recovered successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to recover document:', error);
      setRecoveryAlert({
        open: true,
        message: 'Failed to recover document. Please try again.',
        severity: 'error'
      });
    } finally {
      setRecoveryDialogOpen(false);
      setPendingRecovery(null);
    }
  };

  const handleRecoveryCancel = () => {
    setRecoveryDialogOpen(false);
    setPendingRecovery(null);
  };

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || !content) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        await saveDocument();
        // Auto-save doesn't need to show a success message
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during auto-save';
        console.error('Auto-save failed:', errorMessage);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [content, hasUnsavedChanges, saveDocument]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, handleSave]);

  return (
    <>
      {(recoveryAlert || alert) && (
        <Snackbar
          open={recoveryAlert?.open || alert?.open || false}
          autoHideDuration={6000}
          onClose={handleCloseAlert}
        >
          <Alert 
            onClose={handleCloseAlert} 
            severity={(recoveryAlert || alert)?.severity}
            sx={{ width: '100%' }}
          >
            {(recoveryAlert || alert)?.message}
          </Alert>
        </Snackbar>
      )}

      {/* Recovery Confirmation Dialog */}
      <Dialog
        open={recoveryDialogOpen}
        onClose={handleRecoveryCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Recover Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Would you like to recover the unsaved changes from this document?
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {pendingRecovery?.filePath}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRecoveryCancel} color="inherit">
            Discard
          </Button>
          <Button 
            onClick={handleRecoveryConfirm} 
            color="primary" 
            variant="contained"
            autoFocus
          >
            Recover
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <DocumentToolbar 
          onSave={saveDocument}
          onSaveAs={saveAsDocument}
          onOpen={loadDocumentFromEditor}
          isSaving={isSaving}
          lastSaved={lastSaved}
          hasUnsavedChanges={hasUnsavedChanges}
          versions={versions}
          activeVersionId={activeVersionId}
          onVersionSelect={handleVersionSelection}
        />
        
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <CircularProgress />
              </Box>
            ) : content === null ? (
              <Box sx={{ textAlign: 'center', my: 4 }}>
                <Typography variant="h6" color="textSecondary">
                  No document is currently open
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
                  Open an existing document or create a new one to get started.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <TextField
                  multiline
                  fullWidth
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      height: '100%',
                      alignItems: 'flex-start',
                      '& textarea': {
                        height: '100% !important',
                        overflow: 'auto !important',
                      },
                    },
                  }}
                  InputProps={{
                    style: {
                      height: '100%',
                    },
                  }}
                  variant="outlined"
                  placeholder="Start typing your document here..."
                />
                {hasUnsavedChanges && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, textAlign: 'right' }}>
                    You have unsaved changes
                  </Typography>
                )}
                {lastSaved && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, textAlign: 'right' }}>
                    Last saved: {new Date(lastSaved).toLocaleString()}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default EditorPage;
