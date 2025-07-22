import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemText, Paper, Typography, IconButton } from '@mui/material';
import { Send as SendIcon, Add as AddIcon } from '@mui/icons-material';
import { Message } from '../types';



interface RightSidebarProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onSendToEditor: (text: string) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ messages, onSendMessage, onSendToEditor }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
    

  const handleSendMessage = () => {
    if (input.trim() === '') return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'grey.50' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight="bold">AI Assistant</Typography>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        <List>
          {messages.map((msg, index) => (
            <ListItem key={msg.id} sx={{
              display: 'flex',
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              mb: 1,
            }}>
              <Box sx={{ position: 'relative', '&:hover .add-to-editor-btn': { opacity: 1 } }}>
              <Paper elevation={0} sx={{
                p: 1.5,
                backgroundColor: msg.sender === 'user' ? 'primary.main' : 'white',
                color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                maxWidth: '100%',
                border: '1px solid',
                borderColor: msg.sender === 'user' ? 'primary.main' : 'divider',
              }}>
                <ListItemText primary={<Typography variant="body2">{msg.text}</Typography>} />
                {msg.sender === 'ai' && (
                  <IconButton 
                    size="small" 
                    className="add-to-editor-btn"
                    onClick={() => onSendToEditor(msg.text)}
                    sx={{ 
                      position: 'absolute', 
                      bottom: 4, 
                      right: -40,
                      backgroundColor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      opacity: 0,
                      transition: 'opacity 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: 'grey.200'
                      }
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                )}
              </Paper>
              </Box>
            </ListItem>
          ))}
        <div ref={messagesEndRef} />
        </List>
      </Box>
      <Box sx={{ p: 2, backgroundColor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Ask AI..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            sx={{ mr: 1 }}
          />
          <IconButton color="primary" onClick={handleSendMessage} disabled={input.trim() === ''}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default RightSidebar;
