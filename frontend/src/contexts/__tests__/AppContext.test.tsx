// Import testing utilities first
import React from 'react';
import { 
  render, 
  screen, 
  waitFor, 
  act, 
  fireEvent, 
  cleanup, 
  renderHook 
} from '@testing-library/react';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

// Import types
// Define User type locally since we can't import it
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  preferences?: Record<string, any>; // Add preferences as an optional property
  // Add other user properties as needed
}

import type { Notification, NotificationPreferences } from '../../services/notification';

// Import the modules
import { AppProvider, useApp } from '../AppContext';
import { WebSocketContext } from '../WebSocketContext';
import AuthContext from '../AuthContext';

// Create a mock AuthContext
const mockAuthContext = {
  currentUser: { id: '1', email: 'test@example.com' } as User | null,
  loading: false,
  login: vi.fn().mockResolvedValue({ success: true }),
  logout: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: true
};

// Mock the AuthContext with proper typing
vi.mock('../AuthContext', () => {
  const mockContextValue = {
    currentUser: null as User | null,
    loading: false,
    login: vi.fn().mockResolvedValue({ success: false }),
    logout: vi.fn(),
    isAuthenticated: false
  };
  
  return {
    __esModule: true,
    default: {
      Provider: ({ children, value }: { children: React.ReactNode, value: any }) => (
        <div data-testid="auth-provider">{children}</div>
      ),
      Consumer: ({ children }: { children: (value: any) => React.ReactNode }) => 
        children(mockContextValue),
    },
    useAuth: () => mockContextValue
  };
});

import authService from '../../services/auth';
import notificationService from '../../services/notification';

// Mock the services
vi.mock('../../services/auth', () => ({
  __esModule: true,
  default: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    updateUserPreferences: vi.fn()
  }
}));

vi.mock('../../services/notification', () => ({
  __esModule: true,
  default: {
    initialize: vi.fn().mockResolvedValue(undefined),
    notify: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    unsubscribe: vi.fn(),
    clear: vi.fn(),
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    updatePreferences: vi.fn()
  },
  NotificationType: { INFO: 'info', WARNING: 'warning', ERROR: 'error' }
}));

// Create a mock notification service with all required properties
const createMockNotificationService = (overrides = {}) => {
  // Create a private emitter for internal use
  const emitter = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  };

  const mockService = {
    // Core methods
    initialize: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    notify: vi.fn(),
    subscribe: vi.fn((event, callback) => {
      // Return unsubscribe function
      return () => {};
    }),
    unsubscribe: vi.fn(),
    clear: vi.fn(),
    clearAll: vi.fn().mockResolvedValue(undefined),
    getNotifications: vi.fn().mockResolvedValue([]),
    getUnreadCount: vi.fn().mockResolvedValue(0),
    getPreferences: vi.fn().mockResolvedValue({}),
    markAsRead: vi.fn().mockImplementation((id) => 
      Promise.resolve({ 
        id, 
        read: true, 
        title: 'Test', 
        message: 'Test', 
        type: 'info', 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      })
    ),
    markAllAsRead: vi.fn().mockResolvedValue({ count: 1 }),
    deleteNotification: vi.fn().mockResolvedValue(undefined),
    sendNotification: vi.fn().mockResolvedValue(undefined),
    testNotification: vi.fn().mockResolvedValue(undefined),
    getNotificationTypes: vi.fn().mockResolvedValue([]),
    sendToUsers: vi.fn().mockResolvedValue(undefined),
    broadcast: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    updatePreferences: vi.fn().mockResolvedValue(undefined),
    
    // Properties
    isInitialized: true,
    isConnected: true,
    connectionStatus: 'connected',
    error: null,
    
    // Internal properties (not part of the public interface)
    _emitter: emitter,
    _ws: {
      send: vi.fn()
    },
    cleanupWs: vi.fn(),
    handleError: vi.fn()
  };

  // Apply any overrides
  Object.assign(mockService, overrides);
  
  return mockService;
};

// Create a mock auth service
const createMockAuthService = (overrides = {}) => ({
  login: vi.fn().mockResolvedValue({ token: 'test-token', user: { id: '1', email: 'test@example.com' } }),
  logout: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
  updateUserPreferences: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

// Create instances of the mocks
const mockAuthService = createMockAuthService();
const mockNotificationService = createMockNotificationService();

// Apply the mocks
Object.keys(mockAuthService).forEach((key) => {
  // @ts-ignore - We know these properties exist
  authService[key] = mockAuthService[key];
});

Object.keys(mockNotificationService).forEach((key) => {
  // @ts-ignore - We know these properties exist
  notificationService[key] = mockNotificationService[key];
});

const mockNavigate = vi.fn();

// Moved mocks to the top of the file to avoid hoisting issues

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  preferences: { notifications: { email: true, in_app: true } },
};

const mockNotification = {
  id: '1',
  title: 'Test Notification',
  message: 'Test message',
  type: 'info',
  read: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockEmit = vi.fn();

// A simple component to interact with and display context values
const TestComponent = () => {
  const { 
    isAuthenticated, 
    user, 
    login, 
    logout, 
    theme, 
    toggleTheme, 
    error,
    notifications,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useApp();
  
  return (
    <div>
      {error && <div data-testid="error">{error}</div>}
      <div data-testid="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="username">{user?.name || 'null'}</div>
      <div data-testid="email">{user?.email || 'null'}</div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="notification-count">{notifications?.length || 0}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={loadNotifications}>Load Notifications</button>
      <button onClick={() => markAsRead('1')}>Mark as Read</button>
      <button onClick={markAllAsRead}>Mark All as Read</button>
      <button onClick={() => deleteNotification('1')}>Delete Notification</button>
    </div>
  );
};

// Mock for WebSocket context
const createMockWebSocketContext = (overrides = {}) => ({
  isConnected: true,
  connectionStatus: 'connected',
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  send: vi.fn(),
  sendMessage: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  reconnect: vi.fn(),
  isConnecting: false,
  error: null,
  lastError: null,
  ...overrides
});

// Create a single instance of the mock WebSocket context with all required properties
const mockWebSocketContext = {
  ...createMockWebSocketContext(),
  notificationService: mockNotificationService,
  lastError: null,
  isConnecting: false,
  // Ensure all required WebSocketContextType properties are included
  on: vi.fn(),
  off: vi.fn(),
  reconnect: vi.fn()
};

// Single TestWrapper component that handles both auth and WebSocket contexts
const TestWrapper: React.FC<{
  children: React.ReactNode;
  initialAuthState?: { isAuthenticated: boolean; user: User | null };
  onAuthStateChange?: (setter: (state: any) => void) => void;
}> = ({ 
  children, 
  initialAuthState = { isAuthenticated: false, user: null },
  onAuthStateChange
}) => {
  const [authState, setAuthState] = React.useState(initialAuthState);
  
  // Simulate authentication state changes
  React.useEffect(() => {
    if (onAuthStateChange) {
      onAuthStateChange((newState) => {
        setAuthState(newState);
      });
    }
  }, [onAuthStateChange]);

  // Mock auth context value
  const authContextValue = {
    currentUser: authState.user,
    loading: false,
    login: mockAuthService.login,
    logout: mockAuthService.logout,
    isAuthenticated: authState.isAuthenticated
  };

  // Create a new context value with proper typing
  const contextValue = React.useMemo(() => {
    // Create a mock notification service that matches the NotificationService type
    const notificationService = {
      ...mockNotificationService,
      // Private properties are not exposed in the type
    } as any; // Use type assertion to bypass private property checks
    
    return {
      ...mockWebSocketContext,
      notificationService
    };
  }, []);

  // Create a custom AuthContext provider to avoid type issues
  const AuthProvider = ({ children, value }: { children: React.ReactNode, value: any }) => {
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      <AuthProvider value={authContextValue}>
        <AppProvider>
          {children}
        </AppProvider>
      </AuthProvider>
    </WebSocketContext.Provider>
  );
};

// Create a custom render function that includes all providers
const customRender = (ui: React.ReactElement, options: any = {}) => {
  const { 
    wrapper: Wrapper = React.Fragment, 
    initialAuthState = { isAuthenticated: false, user: null },
    onAuthStateChange,
    ...restOptions 
  } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper 
        initialAuthState={initialAuthState}
        onAuthStateChange={onAuthStateChange}
      >
        {children}
      </TestWrapper>
    ),
    ...restOptions,
  });
};

// Helper to create a WebSocket provider wrapper
const withWebSocket = (value: any) => 
  ({ children }: { children: React.ReactNode }) => (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );

describe('AppContext', () => {
  // Test setup and teardown
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default implementations
    mockAuthService.login.mockResolvedValue({ success: true, user: mockUser });
    mockAuthService.logout.mockResolvedValue({ success: true });
    mockNotificationService.getNotifications.mockResolvedValue([]);
    
    // Mock localStorage
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render children and provide initial state', async () => {
    const { unmount } = customRender(<TestComponent />);
    
    // Wait for any initial async operations to complete
    await new Promise(process.nextTick);
    
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('username').textContent).toBe('null');
    expect(screen.getByTestId('theme').textContent).toBe('light');
    
    // Clean up
    unmount();
    await new Promise(process.nextTick);
  });

  it('should handle successful login', async () => {
    customRender(<TestComponent />);
    
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(notificationService.connect).toHaveBeenCalled();
    });
    
    // Wait for state updates to complete
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
      expect(screen.getByTestId('username').textContent).toBe('Test User');
      expect(screen.getByTestId('email').textContent).toBe('test@example.com');
    });
  });

  it('should handle login and update state', async () => {
    customRender(<TestComponent />);
    
    // Click login button
    fireEvent.click(screen.getByText('Login'));
    
    // Wait for login service to be called
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
    });
    
    // Wait for token to be stored
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
    });
    
    // Wait for authentication state to update
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });
    
    // Wait for user data to be displayed
    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent('Test User');
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('test@example.com');
    });
  });

  it('should handle logout', async () => {
    // First log in
    customRender(<TestComponent />);
    fireEvent.click(screen.getByText('Login'));
    
    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    });
    
    // Now log out
    fireEvent.click(screen.getByText('Logout'));
    
    // Wait for logout service to be called
    await waitFor(() => {
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    });
    
    // Wait for token to be removed
    await waitFor(() => {
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
    
    // Wait for authentication state to update
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });
    
    // Wait for user data to be cleared
    await waitFor(() => {
      expect(screen.getByTestId('username').textContent).toBe('null');
    });
  });

  it('should load notifications', async () => {
    // Set up mock responses
    const testNotification = { ...mockNotification, id: 'test-notification-1' };
    
    // Mock the login response
    mockAuthService.login.mockResolvedValueOnce({ 
      token: 'test-token', 
      user: mockUser 
    });
    
    // Mock the notifications service
    mockNotificationService.getNotifications.mockResolvedValueOnce([testNotification]);
    
    // Render the component
    const { rerender } = customRender(<TestComponent />);
    
    // Manually trigger login
    fireEvent.click(screen.getByText('Login'));
    
    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    });
    
    // Click the load notifications button
    fireEvent.click(screen.getByText('Load Notifications'));
    
    // Verify the notifications were loaded
    await waitFor(() => {
      expect(mockNotificationService.getNotifications).toHaveBeenCalled();
      expect(screen.getByTestId('notification-count').textContent).toBe('1');
    });
  });

  it('should load notifications on mount when authenticated', async () => {
    // Arrange
    const testNotifications = [
      { 
        id: '1', 
        message: 'Test notification', 
        read: false, 
        createdAt: new Date().toISOString() 
      }
    ];
    
    // Setup mocks
    mockNotificationService.getNotifications.mockResolvedValue(testNotifications);
    
    // Act
    const { result } = renderHook(() => useApp(), {
      wrapper: ({ children }) => (
        <TestWrapper 
          initialAuthState={{ 
            isAuthenticated: true, 
            user: { ...mockUser, preferences: { notifications: true } } 
          }}
        >
          {children}
        </TestWrapper>
      )
    });
    
    // Assert
    await waitFor(() => {
      expect(mockNotificationService.getNotifications).toHaveBeenCalled();
      expect(result.current.notifications).toEqual(testNotifications);
    });
  });

  it('should mark notification as read', async () => {
    // Set up initial state with a notification
    mockNotificationService.getNotifications.mockResolvedValueOnce([mockNotification]);
    
    customRender(<TestComponent />);
    
    // First load notifications
    fireEvent.click(screen.getByText('Load Notifications'));
    
    // Wait for notifications to load
    await waitFor(() => {
      expect(screen.getByTestId('notification-count').textContent).toBe('1');
    });
    
    // Mark as read
    fireEvent.click(screen.getByText('Mark as Read'));
    
    await waitFor(() => {
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('1');
    });
  });
  
  it('should mark all notifications as read', async () => {
    // Set up initial state with a notification
    mockNotificationService.getNotifications.mockResolvedValueOnce([mockNotification]);
    
    customRender(<TestComponent />);
    
    // First load notifications
    fireEvent.click(screen.getByText('Load Notifications'));
    
    // Wait for notifications to load
    await waitFor(() => {
      expect(screen.getByTestId('notification-count').textContent).toBe('1');
    });
    
    // Mark all as read
    fireEvent.click(screen.getByText('Mark All as Read'));
    
    await waitFor(() => {
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledTimes(1);
    });
  });
  
  it('should delete a notification', async () => {
    // Set up initial state with a notification
    mockNotificationService.getNotifications.mockResolvedValueOnce([mockNotification]);
    
    customRender(<TestComponent />);
    
    // First load notifications
    fireEvent.click(screen.getByText('Load Notifications'));
    
    // Wait for notifications to load
    await waitFor(() => {
      expect(screen.getByTestId('notification-count').textContent).toBe('1');
    });
    
    // Delete notification
    fireEvent.click(screen.getByText('Delete Notification'));
    
    await waitFor(() => {
      expect(mockNotificationService.deleteNotification).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith('1');
    });
  });
  
  it('should handle theme toggle', () => {
    customRender(<TestComponent />);
    
    // Initial theme should be light
    expect(screen.getByTestId('theme').textContent).toBe('light');
    
    // Toggle to dark
    fireEvent.click(screen.getByText('Toggle Theme'));
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    
    // Toggle back to light
    fireEvent.click(screen.getByText('Toggle Theme'));
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });
  
  it('should handle notification events', async () => {
    // Set up the test notification
    const testNotification = { ...mockNotification, id: 'test-event-1' };
    
    // Mock the on method to call the callback immediately
    const mockCallback = vi.fn();
    mockNotificationService.on.mockImplementation((event, callback) => {
      if (event === 'notification') {
        // Call the callback immediately with our test notification
        callback(testNotification);
      }
      return () => {}; // Return cleanup function
    });
    
    customRender(<TestComponent />);
    
    // The notification should be added to the state
    await waitFor(() => {
      expect(mockNotificationService.on).toHaveBeenCalledWith('notification', expect.any(Function));
      expect(screen.getByTestId('notification-count').textContent).toBe('1');
    });
  });
});
