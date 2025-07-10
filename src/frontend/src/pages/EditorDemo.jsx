import React, { useState } from 'react';
import { Box, Container, Typography, Paper, Button } from '@mui/material';
import { Editor } from '../components/editor';

export const EditorDemo = () => {
  const [content, setContent] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const handleSave = () => {
    console.log('Editor content:', content);
    alert('Content saved to console!');
  };

  const handleToggleReadOnly = () => {
    setIsReadOnly(!isReadOnly);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Editor Demo
      </Typography>
      
      <Typography variant="body1" paragraph>
        This is a demonstration of the rich text editor component. Try editing the content below!
      </Typography>

      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSave}
          >
            Save Content
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleToggleReadOnly}
            sx={{ ml: 1 }}
          >
            {isReadOnly ? 'Enable Editing' : 'Disable Editing'}
          </Button>
          <Typography variant="caption" sx={{ ml: 'auto', alignSelf: 'center' }}>
            {isReadOnly ? 'Read-only mode' : 'Edit mode'}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, minHeight: '400px' }}>
          <Editor
            value={content}
            onChange={setContent}
            readOnly={isReadOnly}
            placeholder="Start typing here..."
            sx={{ 
              height: '100%',
              '& .ce-block__content': {
                maxWidth: '800px',
                margin: '0 auto',
              },
              '& .ce-toolbar__content': {
                maxWidth: '800px',
                margin: '0 auto',
              },
            }}
          />
        </Box>
      </Paper>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Features:
        </Typography>
        <ul>
          <li>Rich text formatting</li>
          <li>Headings (H2, H3, H4)</li>
          <li>Lists (ordered and unordered)</li>
          <li>Tables</li>
          <li>Checklists</li>
          <li>Code blocks</li>
          <li>Quotes</li>
        </ul>
      </Box>
    </Container>
  );
};

export default EditorDemo;
