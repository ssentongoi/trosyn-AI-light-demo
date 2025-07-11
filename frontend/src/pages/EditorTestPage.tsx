import * as React from 'react';
import { Box, Typography, Paper, Button, Stack, Divider, Alert } from '@mui/material';
import { Editor, EditorRef } from '../components/editor/Editor';
import { Document } from '../services/DocumentService';

// Extend the Document interface to include the content property
interface EditorDocument extends Omit<Document, 'content'> {
  content?: {
    blocks?: Array<{
      type: string;
      data: {
        text?: string;
        level?: number;
        [key: string]: any;
      };
    }>;
  };
  updatedAt?: string | number | Date;
}



const EditorTestPage: React.FC = () => {
  const [documentState, setDocumentState] = useState<EditorDocument | null>(null);
  const [savedDocuments, setSavedDocuments] = useState<EditorDocument[]>([]);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const editorRef = React.useRef<EditorRef>(null);

  const runTest = (testName: string, testFn: () => Promise<boolean>) => {
    return async () => {
      try {
        const result = await testFn();
        setTestResults(prev => ({
          ...prev,
          [testName]: result
        }));
        return result;
      } catch (error) {
        console.error(`Test failed: ${testName}`, error);
        setTestResults(prev => ({
          ...prev,
          [testName]: false
        }));
        return false;
      }
    };
  };

  const testBasicTyping = async (): Promise<boolean> => {
    // This is a manual test - we'll return true if the user confirms it worked
    const result = window.confirm('Can you type in the editor? (Click OK if yes, Cancel if no)');
    return result;
  };

  const testFormatting = async (): Promise<boolean> => {
    // This is a manual test for formatting
    const result = window.confirm('1. Type some text\n2. Select it and click the Bold button\n\nDid the text become bold?');
    return result;
  };

  const testKeyboardShortcuts = async (): Promise<boolean> => {
    // This is a manual test for keyboard shortcuts
    const result = window.confirm('1. Type some text\n2. Select it and press Cmd+B (or Ctrl+B on Windows/Linux)\n\nDid the text become bold?');
    return result;
  };

  const testSaving = async (): Promise<boolean> => {
    try {
      if (!editorRef.current) return false;
      
      const doc = await editorRef.current.save();
      if (!doc) return false;
      
      const docWithTimestamp = {
        ...doc,
        updatedAt: new Date().toISOString()
      };
      
      setDocumentState(docWithTimestamp);
      setSavedDocuments(prev => [...prev, docWithTimestamp]);
      
      return true;
    } catch (error) {
      console.error('Save test failed:', error);
      return false;
    }
  };

  const handleSave = async () => {
    try {
      if (!editorRef.current) {
        console.error('Editor ref is not available');
        return;
      }
      
      console.log('Saving document...');
      const doc = await editorRef.current.save();
      console.log('Document saved:', doc);
      
      if (!doc) {
        console.error('Failed to save document');
        return;
      }
      
      const docWithTimestamp = {
        ...doc,
        updatedAt: new Date().toISOString()
      };
      
      setDocumentState(docWithTimestamp);
      setSavedDocuments(prev => [...prev, docWithTimestamp]);
      
      // Show success message
      setTestResults(prev => ({
        ...prev,
        'Document Saved': true
      }));
      
      return docWithTimestamp;
    } catch (error) {
      console.error('Error saving document:', error);
      setTestResults(prev => ({
        ...prev,
        'Document Save Error': false
      }));
      return null;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Editor Test Page
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Test Controls</Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={runTest('Basic Typing', testBasicTyping)}
          >
            Test Typing
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={runTest('Formatting', testFormatting)}
          >
            Test Formatting
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={runTest('Keyboard Shortcuts', testKeyboardShortcuts)}
          >
            Test Shortcuts
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleSave}
            sx={{ minWidth: '150px' }}
          >
            Save Document
          </Button>
        </Stack>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>Test Results</Typography>
        <Stack spacing={1}>
          {Object.entries(testResults).map(([test, passed]) => (
            <Alert 
              key={test}
              severity={passed ? 'success' : 'error'}
              sx={{ mb: 1 }}
            >
              {test}: {passed ? '✓ Passed' : '✗ Failed'}
            </Alert>
          ))}
        </Stack>
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Editor</Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Type some text and click "Save Document" to test saving.
          </Typography>
        </Box>
        <Editor 
          ref={editorRef}
          onSave={handleSave}
          autosave={false}
          sx={{ 
            border: '1px solid #ddd',
            borderRadius: 1,
            minHeight: '300px',
            bgcolor: 'background.paper',
            mb: 3
          }}
        />
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Document State</Typography>
        <pre style={{
          maxHeight: '300px',
          overflow: 'auto',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {documentState ? JSON.stringify(documentState, null, 2) : 'No document state saved yet'}
        </pre>
      </Paper>
      
      {savedDocuments.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>Saved Documents ({savedDocuments.length})</Typography>
          <Stack spacing={2}>
            {savedDocuments.map((doc, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2">Saved at: {new Date(doc.updatedAt || Date.now()).toLocaleString()}</Typography>
                <Typography variant="body2" noWrap>
                  {doc.content?.blocks?.[0]?.data?.text || 'No content'}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default EditorTestPage;
