import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth';
import { notificationService } from '../services/notificationService';
import type { Notification, NotificationType, NotificationOptions } from '../types/notifications';
import type { User, NotificationPreferences } from '../services/auth';

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
  | { type: 'SET_COMPANIES'; payload: Company[] };

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  loadUser: () => Promise<void>;
  loadCompanies: () => Promise<void>;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setCurrentCompany: (company: Company | null) => void;
  updateUserPreferences: (preferences: NotificationPreferences) => Promise<void>;
}

// Initial state
const initialState: AppState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
  theme: 'light',
  sidebarOpen: true,
  currentCompany: null,
  companies: [],
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
          
          // Load initial data
          await loadCompanies();
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

  // Set up notification listener
  useEffect(() => {
    if (!state.user) return;
    
    // Initialize notification service with user token
    const token = localStorage.getItem('token');
    if (token) {
      notificationService.connect(token);
    }

    // Cleanup on unmount
    return () => {
      notificationService.disconnect();
    };
  }, [state.user]);

  // Login user
  const login = async (email: string, password: string) => {
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
  };

  // Logout user
  const logout = async () => {
    try {
      await authService.logout();
      localStorage.removeItem('token');
      dispatch({ type: 'LOGOUT' });
      notificationService.disconnect();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
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

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Context value
  const contextValue: AppContextType = {
    ...state,
    login,
    logout,
    clearError,
    loadUser,
    loadCompanies,
    toggleTheme,
    toggleSidebar,
    setCurrentCompany,
    updateUserPreferences,
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
