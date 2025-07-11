import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  IconButton, 
  Paper, 
  Avatar, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Divider, 
  CircularProgress, 
  useTheme, 
  Tooltip,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Send as SendIcon, 
  AttachFile as AttachFileIcon, 
  Mic as MicIcon, 
  Code as CodeIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Help as HelpIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { tokens } from '../../theme';
import { useAuth } from '../contexts/AuthContext';
import chatService from '../services/chatService';

const AIAssistant = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  
  // State for chat
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [conversationMenuAnchor, setConversationMenuAnchor] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  
  // Load conversations on component mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const data = await chatService.getConversations();
        setConversations(data);
        
        // If there are conversations, load the most recent one
        if (data.length > 0) {
          loadConversation(data[0].id);
        } else {
          // No conversations yet, show welcome message
          setMessages([
            { 
              id: 'welcome', 
              text: 'Hello! I\'m your AI Assistant. How can I help you today?', 
              sender: 'ai', 
              timestamp: new Date() 
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Failed to load conversations. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConversations();
  }, []);
  
  // Scroll to bottom of messages when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Load a specific conversation
  const loadConversation = async (conversationId) => {
    try {
      setIsLoading(true);
      const conversation = await chatService.getConversation(conversationId);
      setCurrentConversation(conversation);
      
      // Map conversation messages to the format expected by the UI
      const formattedMessages = conversation.messages.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.role === 'assistant' ? 'ai' : 'user',
        timestamp: new Date(msg.created_at)
      }));
      
      setMessages(formattedMessages);
    } catch (err) {
      console.error(`Failed to load conversation ${conversationId}:`, err);
      setError('Failed to load conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new conversation
  const createNewConversation = async () => {
    try {
      setIsLoading(true);
      const newConversation = await chatService.createConversation({
        title: 'New Chat'
      });
      
      setCurrentConversation(newConversation);
      setConversations([newConversation, ...conversations]);
      setMessages([
        { 
          id: 'welcome', 
          text: 'Hello! I\'m your AI Assistant. How can I help you today?', 
          sender: 'ai', 
          timestamp: new Date() 
        }
      ]);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError('Failed to create a new conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a conversation
  const confirmDeleteConversation = (conversation) => {
    setConversationToDelete(conversation);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      setIsLoading(true);
      await chatService.deleteConversation(conversationToDelete.id);
      
      // Update conversations list
      const updatedConversations = conversations.filter(
        conv => conv.id !== conversationToDelete.id
      );
      
      setConversations(updatedConversations);
      
      // If we deleted the current conversation, reset the chat
      if (currentConversation && currentConversation.id === conversationToDelete.id) {
        setCurrentConversation(null);
        setMessages([
          { 
            id: 'welcome', 
            text: 'Please select or create a new conversation.', 
            sender: 'ai', 
            timestamp: new Date() 
          }
        ]);
      }
      
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError('Failed to delete conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isStreaming) return;
    
    const messageText = inputMessage.trim();
    setInputMessage('');
    
    // Create a new conversation if one doesn't exist
    if (!currentConversation) {
      try {
        const newConversation = await chatService.createConversation({
          title: messageText.substring(0, 30) + (messageText.length > 30 ? '...' : '')
        });
        
        setCurrentConversation(newConversation);
        setConversations([newConversation, ...conversations]);
        
        // Now that we have a conversation, send the message
        await sendMessageToAI(newConversation.id, messageText);
      } catch (err) {
        console.error('Failed to create conversation:', err);
        setError('Failed to start a new conversation. Please try again.');
      }
    } else {
      // Send message to existing conversation
      await sendMessageToAI(currentConversation.id, messageText);
    }
  };
  
  // Send message to AI and handle streaming response
  const sendMessageToAI = async (conversationId, messageText) => {
    // Add user message to the UI immediately
    const userMessage = {
      id: `user-${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Add a loading message for the AI response
    const aiMessageId = `ai-${Date.now()}`;
    const loadingMessage = {
      id: aiMessageId,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      isLoading: true
    };
    
    setMessages(prev => [...prev, loadingMessage]);
    
    // Prepare to stream the AI response
    setIsStreaming(true);
    
    try {
      // Use streaming for a better user experience
      await chatService.streamChatCompletion(
        {
          message: messageText,
          conversationId: conversationId
        },
        {
          onChunk: (chunk) => {
            // Update the AI's response in real-time
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, text: (msg.text || '') + (chunk.content || '') }
                : msg
            ));
          },
          onComplete: () => {
            // Update the message to remove loading state
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, isLoading: false }
                : msg
            ));
            
            // Refresh conversations to update the last message preview
            refreshConversations();
          },
          onError: (error) => {
            console.error('Error in chat stream:', error);
            setError('Failed to get response from AI. Please try again.');
            
            // Update the error message
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { 
                    ...msg, 
                    text: 'Sorry, I encountered an error. Please try again.',
                    isError: true,
                    isLoading: false
                  }
                : msg
            ));
          }
        }
      );
    } catch (error) {
      console.error('Error in chat completion:', error);
      setError('Failed to communicate with the server. Please try again.');
      
      // Update the error message
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { 
              ...msg, 
              text: 'Sorry, I encountered an error. Please try again.',
              isError: true,
              isLoading: false
            }
          : msg
      ));
    } finally {
      setIsStreaming(false);
    }
  };
  
  // Refresh the conversations list
  const refreshConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to refresh conversations:', err);
    }
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle conversation menu
  const handleConversationMenuOpen = (event) => {
    setConversationMenuAnchor(event.currentTarget);
  };
  
  const handleConversationMenuClose = () => {
    setConversationMenuAnchor(null);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Close error alert
  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 64px)',
        backgroundColor: colors.primary[400],
        p: 2
      }}
    >
      {/* Error Snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Conversation
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this conversation? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            color="inherit"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConversation}
            color="error"
            disabled={isLoading}
            startIcon={<DeleteIcon />}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>

// Scroll to bottom of messages
const scrollToBottom = () => {
messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
};

// Handle conversation menu
const handleConversationMenuOpen = (event) => {
setConversationMenuAnchor(event.currentTarget);
};

const handleConversationMenuClose = () => {
setConversationMenuAnchor(null);
};

// Format date for display
const formatDate = (dateString) => {
const date = new Date(dateString);
return date.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
};

// Close error alert
const handleCloseError = () => {
setError(null);
};

return (
<Box 
  sx={{ 
    display: 'flex', 
    flexDirection: 'column', 
    height: 'calc(100vh - 64px)',
    backgroundColor: colors.primary[400],
    p: 2
  }}
>
  {/* Error Snackbar */}
  <Snackbar 
    open={!!error} 
    autoHideDuration={6000} 
    onClose={handleCloseError}
    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
  >
    <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
      {error}
    </Alert>
  </Snackbar>
  
  {/* Delete Confirmation Dialog */}
  <Dialog
    open={deleteDialogOpen}
    onClose={() => setDeleteDialogOpen(false)}
    aria-labelledby="delete-dialog-title"
  >
    <DialogTitle id="delete-dialog-title">
      Delete Conversation
    </DialogTitle>
    <DialogContent>
      <Typography>
        Are you sure you want to delete this conversation? This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button 
        onClick={() => setDeleteDialogOpen(false)}
        color="inherit"
        disabled={isLoading}
      >
        Cancel
      </Button>
      <Button 
        onClick={handleDeleteConversation}
        color="error"
        disabled={isLoading}
        startIcon={<DeleteIcon />}
      >
        {isLoading ? 'Deleting...' : 'Delete'}
      </Button>
    </DialogActions>
  </Dialog>
  
  {/* Header */}
  <Box sx={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 2,
    p: 2,
    borderRadius: 2,
    backgroundColor: colors.primary[500],
    boxShadow: 1
  }}>
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: colors.grey[100] }}>
        AI Assistant
      </Typography>
      <Typography variant="body2" sx={{ color: colors.grey[300] }}>
        Your intelligent assistant for all your questions
      </Typography>
    </Box>
    <Box>
      <Tooltip title="Settings">
        <IconButton 
          onClick={() => setShowSettings(true)} 
          sx={{ color: colors.grey[100] }}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Help">
        <IconButton 
          onClick={() => setShowHelp(true)} 
          sx={{ color: colors.grey[100] }}
        >
          <HelpOutlineIcon />
        </IconButton>
      </Tooltip>
    </Box>
  </Box>
</Box>

{/* Main Content */}
<Box sx={{ 
  flex: 1, 
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: 2
}}>
  {/* Suggestions */}
  {messages.length <= 1 && (
    <Grid container spacing={2} sx={{ p: 2 }}>
      {suggestions.map((suggestion, index) => (
        <Grid item xs={12} sm={6} key={index}>
          <Card 
            onClick={() => handleSuggestionClick(suggestion)}
            sx={{ 
              cursor: 'pointer',
              '&:hover': { 
                backgroundColor: colors.primary[500],
                transform: 'translateY(-2px)',
                transition: 'all 0.2s'
              },
              height: '100%'
            }}
          >
            <CardContent>
              <Typography variant="body1">{suggestion}</Typography>
            </CardContent>
          </Card>
      flex: 1, 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
      {/* Suggestions */}
      {messages.length <= 1 && (
        <Grid container spacing={2} sx={{ p: 2 }}>
          {suggestions.map((suggestion, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Card 
                onClick={() => handleSuggestionClick(suggestion)}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    backgroundColor: colors.primary[500],
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s'
                  },
                  height: '100%'
                }}
              >
                <CardContent>
                  <Typography variant="body1">{suggestion}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Messages */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto',
        p: 2,
        borderRadius: 2,
        backgroundColor: colors.primary[400],
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: colors.primary[400],
        },
        '&::-webkit-scrollbar-thumb': {
          background: colors.primary[300],
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: colors.primary[200],
        },
      }}>
        <List sx={{ width: '100%', maxWidth: '900px', mx: 'auto' }}>
          {messages.map((message) => renderMessage(message))}
          {isLoading && (
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: colors.greenAccent[500] }}>AI</Avatar>
              </ListItemAvatar>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ mr: 2 }} />
                <Typography variant="body2" color="textSecondary">
                  Thinking...
                </Typography>
              </Box>
            </ListItem>
          )}
          <div ref={messagesEndRef} />
        </List>
      </Box>

      {/* Input Area */}
      <Box 
        component="form" 
        sx={{ 
          mt: 'auto',
          p: 2,
          borderRadius: 2,
          backgroundColor: colors.primary[500],
          boxShadow: 3
        }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.csv"
          />
          <Tooltip title="Attach file">
            <IconButton 
              onClick={() => fileInputRef.current?.click()}
              sx={{ color: colors.grey[300] }}
            >
              <AttachFileIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Voice input (coming soon)">
            <span>
            <MenuItem onClick={handleMenuClose}>
              <HelpIcon sx={{ mr: 1 }} />
              Help & Support
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {/* Suggestions */}
        {messages.length <= 1 && (
          <Grid container spacing={2} sx={{ p: 2 }}>
            {suggestions.map((suggestion, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Card 
                  onClick={() => handleSuggestionClick(suggestion)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      backgroundColor: colors.primary[500],
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s'
                    },
                    height: '100%'
                  }}
                >
                  <CardContent>
                    <Typography variant="body1">{suggestion}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Messages */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 2, 
          borderRadius: 2, 
          backgroundColor: colors.primary[400],
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(255,255,255,0.3)',
          },
        }}>
          <List sx={{ width: '100%', maxWidth: '900px', mx: 'auto' }}>
            {messages.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="100%"
                textAlign="center"
                color="white"
                p={4}
              >
                <Box sx={{ mb: 3 }}>
                  <ChatBubbleOutlineIcon sx={{ fontSize: 80, opacity: 0.2 }} />
                </Box>
                <Typography variant="h5" gutterBottom>
                  Welcome to Trosyn AI Assistant
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 600, mb: 4 }}>
                  Ask me anything about your documents, projects, or get help with your work.
                </Typography>
                <Box
                  display="grid"
                  gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }}
                  gap={2}
                  width="100%"
                  maxWidth={800}
                >
                  {suggestions.map((suggestion, index) => (
                    <Card
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3,
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                        },
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Typography variant="body1">{suggestion}</Typography>
                    </Card>
                  ))}
                </Box>
              </Box>
            ) : (
              messages.map((message) => renderMessage(message))
            )}
          </List>
        </Box>

        {/* Input Area */}
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          sx={{
            position: 'relative',
            mt: 2,
            p: 2,
            borderRadius: 2,
            backgroundColor: colors.primary[500],
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {attachments.map((file, index) => (
                <Chip
                  key={index}
                  label={file.name}
                  onDelete={() => removeAttachment(index)}
                  deleteIcon={<CancelIcon />}
                  variant="outlined"
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '& .MuiChip-deleteIcon': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        color: 'white',
                      },
                    },
                  }}
                />
              ))}
            </Box>
          )}

          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              color="inherit"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <AttachFileIcon />
            </IconButton>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              multiple
            />

            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
              multiline
              maxRows={4}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255, 255, 255, 0.5)',
                  opacity: 1,
                },
                '& .MuiOutlinedInput-input': {
                  padding: '12px 16px',
                },
              }}
            />

            <IconButton
              color="primary"
              type="submit" 
              disabled={!input.trim() || isLoading}
              sx={{
                backgroundColor: colors.primary[600],
                color: 'white',
                '&:hover': {
                  backgroundColor: colors.primary[700],
                },
                '&:disabled': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.3)',
                },
                width: 48,
                height: 48,
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </Box>

          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption" color="textSecondary">
              {attachments.length} {attachments.length === 1 ? 'attachment' : 'attachments'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Press Enter to send, Shift+Enter for new line
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AIAssistant;
