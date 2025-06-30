import axios from 'axios';

// Create axios instance with base URL and headers
const api = axios.create({
  baseURL: '/api', // This will be proxied to the backend in development
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending/receiving cookies (for HTTP-only cookies)
});

// Flag to prevent multiple token refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is not 401, or if it's a refresh token request, reject
    if (error.response?.status !== 401 || originalRequest.url === '/auth/refresh' || originalRequest._retry) {
      // If we get a 401 and we're not on the login page, log out
      if (error.response?.status === 401 && window.location.pathname !== '/login') {
        handleLogout();
      }
      return Promise.reject(error.response?.data || 'Something went wrong');
    }

    // If we're already refreshing the token, add the request to the queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
      .then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      })
      .catch(err => {
        return Promise.reject(err);
      });
    }

    // Set the refresh flag and try to refresh the token
    isRefreshing = true;
    originalRequest._retry = true;
    
    try {
      // The refresh token is automatically sent via HTTP-only cookie
      const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, {
        withCredentials: true
      });

      const { access_token, user } = response.data;
      
      // Store the new access token and user data
      localStorage.setItem('access_token', access_token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Update the authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

      // Process the queue
      processQueue(null, access_token);
      isRefreshing = false;

      // Retry the original request
      return api(originalRequest);
    } catch (error) {
      // If refresh fails, log the user out
      handleLogout();
      processQueue(error, null);
      return Promise.reject('Session expired. Please log in again.');
    } finally {
      isRefreshing = false;
    }
  }
);

// Function to handle logout
const handleLogout = async () => {
  try {
    // Call the logout endpoint to clear the HTTP-only cookie
    await axios.post('/api/auth/logout', {}, { withCredentials: true });
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    // Clear auth data from local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    // Clear any pending requests
    failedQueue = [];
    
    // Redirect to login page if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
};

// Export the logout function
api.logout = handleLogout;

export default api;
