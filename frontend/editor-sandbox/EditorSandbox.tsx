import React from 'react';
import { CssBaseline } from '@mui/material';
import ThemeWrapper from './components/ThemeWrapper';
import EditorPage from './components/EditorPage';

const EditorSandbox: React.FC = () => {
  return (
    <ThemeWrapper>
      <CssBaseline />
      <EditorPage />
    </ThemeWrapper>
  );
};

export default EditorSandbox;
