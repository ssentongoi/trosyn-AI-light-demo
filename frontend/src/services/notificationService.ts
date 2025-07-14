import { createWebSocketMessage } from '../utils/websocketUtils';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useCallback, useEffect, useRef } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  action?: (data?: any) => void;
  actionLabel?: string;
  data?: any;
}

interface NotificationOptions {
  /** Time in milliseconds before the notification auto-dismisses (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Callback when the notification is clicked */
  onClick?: (notification: Notification) => void;
  /** Additional data to include with the notification */
  data?: any;
  /** Label for the action button */
  actionLabel?: string;
  /** Action to perform when the action button is clicked */
  onAction?: (notification: Notification) => void;
}

interface NotificationService {
  /** Show a notification */
  show: (
    title: string,
    message: string,
    type?: NotificationType,
    options?: NotificationOptions
  ) => string;
  
  /** Close a notification by ID */
  close: (id: string) => void;
  
  /** Close all notifications */
  closeAll: () => void;
  
  /** Mark a notification as read */
  markAsRead: (id: string) => void;
  
  /** Mark all notifications as read */
  markAllAsRead: () => void;
  
  /** Clear all notifications */
  clear: () => void;
  
  /** Subscribe to notification changes */
  subscribe: (callback: (notifications: Notification[]) => void) => () => void;
  
  /** Get all notifications */
  getNotifications: () => Notification[];
}

// Default options for notifications
const DEFAULT_OPTIONS: Required<NotificationOptions> = {
  autoDismiss: 5000,
  onClick: () => {},
  data: null,
  actionLabel: 'View',
  onAction: () => {},
};

// Create a notification service instance
const createNotificationService = (): NotificationService => {
  let notifications: Notification[] = [];
  const subscribers: Set<(notifications: Notification[]) => void> = new Set();
  
  const notifySubscribers = () => {
    subscribers.forEach(callback => callback([...notifications]));
  };
  
  return {
    show: (title, message, type = 'info', options = {}) => {
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
      const id = Math.random().toString(36).substr(2, 9);
      
      const notification: Notification = {
        id,
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false,
        action: mergedOptions.onAction,
        actionLabel: mergedOptions.actionLabel,
        data: mergedOptions.data,
      };
      
      notifications = [notification, ...notifications];
      notifySubscribers();
      
      // Auto-dismiss if configured
      if (mergedOptions.autoDismiss > 0) {
        setTimeout(() => {
          this.close(id);
        }, mergedOptions.autoDismiss);
      }
      
      return id;
    },
    
    close: (id: string) => {
      notifications = notifications.filter(n => n.id !== id);
      notifySubscribers();
    },
    
    closeAll: () => {
      notifications = [];
      notifySubscribers();
    },
    
    markAsRead: (id: string) => {
      notifications = notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      notifySubscribers();
    },
    
    markAllAsRead: () => {
      notifications = notifications.map(n => ({ ...n, read: true }));
      notifySubscribers();
    },
    
    clear: () => {
      notifications = [];
      notifySubscribers();
    },
    
    subscribe: (callback) => {
      subscribers.add(callback);
      // Initial call with current notifications
      callback([...notifications]);
      
      // Return unsubscribe function
      return () => {
        subscribers.delete(callback);
      };
    },
    
    getNotifications: () => [...notifications],
  };
};

// Global notification service instance
export const notificationService = createNotificationService();

// React hook for using the notification service
export const useNotificationService = () => {
  const { sendMessage, isConnected, lastMessage } = useWebSocket();
  const notificationRef = useRef(notificationService);
  
  // Handle incoming WebSocket notifications
  useEffect(() => {
    if (!isConnected || !lastMessage) return;
    
    const handleIncomingNotification = (message: any) => {
      if (message.type === 'notification') {
        notificationService.show(
          message.title || 'New Notification',
          message.message || '',
          message.type || 'info',
          {
            data: message.data,
            actionLabel: message.actionLabel,
            onAction: message.action ? () => {
              // Handle action if needed
              if (message.action === 'navigate' && message.target) {
                // Example: Navigate to a specific route
                // history.push(message.target);
              }
            } : undefined,
          }
        );
      }
    };
    
    // Check if this is a notification message
    if (lastMessage.type === 'notification') {
      handleIncomingNotification(lastMessage);
    }
    
  }, [isConnected, lastMessage]);
  
  // Show a notification
  const showNotification = useCallback((
    title: string,
    message: string,
    type: NotificationType = 'info',
    options: Omit<NotificationOptions, 'onAction'> = {}
  ) => {
    // If WebSocket is connected, send the notification through WebSocket
    if (isConnected) {
      sendMessage(
        createWebSocketMessage('notification', {
          title,
          message,
          type,
          ...options,
        })
      );
    }
    
    // Also show it locally
    return notificationRef.current.show(title, message, type, {
      ...options,
      onAction: options.onClick,
    });
  }, [isConnected, sendMessage]);
  
  // Create a wrapped version of the notification service with WebSocket integration
  return {
    ...notificationRef.current,
    show: showNotification,
    isConnected,
  };
};

// Export the notification service as default
export default notificationService;
