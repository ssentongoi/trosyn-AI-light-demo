import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Grid,
  Paper,
  Tab,
  Tabs,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  Close as CloseIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  Description as DescriptionIcon,
  Today as TodayIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

const DepartmentRequestDialog = ({ 
  open, 
  onClose, 
  request,
  onApprove,
  onReject,
  onComment
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('details');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!request) return null;

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCommentChange = (event) => {
    setComment(event.target.value);
  };

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call
      setTimeout(() => {
        onComment(comment);
        setComment('');
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError('Failed to submit comment. Please try again.');
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'approved':
        return <Chip icon={<CheckCircleIcon />} label="Approved" color="success" size="small" />;
      case 'rejected':
        return <Chip icon={<CancelIcon />} label="Rejected" color="error" size="small" />;
      case 'pending':
      default:
        return <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" />;
    }
  };

  const getPriorityChip = (priority) => {
    switch (priority) {
      case 'high':
        return <Chip label="High" color="error" size="small" variant="outlined" />;
      case 'medium':
        return <Chip label="Medium" color="warning" size="small" variant="outlined" />;
      case 'low':
      default:
        return <Chip label="Low" color="success" size="small" variant="outlined" />;
    }
  };

  const getRequestTypeIcon = (type) => {
    switch (type) {
      case 'equipment':
        return <AssignmentIcon color="primary" />;
      case 'personnel':
        return <PersonIcon color="secondary" />;
      case 'training':
        return <GroupIcon color="info" />;
      default:
        return <DescriptionIcon color="action" />;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            {getRequestTypeIcon(request.type)}
            <Box ml={1}>
              <Typography variant="h6" component="div">
                {request.title}
              </Typography>
              <Box display="flex" alignItems="center" mt={0.5}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  {request.id}
                </Typography>
                {getStatusChip(request.status)}
                <Box ml={1}>
                  {getPriorityChip(request.priority)}
                </Box>
              </Box>
            </Box>
          </Box>
          <IconButton 
            edge="end" 
            color="inherit" 
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
      >
        <Tab label="Details" value="details" />
        <Tab 
          label={
            <Box display="flex" alignItems="center">
              Comments
              {request.comments?.length > 0 && (
                <Chip 
                  label={request.comments.length} 
                  size="small" 
                  sx={{ ml: 1, height: 20, minWidth: 20 }} 
                />
              )}
            </Box>
          } 
          value="comments" 
        />
        <Tab 
          label={
            <Box display="flex" alignItems="center">
              Attachments
              {request.attachments?.length > 0 && (
                <Chip 
                  label={request.attachments.length} 
                  size="small" 
                  sx={{ ml: 1, height: 20, minWidth: 20 }} 
                />
              )}
            </Box>
          } 
          value="attachments" 
        />
        <Tab 
          label={
            <Box display="flex" alignItems="center">
              History
              <HistoryIcon fontSize="small" sx={{ ml: 0.5 }} />
            </Box>
          } 
          value="history" 
        />
      </Tabs>

      <DialogContent dividers>
        {activeTab === 'details' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>Request Details</Typography>
              <Typography variant="body1" paragraph>
                {request.description || 'No description provided.'}
              </Typography>
              
              <Box mt={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  ADDITIONAL INFORMATION
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Request Type
                    </Typography>
                    <Typography variant="body1">
                      {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Department
                    </Typography>
                    <Typography variant="body1">
                      {request.department?.name || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(request.created_at), 'PPpp')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })}
                    </Typography>
                  </Grid>
                  {request.due_date && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Due Date
                      </Typography>
                      <Typography variant="body1">
                        {format(new Date(request.due_date), 'PP')}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box mb={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  REQUESTED BY
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box display="flex" alignItems="center">
                  <Avatar 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      mr: 2,
                      bgcolor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      fontSize: '1rem'
                    }}
                  >
                    {request.requester.name.split(' ').map(n => n[0]).join('')}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">
                      {request.requester.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {request.requester.email}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  APPROVERS
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {request.approvers?.length > 0 ? (
                  <List dense>
                    {request.approvers.map((approver, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ 
                              width: 36, 
                              height: 36,
                              bgcolor: approver.status === 'approved' 
                                ? theme.palette.success.main 
                                : approver.status === 'rejected'
                                ? theme.palette.error.main
                                : theme.palette.action.disabledBackground,
                              color: approver.status === 'pending' 
                                ? theme.palette.text.primary 
                                : theme.palette.common.white
                            }}
                          >
                            {approver.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={approver.name}
                          secondary={
                            <>
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.primary"
                                display="block"
                              >
                                {approver.role}
                              </Typography>
                              <Chip 
                                label={approver.status.charAt(0).toUpperCase() + approver.status.slice(1)}
                                size="small"
                                color={
                                  approver.status === 'approved' 
                                    ? 'success' 
                                    : approver.status === 'rejected' 
                                    ? 'error' 
                                    : 'default'
                                }
                                variant="outlined"
                                sx={{ mt: 0.5 }}
                              />
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No approvers assigned
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        )}
        
        {activeTab === 'comments' && (
          <Box>
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>Comments</Typography>
              {request.comments?.length > 0 ? (
                <List>
                  {request.comments.map((comment, index) => (
                    <React.Fragment key={index}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar>
                            {comment.user.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <>
                              <Typography
                                component="span"
                                variant="subtitle2"
                                color="text.primary"
                              >
                                {comment.user.name}
                              </Typography>
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                                sx={{ ml: 1 }}
                              >
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </Typography>
                            </>
                          }
                          secondary={
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                              sx={{ display: 'inline' }}
                            >
                              {comment.text}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < request.comments.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={4}>
                  <CommentIcon fontSize="large" color="disabled" sx={{ mb: 1 }} />
                  <Typography variant="body1" color="text.secondary">
                    No comments yet. Be the first to comment!
                  </Typography>
                </Box>
              )}
            </Box>
            
            <Box mt={4}>
              <Typography variant="subtitle1" gutterBottom>
                Add a comment
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                placeholder="Type your comment here..."
                value={comment}
                onChange={handleCommentChange}
                disabled={loading}
              />
              <Box display="flex" justifyContent="flex-end" mt={1}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CommentIcon />}
                  onClick={handleSubmitComment}
                  disabled={!comment.trim() || loading}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? 'Posting...' : 'Post Comment'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
        
        {activeTab === 'attachments' && (
          <Box>
            <Typography variant="h6" gutterBottom>Attachments</Typography>
            {request.attachments?.length > 0 ? (
              <List>
                {request.attachments.map((file, index) => (
                  <React.Fragment key={index}>
                    <ListItem 
                      button
                      component="a"
                      href={`#download-${file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <AttachFileIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={file.name}
                        secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="download">
                          <DownloadIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < request.attachments.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box textAlign="center" py={4}>
                <AttachFileIcon fontSize="large" color="disabled" sx={{ mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  No attachments
                </Typography>
              </Box>
            )}
          </Box>
        )}
        
        {activeTab === 'history' && (
          <Box>
            <Typography variant="h6" gutterBottom>Request History</Typography>
            {request.history?.length > 0 ? (
              <List>
                {request.history.map((event, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          {event.action === 'created' && <AddIcon />}
                          {event.action === 'approved' && <CheckIcon />}
                          {event.action === 'rejected' && <ClearIcon />}
                          {event.action === 'commented' && <CommentIcon />}
                          {event.action === 'updated' && <EditIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <>
                            <Typography
                              component="span"
                              variant="subtitle2"
                              color="text.primary"
                            >
                              {event.user.name}
                            </Typography>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              {event.action} this request
                            </Typography>
                          </>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {format(new Date(event.timestamp), 'PPpp')}
                            {event.metadata?.reason && (
                              <Box component="span" ml={1}>
                                - {event.metadata.reason}
                              </Box>
                            )}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < request.history.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box textAlign="center" py={4}>
                <HistoryIcon fontSize="large" color="disabled" sx={{ mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  No history available
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {request.status === 'pending' && (
          <>
            <Button 
              variant="outlined" 
              color="error"
              startIcon={<ClearIcon />}
              onClick={() => {
                const reason = prompt('Please provide a reason for rejection:');
                if (reason) onReject(reason);
              }}
            >
              Reject
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<CheckIcon />}
              onClick={onApprove}
            >
              Approve
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DepartmentRequestDialog;
