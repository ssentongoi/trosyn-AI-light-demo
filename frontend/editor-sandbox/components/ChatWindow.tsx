import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import ChatMessage from './ChatMessage';
import { Message } from '../types';

interface ChatWindowProps {
  messages: Message[];
  onRetry: (messageId: string) => void;
  onCopy: (text: string) => void;
  onInsert: (text: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onRetry, onCopy, onInsert }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
      {messages.map((msg) => (
        <ChatMessage 
          key={msg.id} 
          message={msg} 
          onRetry={onRetry}
          onCopy={onCopy}
          onInsert={onInsert}
        />
      ))}
      <div ref={endOfMessagesRef} />
    </Box>
  );
};

export default ChatWindow;
