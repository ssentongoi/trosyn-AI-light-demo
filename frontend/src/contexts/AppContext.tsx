import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth';
import notificationService from '../services/notificationService';
import type { Notification, NotificationType, NotificationOptions } from '../types/notifications';
import type { User, NotificationPreferences } from '../types/auth';

// Types
export interface Company {
  id: string;
  name: string;
  logo?: string;
  [key: string]: any;
}

export interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  currentCompany: Company | null;
  companies: Company[];
  notifications: Notification[];
}

type AppAction =
  | { type: 'LOGIN_SUCCESS'; payload: { user: User } }
  | { type: 'LOGIN_FAILURE'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_COMPANY'; payload: Company | null }
  | { type: 'SET_COMPANIES'; payload: Company[] }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATION'; payload: Notification }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' };

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  loadUser: () => Promise<void>;
  loadCompanies: () => Promise<void>;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setCurrentCompany: (company: Company | null) => void;
  updateUserPreferences: (preferences: NotificationPreferences) => Promise<void>;
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

// Initial state
const initialState: AppState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  theme: 'light',
  sidebarOpen: true,
  currentCompany: null,
  companies: [],
  notifications: [],
};

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Reducer function
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        loading: false,
        error: null,
      };
    
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: action.payload.error,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };
    
    case 'TOGGLE_THEME':
      return {
        ...state,
        theme: state.theme === 'light' ? 'dark' : 'light',
      };
    
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };
    
    case 'SET_COMPANY':
      return {
        ...state,
        currentCompany: action.payload,
      };
    
    case 'SET_COMPANIES':
      return {
        ...state,
        companies: action.payload,
      };

    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };

    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.id ? action.payload : notification
        ),
      };

    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        ),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          read: true,
        })),
      };
    
    default:
      return state;
  }
};

// Context provider component
interface AppProviderProps {
  children: React.ReactNode;
  initialState?: Partial<AppState>;
}

export const AppProvider: React.FC<AppProviderProps> = ({ 
  children, 
  initialState: initialStateOverride 
}) => {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    ...initialStateOverride,
  });
  
  const navigate = useNavigate();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        
        if (token) {
          const user = await authService.getCurrentUser();
          dispatch({ type: 'SET_USER', payload: user });
          
          // Initialize notification service with user token
          notificationService.connect(token);
          
          // Load user data on initial render
          loadUser();
          loadCompanies();
          
          // Load notifications if user is authenticated
          if (state.isAuthenticated) {
            loadNotifications();
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('token');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  // Update document title when user changes
  useEffect(() => {
    document.title = state.user ? `Trosyn AI - ${state.user.name}` : 'Trosyn AI';
  }, [state.user]);
  
  // Load companies
  const loadCompanies = async () => {
    try {
      // Replace with actual API call
      const companies: Company[] = [];
      dispatch({ type: 'SET_COMPANIES', payload: companies });
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  // Register user
  const register = useCallback(async (fullName: string, email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user } = await authService.register(fullName, email, password);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
      navigate('/dashboard'); // Redirect to dashboard after successful registration
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: { error: errorMessage } });
      throw error;
    }
  }, [navigate]);

  // Login user
  const login = useCallback(async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const { user, token } = await authService.login(email, password);
      
      localStorage.setItem('token', token);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
      
      // Load initial data
      await loadCompanies();
      
      navigate('/dashboard');
    } catch (error) {
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: { error: error instanceof Error ? error.message : 'Login failed' } 
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, navigate, loadCompanies]);

  // Logout user
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      localStorage.removeItem('token');
      dispatch({ type: 'LOGOUT' });
      notificationService.disconnect();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Load user data
  const loadUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      console.error('Error loading user:', error);
      dispatch({ type: 'SET_USER', payload: null });
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  // Set current company
  const setCurrentCompany = (company: Company | null) => {
    dispatch({ type: 'SET_COMPANY', payload: company });
  };

  // Update user preferences
  const updateUserPreferences = async (preferences: NotificationPreferences) => {
    if (!state.user) return;
    
    try {
      const updatedUser = await authService.updateUserPreferences(preferences);
      dispatch({ type: 'SET_USER', payload: updatedUser });
      await notificationService.updatePreferences(preferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  // Load notifications from the server
  const loadNotifications = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const notifications = await notificationService.getNotifications();
      dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load notifications' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);
  
  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const updatedNotification = await notificationService.markAsRead(notificationId);
      dispatch({ type: 'UPDATE_NOTIFICATION', payload: updatedNotification });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to mark notification as read' });
    }
  }, []);
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { count } = await notificationService.markAllAsRead();
      if (count > 0) {
        dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to mark all notifications as read' });
    }
  }, []);
  
  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      dispatch({ type: 'DELETE_NOTIFICATION', payload: notificationId });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete notification' });
    }
  }, []);

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Context value
  const contextValue: AppContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    loadUser,
    loadCompanies,
    toggleTheme,
    toggleSidebar,
    setCurrentCompany,
    updateUserPreferences,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the app context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
