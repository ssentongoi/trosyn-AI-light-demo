import React, { useState } from 'react';
import { Box, Container, Typography, Button, Snackbar, Alert } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import Editor from '../components/editor/Editor';
import { OutputData } from '@editorjs/editorjs';

const TestEditorPage = () => {
  const [savedData, setSavedData] = useState<OutputData | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          EditorJS Test Page
        </Typography>
        <Typography variant="body1" paragraph>
          This is a test page for the EditorJS component. Try editing the content below!
        </Typography>
        
        <Box sx={{ mt: 4, mb: 4 }}>
          <Editor 
            onSave={(data) => {
              setSavedData(data);
              setSnackbarMessage('Content saved successfully!');
              setSnackbarSeverity('success');
              setSnackbarOpen(true);
              console.log('Saved content:', data);
            }}
          />
        </Box>
        
        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>Saved Content Preview</Typography>
          <pre style={{ 
            maxHeight: '200px', 
            overflow: 'auto', 
            padding: '16px', 
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            {savedData ? JSON.stringify(savedData, null, 2) : 'No content saved yet'}
          </pre>
        </Box>
        
        <Snackbar 
          open={snackbarOpen} 
          autoHideDuration={3000} 
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
        
        <Typography variant="body2" color="text.secondary">
          Note: This is a test implementation. The content is not being saved anywhere.
        </Typography>
      </Box>
    </Container>
  );
};

export default TestEditorPage;
