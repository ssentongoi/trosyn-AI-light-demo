import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { Box, Paper, Typography, Avatar, IconButton, Tooltip } from '@mui/material';
import { Person as UserIcon, AutoAwesome as AIIcon, Replay as RetryIcon, ContentCopy as CopyIcon, AddComment as InsertIcon } from '@mui/icons-material';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  onRetry: (messageId: string) => void;
  onCopy: (text: string) => void;
  onInsert: (text: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRetry, onCopy, onInsert }) => {
  const isUser = message.sender === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, maxWidth: '80%' }}>
        {!isUser && <Avatar sx={{ bgcolor: 'primary.main' }}><AIIcon /></Avatar>}
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            bgcolor: isUser ? 'primary.light' : 'background.paper',
            borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
          }}
        >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {format(new Date(message.timestamp), 'p')}
            </Typography>
            {!isUser && (
              <Box>
                <Tooltip title="Retry">
                  <IconButton size="small" onClick={() => onRetry(message.id)}><RetryIcon fontSize="inherit" /></IconButton>
                </Tooltip>
                <Tooltip title="Copy">
                  <IconButton size="small" onClick={() => onCopy(message.text)}><CopyIcon fontSize="inherit" /></IconButton>
                </Tooltip>
                <Tooltip title="Insert into Document">
                  <IconButton size="small" onClick={() => onInsert(message.text)}><InsertIcon fontSize="inherit" /></IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Paper>
        {isUser && <Avatar><UserIcon /></Avatar>}
      </Box>
    </Box>
  );
};

export default ChatMessage;
