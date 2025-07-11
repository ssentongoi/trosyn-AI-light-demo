import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
} from '@mui/material';
import { 
  ContentCopy as CopyIcon, 
  Link as LinkIcon, 
  Email as EmailIcon, 
  Close as CloseIcon,
  Check as CheckIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
} from '@mui/icons-material';
import { Document } from '@/types/tauri';
import { isTauri } from '@/utils/environment';

type ShareMethod = 'link' | 'email';
type PermissionLevel = 'view' | 'edit' | 'comment';

interface Collaborator {
  id: string;
  email: string;
  name: string;
  permission: PermissionLevel;
  avatar?: string;
}

const permissionLabels: Record<PermissionLevel, string> = {
  view: 'Can view',
  edit: 'Can edit',
  comment: 'Can comment',
};

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  document: Document;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ open, onClose, document }) => {
  const [method, setMethod] = useState<ShareMethod>('link');
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<PermissionLevel>('view');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{open: boolean; message: string; severity: 'success' | 'error'}>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  const [linkCopied, setLinkCopied] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  
  // Mock collaborators for demo
  useEffect(() => {
    if (open) {
      // In a real app, you would fetch this from your backend
      setCollaborators([
        {
          id: '1',
          email: 'user@example.com',
          name: 'John Doe',
          permission: 'edit',
          avatar: 'JD',
        },
      ]);
    }
  }, [open]);

  const handleCopyLink = async () => {
    try {
      const shareableLink = `${window.location.origin}/document/${document.id}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareableLink);
      } else if (isTauri()) {
        const { writeText } = await import('@tauri-apps/api/clipboard');
        await writeText(shareableLink);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareableLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setLinkCopied(true);
      showNotification('Link copied to clipboard', 'success');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      showNotification('Failed to copy link', 'error');
    }
  };

  const handleInvite = async () => {
    if (!email) return;
    
    try {
      setIsLoading(true);
      // In a real app, you would send an invitation email here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Add to collaborators list
      const newCollaborator: Collaborator = {
        id: `temp-${Date.now()}`,
        email,
        name: email.split('@')[0],
        permission,
      };
      
      setCollaborators(prev => [...prev, newCollaborator]);
      setEmail('');
      showNotification('Invitation sent successfully', 'success');
    } catch (err) {
      console.error('Failed to send invitation:', err);
      showNotification('Failed to send invitation', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCollaborator = (id: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
    showNotification('Collaborator removed', 'success');
  };

  const showNotification = (message: string, severity: 'success' | 'error') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const getPermissionLabel = (level: PermissionLevel) => {
    return permissionLabels[level] || level;
  };

  const getShareableLink = () => {
    return `${window.location.origin}/document/${document.id}`;
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <span>Share "{document.title}"</span>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              Share with people
            </Typography>
            
            <Box display="flex" gap={1} mb={2}>
              <TextField
                fullWidth
                placeholder="Enter email addresses"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="outlined"
                size="small"
                disabled={isLoading}
                InputProps={{
                  startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
              
              <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as PermissionLevel)}
                  style={{
                    height: '40px',
                    padding: '0 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    backgroundColor: 'white',
                    fontSize: '14px',
                  }}
                  disabled={isLoading}
                >
                  <option value="view">Can view</option>
                  <option value="comment">Can comment</option>
                  <option value="edit">Can edit</option>
                </select>
              </FormControl>
              
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleInvite}
                disabled={!email || isLoading}
                startIcon={<PersonAddIcon />}
              >
                {isLoading ? <CircularProgress size={20} /> : 'Invite'}
              </Button>
            </Box>
            
            {collaborators.length > 0 && (
              <List dense sx={{ mb: 2 }}>
                {collaborators.map((collaborator) => (
                  <ListItem key={collaborator.id}>
                    <Box 
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {collaborator.avatar || collaborator.name.charAt(0).toUpperCase()}
                    </Box>
                    
                    <ListItemText 
                      primary={collaborator.name} 
                      secondary={collaborator.email} 
                    />
                    
                    <Chip 
                      label={getPermissionLabel(collaborator.permission)}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                    
                    <IconButton 
                      size="small" 
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      color="error"
                    >
                      <PersonRemoveIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Get shareable link
            </Typography>
            
            <Box display="flex" gap={1} alignItems="center">
              <Box flex={1} position="relative">
                <TextField
                  fullWidth
                  value={getShareableLink()}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: <LinkIcon color="action" sx={{ mr: 1 }} />,
                    readOnly: true,
                  }}
                />
              </Box>
              
              <Tooltip title={linkCopied ? 'Copied!' : 'Copy link'}>
                <Button
                  variant="outlined"
                  onClick={handleCopyLink}
                  startIcon={linkCopied ? <CheckIcon /> : <CopyIcon />}
                  color={linkCopied ? 'success' : 'primary'}
                >
                  {linkCopied ? 'Copied' : 'Copy'}
                </Button>
              </Tooltip>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Anyone with the link can view this document
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose} color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ShareDialog;
