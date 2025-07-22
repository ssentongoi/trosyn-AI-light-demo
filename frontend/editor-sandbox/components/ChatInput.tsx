import React, { useState } from 'react';
import { Box, TextField, IconButton, Tooltip } from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Search as DeeperSearchIcon,
  Image as ImageIcon,
  Mic as MicIcon,
} from '@mui/icons-material';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          variant="standard"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask AI..."
          InputProps={{ disableUnderline: true }}
        />
        <IconButton onClick={handleSend} color="primary" disabled={!text.trim()}>
          <SendIcon />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
        <Tooltip title="Attach Document">
          <IconButton size="small"><AttachFileIcon fontSize="small" /></IconButton>
        </Tooltip>
        <Tooltip title="Deeper Research">
          <IconButton size="small"><DeeperSearchIcon fontSize="small" /></IconButton>
        </Tooltip>
        <Tooltip title="Attach Image">
          <IconButton size="small"><ImageIcon fontSize="small" /></IconButton>
        </Tooltip>
        <Tooltip title="Use Microphone">
          <IconButton size="small"><MicIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default ChatInput;
