import React, { createContext, useContext, useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth';
import notificationService from '../services/notification';

// Default user object
const defaultUser = {
  id: 'local-dev-user',
  name: 'Local Developer',
  email: 'dev@localhost',
  role: 'admin',
  avatar: '',
  preferences: {}
};

// Initial state - always authenticated in development
const initialState = {
  isAuthenticated: true, // Always authenticated
  user: defaultUser,     // Use default user
  loading: false,        // No loading state needed
  error: null,
  notifications: [],
  unreadCount: 0,
  theme: 'light',
  sidebarOpen: true,
  currentCompany: null,
  companies: [],
};

// Action types
const actionTypes = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_USER: 'SET_USER',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ',
  MARK_ALL_NOTIFICATIONS_READ: 'MARK_ALL_NOTIFICATIONS_READ',
  DELETE_NOTIFICATION: 'DELETE_NOTIFICATION',
  TOGGLE_THEME: 'TOGGLE_THEME',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_COMPANY: 'SET_COMPANY',
  SET_COMPANIES: 'SET_COMPANIES',
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        loading: false,
        error: null,
      };
    
    case actionTypes.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: action.payload.error,
      };
    
    case actionTypes.LOGOUT:
      return {
        ...initialState,
        loading: false,
        theme: state.theme, // Keep theme preference
      };
    
    case actionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    
    case actionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    
    case actionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    
    case actionTypes.SET_USER:
      return {
        ...state,
        user: action.payload,
      };
    
    case actionTypes.SET_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload.notifications,
        unreadCount: action.payload.unreadCount || 0,
      };
    
    case actionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    
    case actionTypes.MARK_NOTIFICATION_READ: {
      const updatedNotifications = state.notifications.map(notification => 
        notification.id === action.payload.id
          ? { ...notification, read: true }
          : notification
      );
      
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }
    
    case actionTypes.MARK_ALL_NOTIFICATIONS_READ: {
      const updatedNotifications = state.notifications.map(notification => ({
        ...notification,
        read: true,
      }));
      
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: 0,
      };
    }
    
    case actionTypes.DELETE_NOTIFICATION:
      const notificationToDelete = state.notifications.find(
        n => n.id === action.payload.id
      );
      
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload.id
        ),
        unreadCount: notificationToDelete?.read 
          ? state.unreadCount 
          : Math.max(0, state.unreadCount - 1),
      };
    
    case actionTypes.TOGGLE_THEME:
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      
      return {
        ...state,
        theme: newTheme,
      };
    
    case actionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };
    
    case actionTypes.SET_COMPANY:
      return {
        ...state,
        currentCompany: action.payload,
      };
    
    case actionTypes.SET_COMPANIES:
      return {
        ...state,
        companies: action.payload,
      };
    
    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Context provider component
export const AppProvider = ({ children, initialState: initialStateOverride }) => {
  const [state, dispatch] = useReducer(appReducer, initialStateOverride || initialState);
  const navigate = useNavigate();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load theme from localStorage or use system preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        
        document.documentElement.setAttribute('data-theme', theme);
        
        // Check if user is already authenticated
        const token = localStorage.getItem('token');
        
        if (token) {
          try {
            const user = await authService.getCurrentUser();
            dispatch({ type: actionTypes.LOGIN_SUCCESS, payload: { user } });
            initializeNotifications(token);
            
            // Load user's companies if needed
            if (user.companies && user.companies.length > 0) {
              dispatch({ 
                type: actionTypes.SET_COMPANIES, 
                payload: user.companies 
              });
              
              // Set current company if not set
              if (!state.currentCompany && user.companies.length > 0) {
                dispatch({ 
                  type: actionTypes.SET_COMPANY, 
                  payload: user.companies[0] 
                });
              }
            }
          } catch (error) {
            console.error('Failed to load user:', error);
            localStorage.removeItem('token');
            dispatch({ type: actionTypes.LOGOUT });
          }
        } else {
          dispatch({ type: actionTypes.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Initialization error:', error);
        dispatch({ 
          type: actionTypes.SET_ERROR, 
          payload: 'Failed to initialize application' 
        });
      }
    };

    initializeApp();
  }, []);

  // Initialize WebSocket notifications
  const initializeNotifications = (token) => {
    notificationService.initialize(token);
    
    // Subscribe to new notifications
    const unsubscribe = notificationService.subscribe((notification) => {
      dispatch({ 
        type: actionTypes.ADD_NOTIFICATION, 
        payload: notification 
      });
      
      // Show browser notification if enabled
      if (Notification.permission === 'granted' && !document.hasFocus()) {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo192.png',
        });
      }
    });
    
    // Load initial notifications
    loadNotifications();
    
    return unsubscribe;
  };

  // Load user notifications
  const loadNotifications = async () => {
    try {
      const notifications = await notificationService.getNotifications();
      const unreadCount = notifications.filter(n => !n.read).length;
      
      dispatch({ 
        type: actionTypes.SET_NOTIFICATIONS, 
        payload: { notifications, unreadCount } 
      });
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Login user
  const login = async (credentials) => {
    dispatch({ type: actionTypes.SET_LOADING, payload: true });
    
    try {
      const { user, token } = await authService.login(credentials);
      
      localStorage.setItem('token', token);
      initializeNotifications(token);
      
      dispatch({ 
        type: actionTypes.LOGIN_SUCCESS, 
        payload: { user } 
      });
      
      // Load user's companies if available
      if (user.companies && user.companies.length > 0) {
        dispatch({ 
          type: actionTypes.SET_COMPANIES, 
          payload: user.companies 
        });
        
        // Set current company if not set
        if (!state.currentCompany && user.companies.length > 0) {
          dispatch({ 
            type: actionTypes.SET_COMPANY, 
            payload: user.companies[0] 
          });
        }
      }
      
      return { success: true };
    } catch (error) {
      dispatch({ 
        type: actionTypes.LOGIN_FAILURE, 
        payload: { error: error.message || 'Login failed' } 
      });
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    notificationService.disconnect();
    dispatch({ type: actionTypes.LOGOUT });
    navigate('/login');
  };

  // Register new user
  const register = async (userData) => {
    dispatch({ type: actionTypes.SET_LOADING, payload: true });
    
    try {
      await authService.register(userData);
      return { success: true };
    } catch (error) {
      dispatch({ 
        type: actionTypes.SET_ERROR, 
        payload: error.message || 'Registration failed' 
      });
      throw error;
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  // Update user profile
  const updateProfile = async (updates) => {
    try {
      const updatedUser = await authService.updateProfile(updates);
      dispatch({ 
        type: actionTypes.SET_USER, 
        payload: updatedUser 
      });
      return updatedUser;
    } catch (error) {
      dispatch({ 
        type: actionTypes.SET_ERROR, 
        payload: error.message || 'Failed to update profile' 
      });
      throw error;
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      dispatch({ 
        type: actionTypes.MARK_NOTIFICATION_READ, 
        payload: { id: notificationId } 
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      dispatch({ type: actionTypes.MARK_ALL_NOTIFICATIONS_READ });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      dispatch({ 
        type: actionTypes.DELETE_NOTIFICATION, 
        payload: { id: notificationId } 
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    dispatch({ type: actionTypes.TOGGLE_THEME });
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    dispatch({ type: actionTypes.TOGGLE_SIDEBAR });
  };

  // Set current company
  const setCurrentCompany = (company) => {
    dispatch({ 
      type: actionTypes.SET_COMPANY, 
      payload: company 
    });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: actionTypes.CLEAR_ERROR });
  };

  // Context value
  const value = {
    ...state,
    login,
    logout,
    register,
    updateProfile,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    toggleTheme,
    toggleSidebar,
    setCurrentCompany,
    clearError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook to use the app context
export const useApp = () => {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  
  return context;
};

export default AppContext;
