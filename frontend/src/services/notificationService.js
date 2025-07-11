import api from './api';

/**
 * Notification service for handling notification-related API calls
 */
const notificationService = {
  /**
   * Get all notifications with optional filtering and pagination
   * @param {Object} params - Query parameters (page, limit, read, type, etc.)
   * @returns {Promise<Array>} List of notifications
   */
  async getNotifications(params = {}) {
    try {
      const response = await api.get('/api/v1/notifications', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  /**
   * Get a single notification by ID
   * @param {string|number} id - Notification ID
   * @returns {Promise<Object>} Notification details
   */
  async getNotificationById(id) {
    try {
      const response = await api.get(`/api/v1/notifications/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching notification ${id}:`, error);
      throw error;
    }
  },

  /**
   * Mark a notification as read
   * @param {string|number} id - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(id) {
    try {
      const response = await api.patch(`/api/v1/notifications/${id}/read`, { read: true });
      return response.data;
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} Status of the operation
   */
  async markAllAsRead() {
    try {
      const response = await api.patch('/api/v1/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  /**
   * Delete a notification
   * @param {string|number} id - Notification ID
   * @returns {Promise<Object>} Deletion status
   */
  async deleteNotification(id) {
    try {
      const response = await api.delete(`/api/v1/notifications/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting notification ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete all notifications
   * @returns {Promise<Object>} Status of the operation
   */
  async deleteAllNotifications() {
    try {
      const response = await api.delete('/api/v1/notifications');
      return response.data;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  },

  /**
   * Get unread notifications count
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount() {
    try {
      const response = await api.get('/api/v1/notifications/unread-count');
      return response.data.count;
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time notifications
   * @param {Function} callback - Callback function to handle incoming notifications
   * @returns {Function} Unsubscribe function
   */
  subscribeToNotifications(callback) {
    // TODO: Implement WebSocket or Server-Sent Events for real-time notifications
    // This is a placeholder for the actual implementation
    console.log('Subscribed to real-time notifications');
    
    // Return unsubscribe function
    return () => {
      console.log('Unsubscribed from real-time notifications');
    };
  }
};

export default notificationService;
