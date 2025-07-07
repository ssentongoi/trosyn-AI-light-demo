import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Divider,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  InputAdornment,
  LinearProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  Check as CheckIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

const DepartmentRequestForm = ({ open, onClose, onSubmit, request }) => {
  const [formData, setFormData] = useState({
    title: request?.title || '',
    description: request?.description || '',
    type: request?.type || 'general',
    priority: request?.priority || 'medium',
    due_date: request?.due_date ? format(new Date(request.due_date), 'yyyy-MM-dd') : '',
    department: request?.department?.name || 'Engineering',
    attachments: request?.attachments || [],
    approvers: request?.approvers?.map(a => a.email) || []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newAttachment, setNewAttachment] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setNewAttachment(files[0]);
    }
  };

  const handleAddAttachment = () => {
    if (!newAttachment) return;
    
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, {
        id: Date.now(),
        name: newAttachment.name,
        size: newAttachment.size,
        type: newAttachment.type,
        file: newAttachment
      }]
    }));
    
    setNewAttachment(null);
    document.getElementById('request-attachments').value = '';
  };

  const handleRemoveAttachment = (index) => {
    const newAttachments = [...formData.attachments];
    newAttachments.splice(index, 1);
    setFormData(prev => ({
      ...prev,
      attachments: newAttachments
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      setError('Title and description are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, handle file uploads here before submitting
      const formDataToSubmit = { ...formData };
      
      // Remove the file objects before submitting (handled separately in real app)
      if (formDataToSubmit.attachments) {
        formDataToSubmit.attachments = formDataToSubmit.attachments.map(({ file, ...rest }) => rest);
      }
      
      await onSubmit(formDataToSubmit);
      
      // Reset form on successful submission
      if (!request) {
        setFormData({
          title: '',
          description: '',
          type: 'general',
          priority: 'medium',
          due_date: '',
          department: 'Engineering',
          attachments: [],
          approvers: []
        });
      }
      
      setSnackbar({
        open: true,
        message: request ? 'Request updated successfully' : 'Request created successfully',
        severity: 'success'
      });
      
      onClose();
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err.message || 'An error occurred while submitting the form');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <DescriptionIcon />;
    
    if (fileType.includes('image/')) return <ImageIcon />;
    if (fileType.includes('pdf')) return <PictureAsPdfIcon />;
    if (fileType.includes('word') || fileType.includes('document')) return <ArticleIcon />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <TableChartIcon />;
    if (fileType.includes('zip') || fileType.includes('compressed')) return <FolderZipIcon />;
    
    return <DescriptionIcon />;
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={loading ? null : onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {request ? 'Edit Request' : 'New Department Request'}
        </DialogTitle>
        
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            {loading && <LinearProgress />}
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                  disabled={loading}
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  multiline
                  rows={6}
                  margin="normal"
                  disabled={loading}
                  placeholder="Provide detailed information about your request..."
                />
                
                <Box mt={3}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    ATTACHMENTS
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {formData.attachments.length > 0 && (
                    <List dense sx={{ mb: 2, maxHeight: 200, overflow: 'auto', bgcolor: 'action.hover', borderRadius: 1, p: 1 }}>
                      {formData.attachments.map((file, index) => (
                        <ListItem 
                          key={index}
                          secondaryAction={
                            <IconButton 
                              edge="end" 
                              aria-label="remove"
                              onClick={() => handleRemoveAttachment(index)}
                              disabled={loading}
                              size="small"
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          }
                          sx={{ pr: 6 }}
                        >
                          <ListItemAvatar>
                            <Avatar>
                              {getFileIcon(file.type)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={file.name}
                            secondary={formatFileSize(file.size)}
                            primaryTypographyProps={{
                              noWrap: true,
                              style: { maxWidth: '300px' }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                  
                  <Box display="flex" alignItems="center" mt={1}>
                    <input
                      accept="*/*"
                      style={{ display: 'none' }}
                      id="request-attachments"
                      type="file"
                      onChange={handleFileChange}
                      disabled={loading}
                    />
                    <label htmlFor="request-attachments">
                      <Button 
                        variant="outlined" 
                        component="span"
                        startIcon={<AttachFileIcon />}
                        disabled={loading}
                      >
                        Add File
                      </Button>
                    </label>
                    
                    {newAttachment && (
                      <Box ml={2} display="flex" alignItems="center">
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {newAttachment.name} ({formatFileSize(newAttachment.size)})
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => setNewAttachment(null)}
                          disabled={loading}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                        <Button 
                          variant="text" 
                          size="small" 
                          onClick={handleAddAttachment}
                          disabled={loading}
                          startIcon={<CheckIcon />}
                        >
                          Add
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Request Type</InputLabel>
                  <Select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    label="Request Type"
                    disabled={loading}
                  >
                    <MenuItem value="general">
                      <Box display="flex" alignItems="center">
                        <DescriptionIcon color="action" sx={{ mr: 1 }} />
                        General Request
                      </Box>
                    </MenuItem>
                    <MenuItem value="equipment">
                      <Box display="flex" alignItems="center">
                        <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                        Equipment
                      </Box>
                    </MenuItem>
                    <MenuItem value="personnel">
                      <Box display="flex" alignItems="center">
                        <PersonIcon color="secondary" sx={{ mr: 1 }} />
                        Personnel
                      </Box>
                    </MenuItem>
                    <MenuItem value="training">
                      <Box display="flex" alignItems="center">
                        <GroupIcon color="info" sx={{ mr: 1 }} />
                        Training
                      </Box>
                    </MenuItem>
                    <MenuItem value="travel">
                      <Box display="flex" alignItems="center">
                        <FlightTakeoffIcon color="action" sx={{ mr: 1 }} />
                        Travel
                      </Box>
                    </MenuItem>
                    <MenuItem value="other">
                      <Box display="flex" alignItems="center">
                        <MoreHorizIcon color="action" sx={{ mr: 1 }} />
                        Other
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    label="Priority"
                    disabled={loading}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Department</InputLabel>
                  <Select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    label="Department"
                    disabled={loading}
                  >
                    <MenuItem value="Engineering">Engineering</MenuItem>
                    <MenuItem value="Design">Design</MenuItem>
                    <MenuItem value="Marketing">Marketing</MenuItem>
                    <MenuItem value="Sales">Sales</MenuItem>
                    <MenuItem value="HR">Human Resources</MenuItem>
                    <MenuItem value="Finance">Finance</MenuItem>
                    <MenuItem value="Operations">Operations</MenuItem>
                    <MenuItem value="IT">Information Technology</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="Due Date"
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  disabled={loading}
                />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Approvers</InputLabel>
                  <Select
                    multiple
                    name="approvers"
                    value={formData.approvers}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        approvers: e.target.value
                      }));
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                    disabled={loading}
                  >
                    <MenuItem value="john.doe@example.com">
                      <Checkbox checked={formData.approvers.indexOf('john.doe@example.com') > -1} />
                      <ListItemText primary="John Doe" secondary="Engineering Manager" />
                    </MenuItem>
                    <MenuItem value="jane.smith@example.com">
                      <Checkbox checked={formData.approvers.indexOf('jane.smith@example.com') > -1} />
                      <ListItemText primary="Jane Smith" secondary="Department Head" />
                    </MenuItem>
                    <MenuItem value="mike.johnson@example.com">
                      <Checkbox checked={formData.approvers.indexOf('mike.johnson@example.com') > -1} />
                      <ListItemText primary="Mike Johnson" secondary="Finance" />
                    </MenuItem>
                  </Select>
                  <FormHelperText>Select one or more approvers</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button 
              onClick={onClose} 
              color="inherit"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading || !formData.title || !formData.description}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Submitting...' : request ? 'Update Request' : 'Submit Request'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DepartmentRequestForm;
