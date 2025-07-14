import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Typography, 
  Badge, 
  IconButton, 
  Popover, 
  Divider, 
  Button,
  useTheme,
  CircularProgress,
  Paper,
  Tooltip
} from '@mui/material';
import { 
  Notifications as NotificationsIcon, 
  Check as CheckIcon, 
  Close as CloseIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  NotificationsNone as NotificationsNoneIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { Notification } from '../../types/notifications';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationCenterProps {
  maxNotifications?: number;
  autoClose?: number;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  maxNotifications = 10,
  autoClose = 5000,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isConnected, sendMessage } = useWebSocket();
  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  // Handle new notifications from WebSocket
  useEffect(() => {
    if (!isConnected) return;
    
    const handleNewNotification = (message: any) => {
      if (message.type === 'notification') {
        const newNotification: Notification = {
          id: message.id || Date.now().toString(),
          title: message.title || 'New Notification',
          message: message.message || '',
          type: message.notificationType || 'info',
          timestamp: message.timestamp || new Date().toISOString(),
          read: false,
          action: message.action,
          data: message.data
        };
        
        setNotifications(prev => {
          const updated = [newNotification, ...prev].slice(0, maxNotifications);
          return updated;
        });
        
        setUnreadCount(prev => prev + 1);
        
        // Auto-close notification after delay
        if (autoClose > 0) {
          setTimeout(() => {
            handleMarkAsRead(newNotification.id);
          }, autoClose);
        }
      }
    };
    
    // Subscribe to notification messages
    sendMessage({
      type: 'subscribe',
      channel: 'notifications'
    });
    
    // Set up message handler
    const unsubscribe = (window as any).__webSocketHandlers?.set('notification', handleNewNotification);
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      
      // Unsubscribe from notifications
      sendMessage({
        type: 'unsubscribe',
        channel: 'notifications'
      });
    };
  }, [isConnected, sendMessage, autoClose, maxNotifications]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setUnreadCount(0);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
    
    // Send read receipt to server
    sendMessage({
      type: 'notification_read',
      notificationId: id
    });
  }, [sendMessage]);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({
        ...notification,
        read: true
      }))
    );
    
    // Mark all as read on server
    sendMessage({
      type: 'mark_all_read'
    });
  }, [sendMessage]);

  const handleClearAll = useCallback(() => {
    setNotifications([]);
    
    // Clear all notifications on server
    sendMessage({
      type: 'clear_notifications'
    });
  }, [sendMessage]);

  const getNotificationIcon = (type: NotificationType) => {
    const iconStyle = { fontSize: 20 };
    
    switch (type) {
      case 'success':
        return <CheckIcon color="success" style={iconStyle} />;
      case 'error':
        return <ErrorIcon color="error" style={iconStyle} />;
      case 'warning':
        return <WarningIcon color="warning" style={iconStyle} />;
      case 'info':
      default:
        return <InfoIcon color="info" style={iconStyle} />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'info':
      default:
        return theme.palette.info.main;
    }
  };

  const hasUnread = unreadCount > 0;
  const hasNotifications = notifications.length > 0;

  return (
    <Box>
      <Tooltip title="Notifications">
        <IconButton 
          aria-label={hasUnread ? `${unreadCount} unread notifications` : 'No new notifications'}
          aria-describedby={id}
          onClick={handleClick}
          color="inherit"
          size="large"
        >
          <Badge badgeContent={unreadCount} color="error" overlap="rectangular">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          style: {
            width: 360,
            maxHeight: '80vh',
            overflow: 'hidden',
          },
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
          <Typography variant="h6" component="div">
            Notifications
          </Typography>
          <Box>
            {hasNotifications && (
              <Button 
                size="small" 
                onClick={handleMarkAllAsRead}
                disabled={!notifications.some(n => !n.read)}
              >
                Mark all as read
              </Button>
            )}
            <Button 
              size="small" 
              onClick={handleClearAll}
              disabled={!hasNotifications}
              color="error"
            >
              Clear all
            </Button>
          </Box>
        </Box>
        
        <Divider />
        
        <Box sx={{ overflowY: 'auto', maxHeight: 'calc(80vh - 120px)' }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Box p={2} textAlign="center" color="error.main">
              <Typography color="error">{error}</Typography>
              <Button 
                variant="outlined" 
                color="error" 
                size="small" 
                onClick={() => window.location.reload()}
                sx={{ mt: 1 }}
              >
                Retry
              </Button>
            </Box>
          ) : !hasNotifications ? (
            <Box p={3} textAlign="center">
              <NotificationsNoneIcon color="action" fontSize="large" />
              <Typography variant="body2" color="textSecondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem 
                    alignItems="flex-start"
                    sx={{
                      bgcolor: notification.read ? 'background.paper' : 'action.hover',
                      borderLeft: `4px solid ${getNotificationColor(notification.type as NotificationType)}`,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent' }}>
                        {getNotificationIcon(notification.type as NotificationType)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" component="span">
                            {notification.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="textPrimary"
                            display="block"
                            gutterBottom
                          >
                            {notification.message}
                          </Typography>
                          {notification.action && (
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                              onClick={() => {
                                if (notification.action) {
                                  // Execute action if provided
                                  notification.action(notification.data);
                                }
                                handleMarkAsRead(notification.id);
                              }}
                              sx={{ mt: 1 }}
                            >
                              {notification.actionLabel || 'View'}
                            </Button>
                          )}
                        </>
                      }
                      onClick={() => handleMarkAsRead(notification.id)}
                      sx={{ cursor: 'pointer' }}
                    />
                    <IconButton 
                      size="small" 
                      edge="end" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      sx={{ ml: 1 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
        
        {hasNotifications && (
          <Box p={1} textAlign="center" bgcolor="background.default">
            <Button 
              size="small" 
              fullWidth 
              onClick={handleClose}
            >
              Close
            </Button>
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default React.memo(NotificationCenter);
