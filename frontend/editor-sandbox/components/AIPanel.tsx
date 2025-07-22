import React, { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

import AIToolbar from './AIToolbar';
import styles from '../styles/AIPanel.module.css';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIPanel: React.FC<AIPanelProps> = ({ isOpen, onClose }) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleActionSelect = (action: string) => {
    setSelectedTool(action);
    // Placeholder for running AI actions
    console.log(`AI Action Selected: ${action}`);
  };
  if (!isOpen) {
    return null;
  }

  return (
    <Box className={styles.aiPanel}>
      <Box className={styles.header}>
        <Typography variant="h6">AI Assistant</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <AIToolbar onActionSelect={handleActionSelect} />
      <Box sx={{ padding: 2, flexGrow: 1 }}>
        {selectedTool ? (
          <Typography>Content for: {selectedTool}</Typography>
        ) : (
          <Typography color="text.secondary">Select a tool to begin.</Typography>
        )}
      </Box>
    </Box>
  );
};

export default AIPanel;
