import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Divider, 
  Grid, 
  Paper, 
  Chip, 
  IconButton, 
  Tooltip, 
  Switch, 
  FormControlLabel, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Save as SaveIcon, 
  Cancel as CancelIcon, 
  Add as AddIcon, 
  Delete as DeleteIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Public as PublicIcon,
  Link as LinkIcon,
  Lock as LockIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface DocumentMetadataEditorProps {
  document: any;
  onUpdate: (updates: any) => Promise<boolean>;
}

const DocumentMetadataEditor: React.FC<DocumentMetadataEditorProps> = ({ 
  document: doc, 
  onUpdate 
}) => {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    is_public: false,
    category: '',
    language: 'en',
  });
  const [tagInput, setTagInput] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTagToDelete, setSelectedTagToDelete] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Array<{id: string, name: string, email: string, role: string}>>([]);
  const [sharingDialogOpen, setSharingDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('editor');

  // Initialize form with document data
  useEffect(() => {
    if (doc) {
      setMetadata({
        title: doc.title || '',
        description: doc.description || '',
        tags: Array.isArray(doc.tags) ? [...doc.tags] : [],
        is_public: !!doc.is_public,
        category: doc.category || '',
        language: doc.language || 'en',
      });
      
      // Mock collaborators - in a real app, this would come from an API
      setCollaborators([
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'owner' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'editor' },
        { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'viewer' },
      ]);
    }
  }, [doc]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,/g, '');
      if (newTag && !metadata.tags.includes(newTag)) {
        setMetadata(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && metadata.tags.length > 0) {
      // Remove last tag on backspace when input is empty
      setSelectedTagToDelete(metadata.tags[metadata.tags.length - 1]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handlePublicToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMetadata(prev => ({
      ...prev,
      is_public: e.target.checked
    }));
  };

  const handleSave = async () => {
    if (!doc) return;
    
    setIsSaving(true);
    try {
      const updates = {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        is_public: metadata.is_public,
        category: metadata.category,
        language: metadata.language,
      };
      
      const success = await onUpdate(updates);
      if (success) {
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error updating document metadata:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original document data
    if (doc) {
      setMetadata({
        title: doc.title || '',
        description: doc.description || '',
        tags: Array.isArray(doc.tags) ? [...doc.tags] : [],
        is_public: !!doc.is_public,
        category: doc.category || '',
        language: doc.language || 'en',
      });
    }
    setIsEditing(false);
  };

  const handleDeleteTag = (tag: string) => {
    setSelectedTagToDelete(tag);
  };

  const confirmDeleteTag = () => {
    if (selectedTagToDelete) {
      removeTag(selectedTagToDelete);
      setSelectedTagToDelete(null);
    }
  };

  const handleShareDocument = () => {
    setSharingDialogOpen(true);
  };

  const handleShareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call an API to share the document
    console.log('Sharing document with:', { email: shareEmail, role: shareRole });
    
    // Add to collaborators (mock)
    if (shareEmail) {
      const newCollaborator = {
        id: `temp-${Date.now()}`,
        name: shareEmail.split('@')[0],
        email: shareEmail,
        role: shareRole
      };
      setCollaborators(prev => [...prev, newCollaborator]);
      setShareEmail('');
      setShareRole('editor');
      setSharingDialogOpen(false);
    }
  };

  const handleRemoveCollaborator = (id: string) => {
    // In a real app, this would call an API to remove the collaborator
    setCollaborators(prev => prev.filter(c => c.id !== id));
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'primary';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  if (!doc) return null;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Document Details</Typography>
        {!isEditing ? (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        ) : (
          <Box>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              sx={{ mr: 1 }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={isSaving || !metadata.title.trim()}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Basic Information</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={metadata.title}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  name="description"
                  value={metadata.description}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Add a description to help you and others understand this document's purpose."
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  disabled={!isEditing}
                  placeholder={isEditing ? "Type and press Enter to add tags" : "No tags"}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mr: 1 }}>
                        {metadata.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            onDelete={isEditing ? () => handleDeleteTag(tag) : undefined}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    ),
                  }}
                />
                {isEditing && metadata.tags.length > 0 && (
                  <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
                    {metadata.tags.length} tag{metadata.tags.length !== 1 ? 's' : ''} added
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={metadata.category}
                    onChange={(e: SelectChangeEvent) => 
                      setMetadata(prev => ({ ...prev, category: e.target.value as string }))
                    }
                    label="Category"
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    <MenuItem value="work">Work</MenuItem>
                    <MenuItem value="personal">Personal</MenuItem>
                    <MenuItem value="education">Education</MenuItem>
                    <MenuItem value="research">Research</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    name="language"
                    value={metadata.language}
                    onChange={(e: SelectChangeEvent) => 
                      setMetadata(prev => ({ ...prev, language: e.target.value as string }))
                    }
                    label="Language"
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                    <MenuItem value="zh">Chinese</MenuItem>
                    <MenuItem value="ja">Japanese</MenuItem>
                    <MenuItem value="ko">Korean</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={metadata.is_public} 
                      onChange={handlePublicToggle}
                      disabled={!isEditing}
                      color="primary"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      {metadata.is_public ? (
                        <>
                          <PublicIcon color="primary" sx={{ mr: 1 }} />
                          <span>Public - Anyone with the link can view</span>
                        </>
                      ) : (
                        <>
                          <LockIcon color="action" sx={{ mr: 1 }} />
                          <span>Private - Only you and people you share with can view</span>
                        </>
                      )}
                    </Box>
                  }
                />
              </Grid>
            </Grid>
          </Paper>
          
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">Sharing & Permissions</Typography>
              <Button 
                variant="outlined" 
                startIcon={<GroupIcon />}
                onClick={handleShareDocument}
              >
                Share
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              {collaborators.map((collaborator) => (
                <ListItem key={collaborator.id}>
                  <ListItemAvatar>
                    <Avatar>
                      {collaborator.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={collaborator.name}
                    secondary={
                      <>
                        <Box component="span" display="block">{collaborator.email}</Box>
                        <Chip 
                          label={getRoleLabel(collaborator.role)}
                          size="small"
                          color={getRoleColor(collaborator.role) as any}
                          variant="outlined"
                          sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                        />
                      </>
                    }
                  />
                  {collaborator.role !== 'owner' && (
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        size="small"
                      >
                        <CloseIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
              
              {collaborators.length === 0 && (
                <Box textAlign="center" py={2}>
                  <GroupIcon color="action" sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2" color="textSecondary">
                    This document isn't shared with anyone yet.
                  </Typography>
                  <Button 
                    variant="text" 
                    color="primary" 
                    size="small" 
                    startIcon={<AddIcon />}
                    onClick={handleShareDocument}
                    sx={{ mt: 1 }}
                  >
                    Share with others
                  </Button>
                </Box>
              )}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Document Information</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Created"
                  secondary={doc.created_at ? format(new Date(doc.created_at), 'PPpp') : 'N/A'}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <Divider component="li" variant="inset" />
              
              <ListItem>
                <ListItemText 
                  primary="Last Modified"
                  secondary={doc.updated_at ? format(new Date(doc.updated_at), 'PPpp') : 'N/A'}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <Divider component="li" variant="inset" />
              
              <ListItem>
                <ListItemText 
                  primary="File Type"
                  secondary={doc.file_type || 'N/A'}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <Divider component="li" variant="inset" />
              
              <ListItem>
                <ListItemText 
                  primary="File Size"
                  secondary={
                    doc.file_size 
                      ? `${(doc.file_size / 1024).toFixed(2)} KB`
                      : 'N/A'
                  }
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <Divider component="li" variant="inset" />
              
              <ListItem>
                <ListItemText 
                  primary="Owner"
                  secondary="You"
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            </List>
            
            <Box mt={2}>
              <Button 
                fullWidth 
                variant="outlined" 
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => console.log('Delete document')}
              >
                Delete Document
              </Button>
            </Box>
          </Paper>
          
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Document Statistics</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Word Count"
                  secondary={doc.word_count || 'N/A'}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <Divider component="li" variant="inset" />
              
              <ListItem>
                <ListItemText 
                  primary="Character Count"
                  secondary={doc.character_count || 'N/A'}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <Divider component="li" variant="inset" />
              
              <ListItem>
                <ListItemText 
                  primary="Page Count"
                  secondary={doc.page_count || 'N/A'}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <Divider component="li" variant="inset" />
              
              <ListItem>
                <ListItemText 
                  primary="Reading Time"
                  secondary={
                    doc.word_count 
                      ? `${Math.ceil((doc.word_count || 0) / 200)} min read`
                      : 'N/A'
                  }
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Delete Tag Confirmation Dialog */}
      <Dialog
        open={!!selectedTagToDelete}
        onClose={() => setSelectedTagToDelete(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Remove Tag</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove the tag "{selectedTagToDelete}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTagToDelete(null)}>Cancel</Button>
          <Button 
            onClick={confirmDeleteTag} 
            color="error"
            variant="contained"
            autoFocus
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Share Document Dialog */}
      <Dialog 
        open={sharingDialogOpen} 
        onClose={() => setSharingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share Document</DialogTitle>
        <form onSubmit={handleShareSubmit}>
          <DialogContent>
            <Typography variant="body1" paragraph>
              Share "{metadata.title || 'Untitled Document'}" with others
            </Typography>
            
            <Box mb={2}>
              <TextField
                autoFocus
                margin="dense"
                label="Email addresses or names"
                type="email"
                fullWidth
                variant="outlined"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="person@example.com"
                required
              />
            </Box>
            
            <FormControl fullWidth variant="outlined" margin="dense">
              <InputLabel>Role</InputLabel>
              <Select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as string)}
                label="Role"
              >
                <MenuItem value="editor">
                  <Box display="flex" alignItems="center">
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    <Box>
                      <div>Editor</div>
                      <Typography variant="caption" color="textSecondary">
                        Can edit and comment
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
                <MenuItem value="commenter">
                  <Box display="flex" alignItems="center">
                    <InfoIcon fontSize="small" sx={{ mr: 1 }} />
                    <Box>
                      <div>Commenter</div>
                      <Typography variant="caption" color="textSecondary">
                        Can comment only
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
                <MenuItem value="viewer">
                  <Box display="flex" alignItems="center">
                    <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
                    <Box>
                      <div>Viewer</div>
                      <Typography variant="caption" color="textSecondary">
                        Can view only
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            
            <Box mt={2} p={2} bgcolor="action.hover" borderRadius={1}>
              <Typography variant="body2">
                <strong>Note:</strong> People with access can view or edit this document based on the permissions you grant.
              </Typography>
            </Box>
            
            {metadata.is_public && (
              <Box mt={2} p={2} bgcolor="info.light" borderRadius={1}>
                <Typography variant="body2">
                  <strong>This document is public.</strong> Anyone with the link can view it.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSharingDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={!shareEmail}
            >
              Send
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default DocumentMetadataEditor;
