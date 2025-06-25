import api from './api';
import { EventEmitter } from 'events';

// Create an event emitter instance for real-time notifications
const notificationEmitter = new EventEmitter();

// WebSocket connection for real-time updates
let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 5000; // 5 seconds

/**
 * Connect to the WebSocket server for real-time notifications
 * @param {string} token - Authentication token
 * @param {Function} onReconnect - Callback when reconnected
 */
const connectWebSocket = (token, onReconnect = null) => {
  if (socket) {
    socket.close();
  }

  // Get WebSocket URL from environment or use default
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = process.env.REACT_APP_WS_URL || `${wsProtocol}//${window.location.host}`;
  
  try {
    socket = new WebSocket(`${wsUrl}/ws/notifications?token=${token}`);

    socket.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      
      if (onReconnect && typeof onReconnect === 'function') {
        onReconnect();
      }
    };

    socket.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        notificationEmitter.emit('notification', notification);
        
        // Emit specific event based on notification type
        if (notification.type) {
          notificationEmitter.emit(notification.type, notification);
        }
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event);
      
      // Attempt to reconnect if not closed normally
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
        
        setTimeout(() => {
          connectWebSocket(token, onReconnect);
        }, reconnectDelay * reconnectAttempts);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
  }
};

const notificationService = {
  /**
   * Initialize notification service
   * @param {string} token - Authentication token
   */
  initialize(token) {
    if (token) {
      connectWebSocket(token);
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
