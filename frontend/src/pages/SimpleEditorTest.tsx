import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Import the Editor component directly for now to avoid dynamic import issues
import Editor from '../components/editor/Editor';

// Check if running in Tauri environment
const isTauri = window.__TAURI__ !== undefined;

const SimpleEditorTest = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Redirect if not in Tauri environment
  useEffect(() => {
    if (!isTauri) {
      console.warn('Editor is only available in the Tauri desktop app');
      navigate('/');
    }
  }, [navigate]);

  if (!isTauri) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          Editor is only available in the Tauri desktop application.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Simple Editor Test
        </Typography>
        <Typography variant="body1" paragraph>
          This is a simplified test page for the Editor component.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>Editor</Typography>
          <div style={{ minHeight: '300px' }}>
            <Editor 
              onSave={(data) => {
                console.log('Saved content:', data);
              }}
              onChange={(data) => {
                console.log('Content changed:', data);
              }}
            />
          </div>
        </Box>
      </Box>
    </Container>
  );
};

export default SimpleEditorTest;
