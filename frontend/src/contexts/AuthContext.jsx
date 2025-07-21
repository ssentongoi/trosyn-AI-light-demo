import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Import environment configuration


// Create auth context
const AuthContext = createContext(null);

/**
 * AuthProvider - Provides authentication context to the application
 * Handles user authentication state and session management
 */
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Secure storage for tokens (in-memory for now, will be replaced with secure storage)
  const [authToken, setAuthToken] = useState(null);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Load token from secure storage
        let token = null;
        
        // In app mode, we would use secure storage. For now, this is stubbed.
        // token = await secureStorage.secureGetItem('auth_token');
        console.log('Running in app mode. Secure token storage is not yet implemented.');
        
        if (token) {
          // In a real app, we would validate the token with the backend
          // For now, we'll just set the token directly
          setAuthToken(token);
          
          // In a real app, we would fetch the user profile here
          // For now, we'll create a mock user
          setCurrentUser({
            id: 'mock-user-id',
            email: 'dev@example.com',
            name: 'Developer',
            role: 'admin'
          });
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login user with email and password
   * In a real app, this would make an API call to authenticate
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock authentication for development
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      
      // For development, accept any non-empty email/password
      if (email && password) {
        const mockUser = {
          id: 'dev-user-id',
          email: email,
          name: email.split('@')[0],
          role: 'admin' // Default to admin in dev mode
        };
        
        const mockToken = 'mock-jwt-token';
        
        setCurrentUser(mockUser);
        setAuthToken(mockToken);
        
        // In the future, we will store the token in secure storage
        // await secureStorage.secureSetItem('auth_token', mockToken);
        
        return { success: true };
      } else {
        throw new Error('Email and password are required');
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout the current user
   */
  const logout = useCallback(() => {
    // In a real app, we would also invalidate the token on the server
    setCurrentUser(null);
    setAuthToken(null);
    
    // In the future, we will remove the token from secure storage
    // await secureStorage.secureRemoveItem('auth_token');
    
    // Navigate to login page
    navigate('/login');
  }, [navigate]);

  // Check if user is authenticated
  const isAuthenticated = Boolean(currentUser && authToken);

  // Verify if user has required role
  const hasRole = useCallback((requiredRole) => {
    if (!currentUser) return false;
    if (requiredRole === 'any') return true;
    return currentUser.role === requiredRole;
  }, [currentUser]);

  // Context value
  const value = {
    currentUser,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    hasRole,
    // In a real app, we would expose the token to authenticated API calls
    getAuthHeader: () => ({
      Authorization: `Bearer ${authToken}`
    })
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth - Hook to access auth context
 * @returns {Object} Auth context value
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
