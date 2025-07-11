import api from './api';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

const authService = {
  // Login user with email/password
  async login(credentials) {
    try {
      // Convert to form data for OAuth2 compatibility
      const formData = new URLSearchParams();
      formData.append('username', credentials.username); // Changed from email to username to match backend
      formData.append('password', credentials.password);
      
      const response = await api.post('/api/v1/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Store tokens and user data
      this.setAuthTokens({
        access_token: response.access_token,
        expires_at: response.expires_at,
        user: response.user
      });
      
      return { user: response.user, tokens: response };
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  },

  // Register new user
  async register(userData) {
    try {
      // Ensure we're sending the correct fields expected by the backend
      const registrationData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        full_name: userData.full_name || ''
      };
      
      const response = await api.post('/api/v1/auth/register', registrationData);
      
      // Auto-login after registration
      return this.login({
        username: userData.username,
        password: userData.password,
      });
    } catch (error) {
      console.error('Registration error:', error);
      // Extract error message from the response if available
      const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
      throw new Error(errorMessage);
    }
  },

  // Get current user profile
  async getCurrentUser() {
    try {
      const token = this.getAccessToken();
      if (!token) return null;
      
      // If we have a user in local storage and token is not expired, use it
      const userJson = localStorage.getItem(USER_KEY);
      if (userJson) {
        const user = JSON.parse(userJson);
        if (!this.isTokenExpired(token)) {
          return user;
        }
      }
      
      // Get fresh user data from the token
      // Note: This assumes the token contains user info
      // If your backend has a /me endpoint, you can use that instead
      const tokenData = this.parseJwt(token);
      if (tokenData && tokenData.sub) {
        // If you have a /me endpoint, uncomment this:
        // const response = await api.get('/api/v1/auth/me');
        // localStorage.setItem(USER_KEY, JSON.stringify(response));
        // return response;
        
        // For now, return basic user info from token
        const userInfo = {
          username: tokenData.sub,
          // Add other user fields as needed
        };
        localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
        return userInfo;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      this.clearAuth();
      throw error;
    }
  },
  
  // Helper to parse JWT token
  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error parsing JWT:', e);
      return null;
    }
  },

  // Update user profile
  async updateProfile(updates) {
    try {
      const user = await api.put('/auth/me', updates);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch (error) {
      throw error;
    }
  },

  // Change password
  async changePassword({ currentPassword, newPassword }) {
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Request password reset
  async requestPasswordReset(email) {
    try {
      await api.post('/auth/forgot-password', { email });
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Reset password with token
  async resetPassword({ token, email, password, passwordConfirmation }) {
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  async logout() {
    try {
      // Revoke the refresh token on the server
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          await api.post('/auth/revoke', { refresh_token: refreshToken });
        } catch (error) {
          console.error('Error revoking token:', error);
          // Continue with logout even if revoke fails
        }
      }
    } finally {
      this.clearAuth();
      // Use the API service's logout to handle redirection
      api.logout();
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getAccessToken();
  },

  // Get auth headers (for requests that need them)
  getAuthHeader() {
    const token = this.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // Token management
  getAccessToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  
  setAuthTokens({ access_token, expires_at, user }) {
    if (access_token) {
      localStorage.setItem(TOKEN_KEY, access_token);
      
      // Store expiration time in local storage
      if (expires_at) {
        localStorage.setItem('token_expires_at', expires_at);
      }
      
      // Store user data
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      
      // Set default auth header for axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    }
  },

  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('token_expires_at');
    delete api.defaults.headers.common['Authorization'];
  },

  // Check if token is expired
  isTokenExpired(token, bufferMs = 0) {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now();
      const expiresAt = payload.exp * 1000; // Convert to milliseconds
      return expiresAt - bufferMs < now;
    } catch (e) {
      console.error('Error parsing token:', e);
      return true;
    }
  },

  // Check if refresh token is expired
  isRefreshTokenExpired() {
    const refreshToken = this.getRefreshToken();
    return this.isTokenExpired(refreshToken);
  },

  // Refresh the access token
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      this.setAuthTokens({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      });

      return response.access_token;
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  },
};

export default authService;
