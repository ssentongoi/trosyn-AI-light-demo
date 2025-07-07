import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  Avatar,
  Badge,
  Button,
  Chip,
  useTheme,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  NotificationsNone as NotificationsNoneIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

// Mock data - replace with API calls
const mockNotifications = [
  {
    id: 1,
    title: 'New message from John',
    message: 'Hey, just wanted to check in about the project deadline.',
    type: 'message',
    read: false,
    date: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    priority: 'high',
    sender: { name: 'John Doe', avatar: 'JD' }
  },
  {
    id: 2,
    title: 'Document approved',
    message: 'Your document "Q2 Report" has been approved by the manager.',
    type: 'approval',
    read: false,
    date: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    priority: 'medium',
    document: { id: 123, title: 'Q2 Report' }
  },
  {
    id: 3,
    title: 'System update available',
    message: 'A new version of the application is available. Please update when possible.',
    type: 'system',
    read: true,
    date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    priority: 'low'
  },
  {
    id: 4,
    title: 'New comment on your post',
    message: 'Sarah commented on your project update: "Great progress! Looking forward to the next steps."',
    type: 'comment',
    read: true,
    date: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    priority: 'medium',
    sender: { name: 'Sarah Johnson', avatar: 'SJ' }
  },
  {
    id: 5,
    title: 'Meeting reminder',
    message: 'Team sync meeting starts in 15 minutes. Join here: [meeting link]',
    type: 'reminder',
    read: false,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    priority: 'high'
  }
];

const NotificationsPage = () => {
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await notificationService.getNotifications();
        // setNotifications(response.data);
        
        // Mock data
        setTimeout(() => {
          setNotifications(mockNotifications);
          setLoading(false);
        }, 800);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications. Please try again.');
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleMenuOpen = (event, notification) => {
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notification);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNotification(null);
  };

  const handleMarkAsRead = (notification) => {
    // TODO: Implement mark as read
    const updatedNotifications = notifications.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
    setSnackbar({
      open: true,
      message: 'Notification marked as read',
      severity: 'success'
    });
    handleMenuClose();
  };

  const handleMarkAllAsRead = () => {
    // TODO: Implement mark all as read
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    setSnackbar({
      open: true,
      message: 'All notifications marked as read',
      severity: 'success'
    });
  };

  const handleDelete = (notification) => {
    // TODO: Implement delete
    const updatedNotifications = notifications.filter(n => n.id !== notification.id);
    setNotifications(updatedNotifications);
    setSnackbar({
      open: true,
      message: 'Notification deleted',
      severity: 'info'
    });
    handleMenuClose();
  };

  const handleDeleteAll = () => {
    // TODO: Implement delete all
    setNotifications([]);
    setSnackbar({
      open: true,
      message: 'All notifications cleared',
      severity: 'info'
    });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getFilteredNotifications = () => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'unread') return notifications.filter(n => !n.read);
    if (activeTab === 'messages') return notifications.filter(n => n.type === 'message');
    if (activeTab === 'system') return notifications.filter(n => n.type === 'system');
    return notifications;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <MarkEmailReadIcon color="primary" />;
      case 'approval':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'system':
        return <InfoIcon color="info" />;
      default:
        return <NotificationsIcon color="action" />;
    }
  };

  const getPriorityChip = (priority) => {
    switch (priority) {
      case 'high':
        return <Chip label="High" size="small" color="error" variant="outlined" />;
      case 'medium':
        return <Chip label="Medium" size="small" color="warning" variant="outlined" />;
      case 'low':
        return <Chip label="Low" size="small" color="success" variant="outlined" />;
      default:
        return null;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center">
            <NotificationsIcon sx={{ mr: 1, fontSize: 32 }} />
            <Typography variant="h4" component="h1">
              Notifications
              {unreadCount > 0 && (
                <Chip 
                  label={`${unreadCount} unread`} 
                  color="primary" 
                  size="small" 
                  sx={{ ml: 2, fontWeight: 'bold' }} 
                />
              )}
            </Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<MarkEmailReadIcon />}
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              sx={{ mr: 1 }}
            >
              Mark all as read
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteAll}
              disabled={notifications.length === 0}
            >
              Clear all
            </Button>
          </Box>
        </Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          <Tab label="All" value="all" />
          <Tab 
            label={
              <Box display="flex" alignItems="center">
                Unread
                {unreadCount > 0 && (
                  <Chip 
                    label={unreadCount} 
                    size="small" 
                    color="primary"
                    sx={{ ml: 1, height: 20, minWidth: 20 }} 
                  />
                )}
              </Box>
            } 
            value="unread" 
          />
          <Tab label="Messages" value="messages" />
          <Tab label="System" value="system" />
        </Tabs>
      </Box>

      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center">
              <FilterListIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                {activeTab === 'all' && 'All Notifications'}
                {activeTab === 'unread' && 'Unread Notifications'}
                {activeTab === 'messages' && 'Messages'}
                {activeTab === 'system' && 'System Notifications'}
              </Typography>
            </Box>
          }
        />
        <Divider />
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box textAlign="center" p={4}>
              <NotificationsNoneIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No notifications found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {activeTab === 'unread' 
                  ? 'You have no unread notifications' 
                  : 'When you get notifications, they will appear here'}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredNotifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem 
                    alignItems="flex-start"
                    sx={{
                      bgcolor: notification.read ? 'background.paper' : 'action.hover',
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: 'background-color 0.2s',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleMarkAsRead(notification)}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent' }}>
                        {notification.sender?.avatar ? (
                          <Avatar>{notification.sender.avatar}</Avatar>
                        ) : (
                          getNotificationIcon(notification.type)
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          <Typography
                            component="span"
                            variant="subtitle1"
                            color={notification.read ? 'text.primary' : 'primary.main'}
                            sx={{ fontWeight: notification.read ? 'normal' : 'bold', mr: 1 }}
                          >
                            {notification.title}
                          </Typography>
                          {getPriorityChip(notification.priority)}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            display="block"
                            sx={{ mt: 0.5 }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.5 }}
                          >
                            {formatDistanceToNow(new Date(notification.date), { addSuffix: true })}
                          </Typography>
                        </>
                      }
                      disableTypography={false}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="more"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, notification);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Notification Actions Menu */}
      <Menu
        id="notification-actions-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleMarkAsRead(selectedNotification)}>
          <MarkEmailReadIcon sx={{ mr: 1 }} />
          Mark as read
        </MenuItem>
        <MenuItem onClick={() => handleDelete(selectedNotification)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Snackbar for notifications */}
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
    </Container>
  );
};

export default NotificationsPage;
