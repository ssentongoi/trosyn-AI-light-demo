import React, { useState } from 'react';
import { Box, Typography, IconButton, TextField, InputAdornment, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AIToolbar from './AIToolbar';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SearchIcon from '@mui/icons-material/Search';
import ImageIcon from '@mui/icons-material/Image';
import MicIcon from '@mui/icons-material/Mic';

interface AiAssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AiAssistantSidebar: React.FC<AiAssistantSidebarProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Hello! How can I help you with your document?', timestamp: '10:30 AM' },
    { id: 2, sender: 'user', text: 'Can you summarize this document for me?', timestamp: '10:31 AM' },
    { id: 3, sender: 'ai', text: 'Of course. This document provides a detailed analysis of market trends in the tech industry for Q2 2024.', timestamp: '10:32 AM', tag: 'Summary' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { id: Date.now(), sender: 'user', text: input, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setInput('');
      // Mock AI response for demonstration
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'This is a mock AI response.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      }, 1000);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Box
      sx={{
        width: 320,
        flexShrink: 0,
        borderLeft: '1px solid',
        borderColor: 'divider',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'grey.50',
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" component="div">
          AI Assistant
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Chat Window */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              mb: 2,
            }}
          >
            <Paper
              variant="elevation"
              elevation={1}
              sx={{
                p: 1.5,
                backgroundColor: msg.sender === 'user' ? 'primary.main' : 'white',
                color: msg.sender === 'user' ? 'white' : 'text.primary',
                borderRadius: msg.sender === 'user' ? '10px 10px 0 10px' : '10px 10px 10px 0',
                maxWidth: '90%',
              }}
            >
              <Typography variant="body2">{msg.text}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
                {msg.tag && <Typography variant="caption" sx={{ mr: 1, fontStyle: 'italic', color: msg.sender === 'user' ? 'primary.light' : 'text.secondary' }}>{msg.tag}</Typography>}
                <Typography variant="caption" sx={{ color: msg.sender === 'user' ? 'primary.light' : 'text.secondary' }}>{msg.timestamp}</Typography>
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>

      {/* AI Toolbar */}
      <AIToolbar getEditorContent={() => "sample content for now"} />

      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'white' }}>
        <TextField
          placeholder="Ask AI..."
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton color="primary" onClick={handleSend} disabled={!input.trim()}>
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 1 }}>
          <IconButton size="small"><AttachFileIcon /></IconButton>
          <IconButton size="small"><SearchIcon /></IconButton>
          <IconButton size="small"><ImageIcon /></IconButton>
          <IconButton size="small"><MicIcon /></IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default AiAssistantSidebar;
