import api from './api';

// User Management API Service

/**
 * Fetch all users with optional pagination and filters
 * @param {Object} params - Query parameters (page, limit, search, role, status, verified)
 * @returns {Promise<Object>} - Paginated user data
 */
export const getUsers = async (params = {}) => {
  try {
    const response = await api.get('/admin/users', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Fetch a single user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data
 */
export const getUser = async (userId) => {
  try {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

/**
 * Create a new user
 * @param {Object} userData - User data to create
 * @returns {Promise<Object>} - Created user data
 */
export const createUser = async (userData) => {
  try {
    const response = await api.post('/admin/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update an existing user
 * @param {string} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} - Updated user data
 */
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
};

/**
 * Delete a user
 * @param {string} userId - User ID to delete
 * @returns {Promise<Object>} - Deletion status
 */
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};

/**
 * Update user status (active/suspended)
 * @param {string} userId - User ID
 * @param {boolean} isActive - New status
 * @returns {Promise<Object>} - Update status
 */
export const updateUserStatus = async (userId, isActive) => {
  try {
    const response = await api.patch(`/admin/users/${userId}/status`, { isActive });
    return response.data;
  } catch (error) {
    console.error(`Error updating status for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Reset user password (admin-initiated)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Reset status and temporary password
 */
export const resetUserPassword = async (userId) => {
  try {
    const response = await api.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  } catch (error) {
    console.error(`Error resetting password for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Update user roles and permissions
 * @param {string} userId - User ID
 * @param {Array<string>} roles - Array of role IDs
 * @param {Object} permissions - Permissions object
 * @returns {Promise<Object>} - Update status
 */
export const updateUserRoles = async (userId, roles, permissions = {}) => {
  try {
    const response = await api.put(`/admin/users/${userId}/roles`, { roles, permissions });
    return response.data;
  } catch (error) {
    console.error(`Error updating roles for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get user activity logs
 * @param {string} userId - User ID
 * @param {Object} params - Query parameters (page, limit, type, dateFrom, dateTo)
 * @returns {Promise<Object>} - Paginated activity logs
 */
export const getUserActivity = async (userId, params = {}) => {
  try {
    const response = await api.get(`/admin/users/${userId}/activity`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching activity for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get available user roles
 * @returns {Promise<Array>} - List of available roles
 */
export const getUserRoles = async () => {
  try {
    const response = await api.get('/admin/roles');
    return response.data;
  } catch (error) {
    console.error('Error fetching user roles:', error);
    throw error;
  }
};

/**
 * Get user statistics
 * @returns {Promise<Object>} - User statistics
 */
export const getUserStats = async () => {
  try {
    const response = await api.get('/admin/users/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
};

export default {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  resetUserPassword,
  updateUserRoles,
  getUserActivity,
  getUserRoles,
  getUserStats,
};
