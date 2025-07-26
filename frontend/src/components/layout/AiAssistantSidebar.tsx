import React from 'react';
import { Box, Typography, IconButton, Paper, TextField, InputAdornment } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { useApp } from '../../contexts/AppContext';

const AiAssistantSidebar: React.FC = () => {
  const { toggleAiAssistant } = useApp();

  return (
    <Box
      component={Paper}
      elevation={4}
      square
      sx={{
        width: 320,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)', // Adjust height to be below AppBar
        borderLeft: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          AI Assistant
        </Typography>
        <IconButton onClick={toggleAiAssistant} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ flexGrow: 1, mb: 2, overflowY: 'auto' }}>
        {/* Chat messages will go here */}
        <Typography variant="body2" color="text.secondary">
          AI Assistant chat history...
        </Typography>
      </Box>
      <TextField
        placeholder="Ask AI..."
        fullWidth
        variant="outlined"
        size="small"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton edge="end" color="primary">
                <SendIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
};

export default AiAssistantSidebar;
