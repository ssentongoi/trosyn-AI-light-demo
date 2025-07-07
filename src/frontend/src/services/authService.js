import axios from 'axios';

/**
 * Authentication service for handling JWT tokens and API authentication
 */

// Get the authentication token from local storage
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Set the authentication token in local storage
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

// Get the authorization header for API requests
export const getAuthHeader = () => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Check if the user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    // In a real app, you would also verify the token's expiration
    // This is a simplified version
    return true;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
};

// Log out the user
export const logout = () => {
  localStorage.removeItem('authToken');
  // Redirect to login page
  window.location.href = '/login';
};

// Handle API authentication errors
export const handleAuthError = (error) => {
  if (error.response && error.response.status === 401) {
    // Token expired or invalid
    logout();
    return true;
  }
  return false;
};

// Create an axios instance with auth headers
export const createAuthApi = (baseURL = '/api') => {
  const instance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  });

  // Add a request interceptor
  instance.interceptors.request.use(
    config => {
      // Add auth token to every request
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

  // Add a response interceptor
  instance.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        // Handle 401 Unauthorized
        logout();
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export default {
  getAuthToken,
  setAuthToken,
  getAuthHeader,
  isAuthenticated,
  logout,
  handleAuthError,
  createAuthApi
};
