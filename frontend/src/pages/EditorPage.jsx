import React, { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import { useSummarize } from '../hooks/useSummarize';
import { useSpellcheck } from '../hooks/useSpellcheck';
import { DocumentUploader } from '../components/DocumentUploader';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Snackbar } from '@mui/material';

const EDITOR_TOOLS = {
  header: Header,
  list: List,
};

const EditorPage = () => {
  const editorInstance = useRef(null);
  const editorContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('editor');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Initialize the editor
  useEffect(() => {
    if (!editorInstance.current && editorContainerRef.current) {
      const editor = new EditorJS({
        holder: editorContainerRef.current,
        tools: EDITOR_TOOLS,
        placeholder: 'Start writing or upload a document...',
        autofocus: true,
        onReady: () => {
          console.log('Editor.js is ready to work!');
        },
      });
      editorInstance.current = editor;
    }

    return () => {
      if (editorInstance.current && typeof editorInstance.current.destroy === 'function') {
        editorInstance.current.destroy();
        editorInstance.current = null;
      }
    };
  }, []);

  // Handle document upload success
  const handleUploadSuccess = (response) => {
    if (response.content) {
      // Clear existing editor content
      if (editorInstance.current) {
        editorInstance.current.clear();
        // Add the uploaded content as a new block
        editorInstance.current.blocks.insert('paragraph', {
          text: response.content,
        });
      }
      showNotification('Document uploaded successfully!', 'success');
    }
  };

  // Show notification
  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Document Editor
      </Typography>
      
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Button 
          variant={activeTab === 'editor' ? 'contained' : 'text'} 
          onClick={() => setActiveTab('editor')}
          sx={{ mr: 1 }}
        >
          Editor
        </Button>
        <Button 
          variant={activeTab === 'tools' ? 'contained' : 'text'}
          onClick={() => setActiveTab('tools')}
        >
          AI Tools
        </Button>
      </Box>

      {/* Document Uploader */}
      <Box sx={{ mb: 3 }}>
        <DocumentUploader onSuccess={handleUploadSuccess} onError={(error) => showNotification(error, 'error')} />
      </Box>

      {/* Editor Section */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          mb: 3,
          minHeight: '400px',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
        }}
      >
        <div
          ref={editorContainerRef}
          style={{
            minHeight: '350px',
            outline: 'none',
          }}
        />
      </Paper>

      {/* AI Tools Section */}
      {activeTab === 'tools' && (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            AI-Powered Document Tools
          </Typography>
          <SummarizeAndSpellcheckControls 
            editorInstance={editorInstance} 
            onError={(error) => showNotification(error, 'error')}
          />
        </Paper>
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// --- Summarize and Spellcheck Controls ---
function SummarizeAndSpellcheckControls({ editorInstance, onError }) {
  const [activeTool, setActiveTool] = useState(null);
  const { summary, loading: loadingSummary, error: errorSummary, summarize } = useSummarize();
  const { spellcheckedText, loading: loadingSpell, error: errorSpell, spellcheck } = useSpellcheck();

  // Extract plain text from Editor.js
  const getEditorText = async () => {
    if (editorInstance.current && editorInstance.current.save) {
      try {
        const data = await editorInstance.current.save();
        if (data.blocks && data.blocks.length > 0) {
          return data.blocks
            .map(block => block.data?.text || '')
            .filter(Boolean)
            .join('\n\n');
        }
      } catch (error) {
        console.error('Error getting editor content:', error);
        onError('Failed to get editor content. Please try again.');
      }
    }
    onError('No content available to process');
    return '';
  };

  const handleSummarize = async () => {
    const text = await getEditorText();
    if (text) {
      setActiveTool('summary');
      await summarize(text);
    }
  };

  const handleSpellcheck = async () => {
    const text = await getEditorText();
    if (text) {
      setActiveTool('spellcheck');
      await spellcheck(text);
    }
  };

  // Show error alerts
  useEffect(() => {
    if (errorSummary) {
      onError(`Summary error: ${errorSummary}`);
    }
  }, [errorSummary]);

  useEffect(() => {
    if (errorSpell) {
      onError(`Spellcheck error: ${errorSpell}`);
    }
  }, [errorSpell]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSummarize}
          disabled={loadingSummary}
          startIcon={loadingSummary ? <CircularProgress size={20} /> : null}
        >
          {loadingSummary ? 'Summarizing...' : 'Generate Summary'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleSpellcheck}
          disabled={loadingSpell}
          startIcon={loadingSpell ? <CircularProgress size={20} /> : null}
        >
          {loadingSpell ? 'Checking...' : 'Check Spelling'}
        </Button>
      </Box>

      {/* Results */}
      {(activeTool === 'summary' && summary) && (
        <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: '#f8f9fa' }}>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Document Summary:</strong>
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {summary}
          </Typography>
        </Paper>
      )}

      {(activeTool === 'spellcheck' && spellcheckedText) && (
        <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: '#f8f9fa' }}>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Spell Checked Text:</strong>
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {spellcheckedText}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

export default EditorPage;
      {spellcheckedText && (
        <div style={{ marginTop: 12 }}>
          <b>Spellchecked Text:</b>
          <pre>{spellcheckedText}</pre>
        </div>
      )}
    </div>
  );
}

import { DocumentUploader } from '../components/DocumentUploader';

export default EditorPage;
