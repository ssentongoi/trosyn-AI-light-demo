import React, { useRef, useState, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  Snackbar, 
  Alert,
  Stack,
  Divider
} from '@mui/material';
import Editor, { EditorInstance } from '../components/editor/Editor';
import { OutputData } from '@editorjs/editorjs';

const AIEditorTest: React.FC = () => {
  const editorRef = useRef<EditorInstance>(null);
  const [content, setContent] = useState<OutputData>();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    
    try {
      const savedData = await editorRef.current.save();
      setContent(savedData);
      setSnackbar({
        open: true,
        message: 'Content saved successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving content:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save content',
        severity: 'error'
      });
    }
  }, []);

  const handleAIAction = useCallback(({ action, result }: { action: string; result: any }) => {
    setSnackbar({
      open: true,
      message: `AI ${action} completed successfully!`,
      severity: 'success'
    });
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        AI-Enhanced Editor
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Test the AI-powered features in the editor below. Use the AI toolbar to summarize, 
        check spelling, or redact sensitive information.
      </Typography>

      <Paper elevation={2} sx={{ mt: 3, mb: 4 }}>
        <Editor
          ref={editorRef}
          initialData={{
            time: Date.now(),
            blocks: [
              {
                type: 'paragraph',
                data: {
                  text: 'Try selecting some text and using the AI tools in the toolbar above the editor.'
                }
              }
            ]
          }}
          onSave={handleSave}
          showSaveButton
        />
      </Paper>

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Saved Content
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, minHeight: 100, bgcolor: 'background.default' }}>
          {content?.blocks?.length ? (
            content.blocks.map((block, index) => (
              <div key={index} style={{ marginBottom: '1rem' }}>
                <Typography variant="body1" component="div">
                  {block.data?.text || 'No text content'}
                </Typography>
                {index < content.blocks.length - 1 && <Divider sx={{ my: 1 }} />}
              </div>
            ))
          ) : (
            <Typography color="text.secondary">
              No content saved yet. Make changes and click Save to see the content here.
            </Typography>
          )}
        </Paper>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AIEditorTest;
