import React, { useState, useRef, useEffect } from 'react';
import { Box, Container, Typography, Button, Paper, Alert } from '@mui/material';
import SimpleEditor, { EditorInstance } from '../../editor-sandbox/SimpleEditor';
import ThemeWrapper from '../../editor-sandbox/components/ThemeWrapper';

const EditorSandbox: React.FC = () => {
  const [savedContent, setSavedContent] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const editorRef = useRef<EditorInstance>(null);

  useEffect(() => {
    // Check if running in Tauri environment
    // This check is crucial for desktop-only functionality
    setIsTauri(window.__TAURI__ !== undefined);
  }, []);

  const handleSave = async () => {
    if (editorRef.current) {
      try {
        const outputData = await editorRef.current.save();
        console.log('Editor data saved:', outputData);
        setSavedContent(outputData);
      } catch (error) {
        console.error('Error saving editor data:', error);
      }
    }
  };

  // This effect will run when the editor is ready
  useEffect(() => {
    if (isReady) {
      console.log('Editor is ready!');
    }
  }, [isReady]);

  // If not in Tauri environment, display an error message.
  if (!isTauri) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          This application is designed for the desktop environment only.
        </Alert>
        <Typography variant="body1">
          Please run this application using the Tauri desktop shell.
        </Typography>
      </Container>
    );
  }

  // Render the editor sandbox UI only if in Tauri environment
  return (
    <ThemeWrapper>
    <Container maxWidth="lg" sx={{ my: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Editor.js Sandbox
      </Typography>
      <Paper elevation={2} sx={{ p: 2, mb: 2, border: '1px solid #ddd' }}>
        <SimpleEditor
          holder="editor-sandbox-container"
          ref={editorRef}
          onReady={() => setIsReady(true)}
          placeholder="Let's write an awesome story!"
        />
      </Paper>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={handleSave} disabled={!isReady}>
          Save Content
        </Button>
      </Box>
      {savedContent && (
        <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6">Saved Content:</Typography>
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 1 }}>
            {JSON.stringify(savedContent, null, 2)}
          </Box>
        </Paper>
      )}
    </Container>
    </ThemeWrapper>
  );
};

export default EditorSandbox;
