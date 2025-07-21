import React, { useState, useRef } from 'react';
import { Box, Container, CssBaseline } from '@mui/material';
import TopBar from './components/TopBar';
import SimpleEditor from './SimpleEditor';

const EditorSandbox = () => {
  const editorRef = useRef(null);
  const [page, setPage] = useState({ title: 'Untitled Document', content: null });

  const handleTitleChange = (newTitle) => {
    setPage(prevPage => ({ ...prevPage, title: newTitle }));
  };

  const handleSave = async () => {
    if (editorRef.current) {
      try {
        const outputData = await editorRef.current.save();
        console.log('Saving content:', outputData);
        alert('Content saved! Check the console for the data.');
      } catch (error) {
        console.error('Error saving content:', error);
        alert('Failed to save content. See console for details.');
      }
    }
  };

  const handleExport = () => {
    console.log('Exporting content...');
    alert('Export functionality is not yet implemented.');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      <TopBar 
        page={page} 
        onTitleChange={handleTitleChange} 
        onSave={handleSave} 
        onExport={handleExport} 
      />
      <Container maxWidth="md" sx={{ flexGrow: 1, py: 3, backgroundColor: '#f9f9f9' }}>
        <SimpleEditor editorRef={editorRef} />
      </Container>
    </Box>
  );
};

export default EditorSandbox;
