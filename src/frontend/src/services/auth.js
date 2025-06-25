import api from './api';

const authService = {
  // Login user
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response;
  },

  // Register new user
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response;
  },

  // Get current user profile
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response;
  },

  // Update user profile
  async updateProfile(updates) {
    const response = await api.put('/auth/me', updates);
    return response;
  },

  // Change password
  async changePassword({ currentPassword, newPassword }) {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response;
  },

  // Request password reset
  async requestPasswordReset(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response;
  },

  // Reset password with token
  async resetPassword({ token, email, password, passwordConfirmation }) {
    const response = await api.post('/auth/reset-password', {
      token,
      email,
      password,
      password_confirmation: passwordConfirmation
    });
    return response;
  },

  // Logout (client-side only)
  logout() {
    // Note: This is client-side only. The server should invalidate the token.
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  // Get auth headers (for requests that need them)
  getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

export default authService;
