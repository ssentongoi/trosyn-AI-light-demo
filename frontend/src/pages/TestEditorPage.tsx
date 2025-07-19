import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import SimpleEditor from '../components/editor/SimpleEditor';

const TestEditorPage = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          EditorJS Test Page
        </Typography>
        <Typography variant="body1" paragraph>
          This is a test page for the EditorJS component. Try editing the content below!
        </Typography>
        
        <Box sx={{ mt: 4, mb: 8 }}>
          <SimpleEditor />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Note: This is a test implementation. The content is not being saved anywhere.
        </Typography>
      </Box>
    </Container>
  );
};

export default TestEditorPage;
