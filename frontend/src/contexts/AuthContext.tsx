import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { secureSetItem, secureGetItem, secureRemoveItem } from '../utils/secureStorage';
import env from '../config/env';

// Types
type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  getAuthHeader: () => { Authorization: string };
};

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProvider - Provides authentication context to the application
 * Handles user authentication state and session management
 */
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const navigate = useNavigate();

  // Initialize authentication state
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Load token from appropriate storage based on environment
        let token = null;
        
        if (env.IS_DEVELOPMENT && env.IS_BROWSER) {
          // In development browser mode, try to get token from localStorage
          token = localStorage.getItem('dev_auth_token');
          console.warn('Running in development browser mode with mock auth');
        } else if (env.IS_APP) {
          // In app mode, use secure storage
          token = await secureGetItem('auth_token');
        }
        
        if (token && isMounted) {
          setAuthToken(token);
          
          // In a real app, we would validate the token with the backend
          // For now, we'll use a mock user
          const mockUser = {
            id: env.IS_DEVELOPMENT ? 'dev-user-id' : 'user-id-from-token',
            email: env.IS_DEVELOPMENT ? 'dev@example.com' : 'user@example.com',
            name: env.IS_DEVELOPMENT ? 'Developer' : 'Authenticated User',
            role: env.IS_DEVELOPMENT ? 'admin' : 'user'
          };
          
          if (isMounted) {
            setCurrentUser(mockUser);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Login user with email and password
   * In a real app, this would make an API call to authenticate
   */
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, this would be an actual API call
      if (env.IS_DEVELOPMENT) {
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
          
          // Store token in appropriate storage based on environment
          if (env.IS_BROWSER) {
            localStorage.setItem('dev_auth_token', mockToken);
          } else if (env.IS_APP) {
            await secureSetItem('auth_token', mockToken);
          }
          
          // Update state
          setCurrentUser(mockUser);
          setAuthToken(mockToken);
          
          return { success: true };
        } else {
          throw new Error('Email and password are required');
        }
      } else if (env.IS_APP) {
        // In production app, use the real auth service
        // This would be replaced with actual API calls
        throw new Error('Authentication not implemented for production yet');
      } else {
        // In production browser, use the real auth service
        throw new Error('Authentication not implemented for production browser yet');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      console.error('Login failed:', errorMessage);
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout the current user
   */
  const logout = useCallback(async () => {
    try {
      // Remove token from appropriate storage based on environment
      if (env.IS_DEVELOPMENT && env.IS_BROWSER) {
        localStorage.removeItem('dev_auth_token');
      } else if (env.IS_APP) {
        await secureRemoveItem('auth_token');
      }
      
      // Clear auth state
      setCurrentUser(null);
      setAuthToken(null);
      setError(null);
      
      // Navigate to login page
      navigate('/login');
    } catch (err) {
      console.error('Error during logout:', err);
      // Even if there's an error, we should still clear the state
      setCurrentUser(null);
      setAuthToken(null);
      setError('Error during logout');
      navigate('/login');
    }
  }, [navigate]);

  /**
   * Check if user has the required role
   * @param requiredRole - Role to check against
   * @returns boolean indicating if user has the required role
   */
  const hasRole = useCallback((requiredRole: string): boolean => {
    if (!currentUser) return false;
    if (requiredRole === 'any') return true;
    return currentUser.role === requiredRole;
  }, [currentUser]);

  // Check if user is authenticated
  const isAuthenticated = Boolean(currentUser && authToken);

  // Context value
  const value: AuthContextType = {
    currentUser,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    hasRole,
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
 * @returns Auth context value
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
