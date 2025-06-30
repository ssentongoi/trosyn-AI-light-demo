import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import authService from '../services/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user is authenticated
        const isAuthenticated = useCallback(() => {
          const token = authService.getAccessToken();
          return !!token && !authService.isTokenExpired(token);
        }, []);

        if (isAuthenticated()) {
          // Token is valid, get user data
          try {
            const userData = await authService.getCurrentUser();
            if (userData) {
              setUser(userData);
            } else {
              console.log('No user data available');
              await logout();
            }
          } catch (err) {
            console.error('Error fetching user data:', err);
            await logout();
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        await logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [navigate]);

  // Login user
  const login = useCallback(async (username, password) => {
    try {
      setError(null);
      setLoading(true);
      
      // Use the auth service to handle login
      const { user, tokens } = await authService.login({ username, password });
      
      if (user) {
        // Update state with the logged-in user
        setUser(user);
        return { success: true, user };
      }
      
      throw new Error('Login failed: No user data received');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Register user
  const register = useCallback(async (userData) => {
    try {
      setError(null);
      setLoading(true);
      
      // Use the auth service to handle registration
      const result = await authService.register(userData);
      
      if (result && result.user) {
        // Update state with the registered user
        setUser(result.user);
        return { success: true, user: result.user };
      }
      
      throw new Error('Registration failed: No user data received');
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout user
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear state
      setUser(null);
      setError(null);
      
      // Navigate to login page
      navigate('/login');
    }
  }, [navigate]);

  // Clear errors
  const clearError = useCallback(() => setError(null), []);

  // Check if user has required role
  const hasRole = useCallback((requiredRole) => {
    if (!requiredRole) return true;
    if (!user?.roles) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.some(role => user.roles.includes(role));
    }
    return user.roles.includes(requiredRole);
  }, [user]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    loading,
    error,
    login,
    logout,
    register,
    hasRole,
    clearError,
    isAuthenticated: !!user,
    isSuperadmin: user?.roles?.includes('superadmin') || false,
  }), [user, loading, error, login, logout, register, hasRole, clearError]);

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
