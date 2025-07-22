import React, { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

import AIFeatureButtons from './AIFeatureButtons';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import { Message } from '../types';
import styles from '../styles/AIPanel.module.css';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isTextSelected: boolean;
  onAction: (action: string | null, currentTarget?: HTMLElement) => void;
  onToneSelect: (tone: string) => void;
  onLanguageSelect: (lang: string) => void;
  currentAction: string | null;
  summary: string;
  isLoading: boolean;
  rephraseAnchorEl: null | HTMLElement;
  languageAnchorEl: null | HTMLElement;
}

const AIPanel: React.FC<AIPanelProps> = ({
  isOpen,
  onClose,
  isTextSelected,
  onAction,
  onToneSelect,
  onLanguageSelect,
  currentAction,
  summary,
  isLoading,
  rephraseAnchorEl,
  languageAnchorEl,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! How can I help you with this document?', sender: 'ai', timestamp: new Date().toISOString() },
  ]);

    const handleRetry = (messageId: string) => {
    console.log(`Retrying message: ${messageId}`);
    // Placeholder for retry logic
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    console.log('Copied to clipboard');
  };

  const handleInsert = (text: string) => {
    console.log(`Inserting text into document: ${text}`);
    // Placeholder for insert logic
  };

  const handleSendMessage = (text: string) => {
    const newUserMessage: Message = { id: Date.now().toString(), text, sender: 'user', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, newUserMessage]);

    // Mock AI response
    setTimeout(() => {
      const aiResponse: Message = { 
        id: (Date.now() + 1).toString(), 
        text: `This is a simulated response to: "${text}"`, 
        sender: 'ai', 
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
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
      <ChatWindow 
        messages={messages} 
        onRetry={handleRetry}
        onCopy={handleCopy}
        onInsert={handleInsert}
      />
            <AIFeatureButtons
        isTextSelected={isTextSelected}
        onAction={onAction}
        onToneSelect={onToneSelect}
        onLanguageSelect={onLanguageSelect}
        currentAction={currentAction}
        summary={summary}
        isLoading={isLoading}
        rephraseAnchorEl={rephraseAnchorEl}
        languageAnchorEl={languageAnchorEl}
      />
      <ChatInput onSendMessage={handleSendMessage} />
    </Box>
  );
};

export default AIPanel;
