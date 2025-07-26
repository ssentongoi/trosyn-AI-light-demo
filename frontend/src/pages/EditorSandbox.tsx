import React, { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import Header from '../components/editor/Header';
import LeftSidebar from '../components/editor/LeftSidebar';
import AiAssistantSidebar from '../components/editor/AiAssistantSidebar';
import Editor from '../components/editor/Editor';

const EditorSandbox: React.FC = () => {
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(true);

  const handleToggleAiAssistant = () => {
    setIsAiAssistantOpen(!isAiAssistantOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f7f7f7' }}>
      <CssBaseline />
      <LeftSidebar />
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Header onAskAiClick={handleToggleAiAssistant} />
        <Box sx={{ flexGrow: 1, p: 3, backgroundColor: 'white', m: 2, borderRadius: '8px' }}>
          <Editor placeholder="Start writing your story..." />
        </Box>
      </Box>
      <AiAssistantSidebar isOpen={isAiAssistantOpen} onClose={handleToggleAiAssistant} />
    </Box>
  );
};

export default EditorSandbox;
