import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  IconButton, 
  Button,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Paper,
  Divider,
  Card,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemButton,
  TextField as MuiTextField,
  InputAdornment,
  Collapse,
  Fade
} from '@mui/material';
import { 
  Send as SendIcon, 
  AttachFile as AttachFileIcon,
  Settings as SettingsIcon,
  HelpOutline as HelpOutlineIcon,
  DeleteOutline as DeleteOutlineIcon,
  Cancel as CancelIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  History as HistoryIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import aiService from '../services/aiService';

// Styled components
const ChatContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 128px)',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: theme.spacing(2),
  [theme.breakpoints.up('md')]: {
    flexDirection: 'row',
    height: 'calc(100vh - 64px)',
  },
}));

const ConversationList = styled(Paper)(({ theme }) => ({
  width: '100%',
  maxWidth: 300,
  marginRight: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.down('md')]: {
    maxWidth: '100%',
    marginRight: 0,
    marginBottom: theme.spacing(2),
  },
}));

const ChatMessages = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const MessagesContainer = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  '& > * + *': {
    marginTop: '16px',
  },
});

const InputContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isTyping',
})(({ theme, isUser, isTyping }) => ({
  maxWidth: '80%',
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: isUser 
    ? theme.palette.primary.main 
    : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  marginLeft: isUser ? 'auto' : 0,
  marginRight: isUser ? 0 : 'auto',
  position: 'relative',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  boxShadow: theme.shadows[1],
  ...(isTyping && {
    '&::after': {
      content: '""',
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: theme.palette.text.secondary,
      marginLeft: '4px',
      animation: 'typing 1.4s infinite both',
      '&:nth-child(2)': {
        animationDelay: '0.2s',
      },
      '&:nth-child(3)': {
        animationDelay: '0.4s',
      },
    },
    '@keyframes typing': {
      '0%, 60%, 100%': {
        opacity: 0.3,
        transform: 'translateY(0)',
      },
      '30%': {
        opacity: 1,
        transform: 'translateY(-4px)',
      },
    },
  }),
}));

const AIAssistant = () => {
  const theme = useTheme();
  const colors = theme.palette;
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const streamController = useRef(null);
  const isMounted = useRef(true);
  
  // State
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [conversationMenuAnchor, setConversationMenuAnchor] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [typingText, setTypingText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef(null);

  const suggestions = [
    'How can I improve my code?',
    'What are the latest trends in AI?',
    'Help me debug this issue...',
    'Explain machine learning concepts'
  ];

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message to UI immediately for better UX
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Send message to backend
      const response = await aiService.sendMessage(
        currentInput, 
        attachments,
        conversationId
      );

      if (response.success) {
        const { message, conversationId: newConversationId } = response.data;
        
        // Update conversation ID if this is a new conversation
        if (newConversationId && !conversationId) {
          setConversationId(newConversationId);
        }

        // Add AI response to messages
        const aiMessage = {
          id: `ai-${Date.now()}`,
          text: message,
          sender: 'ai',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Clear attachments after successful send
        if (attachments.length > 0) {
          setAttachments([]);
        }
        
        // Refresh conversations list
        await loadConversations();
      } else {
        enqueueSnackbar(response.error || 'Failed to send message', { variant: 'error' });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      enqueueSnackbar('Failed to send message. Please try again.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  // Remove an attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  // Clear the current conversation
  const handleClearConversation = async () => {
    if (conversationId) {
      const result = await aiService.deleteConversation(conversationId);
      if (result.success) {
        enqueueSnackbar('Conversation deleted', { variant: 'success' });
        setConversationId(null);
        setMessages([]);
        await loadConversations();
      } else {
        enqueueSnackbar(result.error || 'Failed to delete conversation', { variant: 'error' });
      }
    } else {
      setMessages([]);
    }
    setDeleteDialogOpen(false);
  };
  
  // Load user's conversations
  const loadConversations = async () => {
    try {
      const result = await aiService.getConversations();
      if (result.success) {
        setConversations(result.data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      enqueueSnackbar('Failed to load conversations', { variant: 'error' });
    }
  };
  
  // Load a specific conversation
  const loadConversation = async (id) => {
    try {
      const result = await aiService.getConversation(id);
      if (result.success) {
        setMessages(result.data.messages);
        setConversationId(id);
        setConversationMenuAnchor(null);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      enqueueSnackbar('Failed to load conversation', { variant: 'error' });
    }
  };
  
  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Close error alert
  const handleCloseError = () => {
    setError(null);
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: colors.primary[400],
      p: 2
    }}>
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
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
            AI Assistant
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Your intelligent assistant for all your questions
          </Typography>
        </Box>
        <Box>
          <Tooltip title="Conversations">
            <IconButton 
              onClick={(e) => setConversationMenuAnchor(e.currentTarget)}
              sx={{ color: 'white' }}
            >
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={conversationMenuAnchor}
            open={Boolean(conversationMenuAnchor)}
            onClose={() => setConversationMenuAnchor(null)}
          >
            <MenuItem onClick={() => {
              setConversationId(null);
              setMessages([]);
              setConversationMenuAnchor(null);
            }}>
              New Conversation
            </MenuItem>
            <Divider />
            {conversations.map((conv) => (
              <MenuItem 
                key={conv.id} 
                onClick={() => loadConversation(conv.id)}
                selected={conversationId === conv.id}
              >
                {conv.title || `Conversation ${new Date(conv.updatedAt).toLocaleDateString()}`}
              </MenuItem>
            ))}
            {conversations.length === 0 && (
              <MenuItem disabled>No previous conversations</MenuItem>
            )}
          </Menu>
          <Tooltip title="Settings">
            <IconButton onClick={() => setShowSettings(true)} sx={{ color: 'white' }}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Help">
            <IconButton onClick={() => setShowHelp(true)} sx={{ color: 'white' }}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
        backgroundColor: colors.primary[400]
      }}>
        {/* Messages */}
        <Box sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '3px',
          },
        }}>
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
                <HelpOutlineIcon sx={{ fontSize: 80, opacity: 0.2 }} />
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
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Typography variant="body1">{suggestion}</Typography>
                  </Card>
                ))}
              </Box>
            </Box>
          ) : (
            <List sx={{ width: '100%', maxWidth: '900px', mx: 'auto' }}>
              {messages.map((message) => (
                <React.Fragment key={message.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                      px: 0,
                      py: 2,
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: '40px' }}>
                      <Avatar
                        sx={{
                          bgcolor: message.sender === 'user' ? colors.primary[600] : colors.grey[700],
                          width: 36,
                          height: 36,
                        }}
                      >
                        {message.sender === 'user' ? 'U' : 'AI'}
                      </Avatar>
                    </ListItemAvatar>
                    <Box
                      sx={{
                        maxWidth: '80%',
                        ml: message.sender === 'user' ? 0 : 2,
                        mr: message.sender === 'user' ? 2 : 0,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          backgroundColor: message.sender === 'user' 
                            ? colors.primary[600] 
                            : colors.grey[800],
                          color: 'white',
                          borderRadius: message.sender === 'user' 
                            ? '18px 18px 0 18px' 
                            : '18px 18px 18px 0',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        <Typography variant="body1">{message.text}</Typography>
                      </Paper>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          textAlign: message.sender === 'user' ? 'right' : 'left',
                          color: 'rgba(255, 255, 255, 0.5)',
                          mt: 0.5,
                          fontSize: '0.7rem'
                        }}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
              {isLoading && (
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: colors.grey[700] }}>AI</Avatar>
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
          )}
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
            mt: 'auto',
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
            <Tooltip title="Attach file">
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                sx={{ color: 'white' }}
              >
                <AttachFileIcon />
              </IconButton>
            </Tooltip>
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
              data-testid="message-input"
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
              data-testid="send-button"
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
        <DialogTitle id="delete-dialog-title">Clear Conversation</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to clear the conversation? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleClearConversation} color="error" startIcon={<DeleteOutlineIcon />}>
            Clear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        aria-labelledby="settings-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="settings-dialog-title">Settings</DialogTitle>
        <DialogContent>
          <Typography>Settings will be available soon.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Help Dialog */}
      <Dialog
        open={showHelp}
        onClose={() => setShowHelp(false)}
        aria-labelledby="help-dialog-title"
        maxWidth="md"
      >
        <DialogTitle id="help-dialog-title">Help & Support</DialogTitle>
        <DialogContent>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>How to use the AI Assistant</Typography>
            <Typography paragraph>
              - Type your question or message in the input field and press Enter to send
            </Typography>
            <Typography paragraph>
              - Attach files for the AI to analyze by clicking the paperclip icon
            </Typography>
            <Typography paragraph>
              - Use the suggestions to get started quickly
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" gutterBottom>Need more help?</Typography>
            <Typography>
              Contact our support team at support@trosyn.ai
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelp(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIAssistant;
