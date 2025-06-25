import api from './api';

const userService = {
  // Get all users (admin only)
  async getAllUsers(params = {}) {
    const response = await api.get('/users', { params });
    return response;
  },

  // Get current user profile
  async getProfile() {
    const response = await api.get('/users/me');
    return response;
  },

  // Update user profile
  async updateProfile(userId, updates) {
    const response = await api.put(`/users/${userId}`, updates);
    return response;
  },

  // Delete user (admin or self)
  async deleteUser(userId) {
    const response = await api.delete(`/users/${userId}`);
    return response;
  },

  // Update user role (admin only)
  async updateUserRole(userId, role) {
    const response = await api.put(`/users/${userId}/role`, { role });
    return response;
  },

  // Update user status (active/inactive)
  async updateUserStatus(userId, isActive) {
    const response = await api.put(`/users/${userId}/status`, { is_active: isActive });
    return response;
  },

  // Get user activity
  async getUserActivity(userId, params = {}) {
    const response = await api.get(`/users/${userId}/activity`, { params });
    return response;
  },

  // Get user permissions
  async getUserPermissions(userId) {
    const response = await api.get(`/users/${userId}/permissions`);
    return response;
  },

  // Update user permissions (admin only)
  async updateUserPermissions(userId, permissions) {
    const response = await api.put(`/users/${userId}/permissions`, { permissions });
    return response;
  },

  // Search users
  async searchUsers(query, params = {}) {
    const response = await api.get('/users/search', { 
      params: { query, ...params } 
    });
    return response;
  },

  // Upload user avatar
  async uploadAvatar(userId, file) {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response;
  },

  // Get user preferences
  async getUserPreferences(userId) {
    const response = await api.get(`/users/${userId}/preferences`);
    return response;
  },

  // Update user preferences
  async updateUserPreferences(userId, preferences) {
    const response = await api.put(`/users/${userId}/preferences`, preferences);
    return response;
  },

  // Get user sessions
  async getUserSessions(userId) {
    const response = await api.get(`/users/${userId}/sessions`);
    return response;
  },

  // Revoke user session
  async revokeUserSession(userId, sessionId) {
    const response = await api.delete(`/users/${userId}/sessions/${sessionId}`);
    return response;
  },

  // Get user notifications
  async getUserNotifications(userId, params = {}) {
    const response = await api.get(`/users/${userId}/notifications`, { params });
    return response;
  },

  // Mark notification as read
  async markNotificationAsRead(userId, notificationId) {
    const response = await api.put(`/users/${userId}/notifications/${notificationId}/read`);
    return response;
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId) {
    const response = await api.put(`/users/${userId}/notifications/read-all`);
    return response;
  },

  // Get user tasks
  async getUserTasks(userId, params = {}) {
    const response = await api.get(`/users/${userId}/tasks`, { params });
    return response;
  },

  // Update user task status
  async updateUserTaskStatus(userId, taskId, status) {
    const response = await api.put(`/users/${userId}/tasks/${taskId}/status`, { status });
    return response;
  },
};

export default userService;
