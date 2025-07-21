import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Button, Paper, Alert } from '@mui/material';
import Editor from '../components/editor/Editor';

// Simple isolated sandbox for Editor.js development
const EditorSandbox = () => {
  const [content, setContent] = useState(null);
  const [isTauri, setIsTauri] = useState(false);
  const [error, setError] = useState('');

  // Check if running in Tauri environment
  useEffect(() => {
    const checkTauri = async () => {
      try {
        setIsTauri(window.__TAURI__ !== undefined);
      } catch (e) {
        console.error('Error checking Tauri environment:', e);
        setError('Error initializing Tauri environment');
      }
    };
    checkTauri();
  }, []);

  const handleSave = (data) => {
    console.log('Editor content saved:', data);
    setContent(data);
  };

  const handleChange = (data) => {
    console.log('Editor content changed:', data);
  };

  if (!isTauri) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          This sandbox is only available in the Tauri desktop application.
        </Alert>
        <Typography variant="body1">
          Please open this page in the Tauri app to use the editor sandbox.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Editor.js Sandbox
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" paragraph>
        Isolated environment for Editor.js development and testing
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Editor</Typography>
        <Box sx={{ minHeight: '400px', border: '1px solid #ddd', borderRadius: 1 }}>
          <Editor 
            onSave={handleSave}
            onChange={handleChange}
            initialData={{
              time: Date.now(),
              blocks: [
                {
                  type: 'header',
                  data: {
                    text: 'Welcome to the Editor.js Sandbox',
                    level: 2
                  }
                },
                {
                  type: 'paragraph',
                  data: {
                    text: 'This is an isolated environment for developing and testing the Editor.js component.'
                  }
                }
              ]
            }}
          />
        </Box>
      </Paper>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Output</Typography>
        <Box sx={{ 
          p: 2, 
          bgcolor: '#f5f5f5', 
          borderRadius: 1,
          minHeight: '200px',
          maxHeight: '400px',
          overflow: 'auto',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap'
        }}>
          {content ? (
            <div>{JSON.stringify(content, null, 2)}</div>
          ) : (
            <Typography color="textSecondary">
              Editor output will appear here when you save
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default EditorSandbox;
