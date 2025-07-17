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
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Skeleton
} from '@mui/material';
import { useTheme, Theme } from '@mui/material/styles';
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
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import notificationService from '../services/notificationService';
import type { Notification as NotificationType } from '../types/notifications';

type TabValue = 'all' | 'unread' | 'archived';

// Helper function to safely map notification types to theme colors
const getNotificationColor = (type: string, theme: Theme): string => {
  type PaletteColorKey = keyof typeof theme.palette;
  type ColorKey = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  
  const colorMap: Record<string, ColorKey> = {
    'success': 'success',
    'error': 'error',
    'warning': 'warning',
    'info': 'info',
    'default': 'primary',
  };

  const colorKey = colorMap[type] || 'primary';
  return (theme.palette[colorKey] as { main: string }).main;
};

// Helper function to safely map notification types to Chip component color prop
const getChipColor = (type: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    'success': 'success',
    'error': 'error',
    'warning': 'warning',
    'info': 'info',
    'document_update': 'info',
    'new_mention': 'secondary',
    'system_alert': 'warning',
    'task_assigned': 'primary'
  };
  
  return colorMap[type] || 'default';
};

const NotificationsPage: React.FC = () => {
  const theme = useTheme();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationType | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  // Load notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const allNotifications = notificationService.getNotifications();
      setNotifications(allNotifications);
      setError(null);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadNotifications();
    
    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((updatedNotifications: NotificationType[]) => {
      setNotifications(updatedNotifications);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') return !notification.read;
    if (activeTab === 'archived') return notification.archived;
    return true;
  });

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, notification: NotificationType) => {
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notification);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNotification(null);
  };

  // Mark notification as read
  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
    showSnackbar('Notification marked as read', 'success');
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    showSnackbar('All notifications marked as read', 'success');
  };

  // Archive notification
  const handleArchive = (id: string) => {
    notificationService.archive(id);
    showSnackbar('Notification archived', 'success');
    handleMenuClose();
  };

  // Delete notification
  const handleDelete = (id: string) => {
    notificationService.remove(id);
    showSnackbar('Notification deleted', 'success');
    handleMenuClose();
  };

  // Show snackbar message
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <Container maxWidth="lg">
        <Skeleton variant="rectangular" width="100%" height={200} />
        <Box mt={2}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">{error}</Alert>
        <Button onClick={loadNotifications} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center">
              <NotificationsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Notifications</Typography>
              <Box flexGrow={1} />
              <Button
                startIcon={<MarkEmailReadIcon />}
                onClick={handleMarkAllAsRead}
                disabled={notifications.every(n => n.read)}
              >
                Mark all as read
              </Button>
            </Box>
          }
        />
        <Divider />
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            aria-label="notification tabs"
          >
            <Tab label={`All (${notifications.length})`} value="all" />
            <Tab 
              label={
                <Badge 
                  badgeContent={notifications.filter(n => !n.read).length} 
                  color="primary"
                >
                  <span>Unread</span>
                </Badge>
              } 
              value="unread" 
            />
            <Tab 
              label={`Archived (${notifications.filter(n => n.archived).length})`} 
              value="archived" 
            />
          </Tabs>
        </Box>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center" 
              minHeight={200}
            >
              <NotificationsNoneIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography color="textSecondary">
                {activeTab === 'all' 
                  ? 'No notifications yet.' 
                  : activeTab === 'unread' 
                    ? 'No unread notifications.'
                    : 'No archived notifications.'}
              </Typography>
            </Box>
          ) : (
            <List>
              {filteredNotifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem 
                    alignItems="flex-start"
                    sx={{
                      bgcolor: notification.read ? 'background.paper' : 'action.hover',
                      borderLeft: `4px solid ${getNotificationColor(notification.type, theme)}`,
                      mb: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="more"
                        onClick={(e) => handleMenuOpen(e, notification)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar>
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          <Typography
                            variant="subtitle1"
                            sx={{ 
                              fontWeight: notification.read ? 'normal' : 'bold',
                              mr: 1 
                            }}
                          >
                            {notification.title}
                          </Typography>
                          <Chip 
                            label={notification.type}
                            size="small"
                            color={getChipColor(notification.type)}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            display="block"
                            mb={1}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Notification Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedNotification && !selectedNotification.read && (
          <MenuItem onClick={() => handleMarkAsRead(selectedNotification.id)}>
            <MarkEmailReadIcon sx={{ mr: 1 }} />
            Mark as read
          </MenuItem>
        )}
        <MenuItem onClick={() => selectedNotification && handleArchive(selectedNotification.id)}>
          <ArchiveIcon sx={{ mr: 1 }} />
          Archive
        </MenuItem>
        <MenuItem onClick={() => selectedNotification && handleDelete(selectedNotification.id)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
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
