import React from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import AIToolbar from './AIToolbar';

interface FloatingInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onActionSelect: (action: string) => void;
}

const FloatingInfoPanel: React.FC<FloatingInfoPanelProps> = ({ isOpen, onClose, title, children, onActionSelect }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Paper 
      elevation={4}
      sx={{
        position: 'fixed',
        top: '70px',
        right: '20px',
        width: '360px',
        height: 'calc(100vh - 90px)',
        zIndex: 1250,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        opacity: isOpen ? 1 : 0,
      }}
    >
      <Box 
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{title}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <AIToolbar onActionSelect={onActionSelect} />
      <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
        {children}
      </Box>
    </Paper>
  );
};

export default FloatingInfoPanel;
