import api from './api';
import { EventEmitter } from 'events';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useCallback, useEffect, useRef } from 'react';

// Create an event emitter instance for real-time notifications
const notificationEmitter = new EventEmitter();

// Create a custom hook for notification service
const useNotificationService = () => {
  const { isConnected, sendMessage, on: wsOn } = useWebSocketContext();
  const isInitialized = useRef(false);

  // Initialize WebSocket event listeners
  useEffect(() => {
    if (!isInitialized.current && isConnected) {
      // Handle incoming notifications
      const handleNotification = (message) => {
        notificationEmitter.emit('notification', message);
        
        // Emit specific event based on notification type
        if (message.type) {
          notificationEmitter.emit(message.type, message);
        }
      };
      
      // Subscribe to all messages
      const cleanup = wsOn('*', handleNotification);
      
      // Mark as initialized
      isInitialized.current = true;
      
      // Cleanup on unmount
      return () => {
        cleanup();
        isInitialized.current = false;
      };
    }
  }, [isConnected, wsOn]);

  // Send a notification through WebSocket
  const sendNotification = useCallback((type, data = {}) => {
    return sendMessage({
      type,
      ...data,
      timestamp: new Date().toISOString()
    });
  }, [sendMessage]);

  // Subscribe to a specific notification type
  const subscribe = useCallback((type, callback) => {
    notificationEmitter.on(type, callback);
    // Return cleanup function
    return () => {
      notificationEmitter.off(type, callback);
    };
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((recipientId, isTyping = true) => {
    return sendNotification('typing', {
      recipient_id: recipientId,
      is_typing: isTyping
    });
  }, [sendNotification]);

  // Send a direct message
  const sendDirectMessage = useCallback((recipientId, message) => {
    return sendNotification('message', {
      recipient_id: recipientId,
      message
    });
  }, [sendNotification]);

  // Subscribe to a channel or topic
  const subscribeToChannel = useCallback((channel) => {
    return sendNotification('subscribe', {
      channel
    });
  }, [sendNotification]);

  return {
    // Connection status
    isConnected,
    
    // Event emitter methods
    on: (event, listener) => {
      notificationEmitter.on(event, listener);
      return () => notificationEmitter.off(event, listener);
    },
    off: (event, listener) => notificationEmitter.off(event, listener),
    once: (event, listener) => notificationEmitter.once(event, listener),
    
    // Notification methods
    send: sendNotification,
    subscribe,
    sendTypingIndicator,
    sendDirectMessage,
    subscribeToChannel,
    
    // For compatibility with existing code
    connect: () => {}, // No-op, connection is managed by WebSocketProvider
    disconnect: () => {}, // No-op, connection is managed by WebSocketProvider
  };
};

const notificationService = {
  /**
   * Initialize notification service
   * @param {string} token - Authentication token
   */
  initialize(token) {
    if (token) {
      // No-op, connection is managed by WebSocketProvider
    }
  },

  /**
   * Subscribe to notifications
   * @param {Function} callback - Callback function for notifications
   * @param {string} [type] - Optional notification type to filter by
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback, type = null) {
    const eventType = type || 'notification';
    notificationEmitter.on(eventType, callback);
    
    // Return unsubscribe function
    return () => {
      notificationEmitter.off(eventType, callback);
    };
  },

  /**
   * Get all notifications
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} List of notifications
   */
  async getNotifications(params = {}) {
    const response = await api.get('/notifications', { params });
    return response;
  },

  /**
   * Get unread notifications count
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount() {
    const response = await api.get('/notifications/unread/count');
    return response.count || 0;
  },

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId) {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response;
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} Result of the operation
   */
  async markAllAsRead() {
    const response = await api.put('/notifications/read-all');
    return response;
  },

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Result of the operation
   */
  async deleteNotification(notificationId) {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response;
  },

  /**
   * Clear all notifications
   * @returns {Promise<Object>} Result of the operation
   */
  async clearAll() {
    const response = await api.delete('/notifications');
    return response;
  },

  /**
   * Get notification preferences
   * @returns {Promise<Object>} Notification preferences
   */
  async getPreferences() {
    const response = await api.get('/notifications/preferences');
    return response;
  },

  /**
   * Update notification preferences
   * @param {Object} preferences - New preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updatePreferences(preferences) {
    const response = await api.put('/notifications/preferences', preferences);
    return response;
  },

  /**
   * Test notification
   * @param {string} type - Notification type
   * @returns {Promise<Object>} Test result
   */
  async testNotification(type) {
    const response = await api.post('/notifications/test', { type });
    return response;
  },

  /**
   * Get notification types
   * @returns {Promise<Array>} List of available notification types
   */
  async getNotificationTypes() {
    const response = await api.get('/notifications/types');
    return response;
  },

  /**
   * Send a notification to specific users
   * @param {Object} data - Notification data
   * @param {Array} userIds - Array of user IDs to notify
   * @returns {Promise<Object>} Result of the operation
   */
  async sendToUsers(data, userIds) {
    const response = await api.post('/notifications/send', {
      ...data,
      target: 'users',
      userIds,
    });
    return response;
  },

  /**
   * Send a notification to all users
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} Result of the operation
   */
  async broadcast(data) {
    const response = await api.post('/notifications/broadcast', data);
    return response;
  },

  /**
   * Disconnect WebSocket connection
   */
  disconnect() {
    if (socket) {
      socket.close();
      socket = null;
    }
  },
};

// Export the event emitter for direct access if needed
export { notificationEmitter };

export default notificationService;
