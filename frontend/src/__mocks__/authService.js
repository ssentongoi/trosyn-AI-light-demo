// Mock auth service that always returns as authenticated
const mockUser = {
  id: 'mock-user-123',
  email: 'dev@example.com',
  name: 'Developer',
  role: 'admin'
};

export const getAuthToken = () => 'mock-jwt-token';

export const setAuthToken = () => {
  console.log('Auth token set (mocked)');
};

export const getAuthHeader = () => ({
  'Authorization': 'Bearer mock-jwt-token'
});

export const isAuthenticated = () => true;

export const logout = () => {
  console.log('Logout called (mocked)');
  // Don't redirect to login
};

export const handleAuthError = (error) => {
  console.error('Auth error (mocked):', error);
  return false; // Don't handle the error, just log it
};

export const createAuthApi = (baseURL = '/api') => {
  const mockApi = {
    get: (url, config) => Promise.resolve({ data: {} }),
    post: (url, data, config) => Promise.resolve({ data: {} }),
    put: (url, data, config) => Promise.resolve({ data: {} }),
    delete: (url, config) => Promise.resolve({ data: {} }),
    interceptors: {
      request: { use: () => {} },
      response: { use: () => {} }
    }
  };
  return mockApi;
};

export const getCurrentUser = () => ({
  ...mockUser,
  token: 'mock-jwt-token'
});

// Default export with all methods
export default {
  getAuthToken,
  setAuthToken,
  getAuthHeader,
  isAuthenticated,
  logout,
  handleAuthError,
  createAuthApi,
  getCurrentUser
};
