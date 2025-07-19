import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AppProvider, useApp } from '../AppContext';
import authService from '../../services/auth';
import notificationService from '../../services/notificationService';
import type { User } from '../types/auth';

const mockNavigate = vi.fn();

// Mock external modules
vi.mock('../../services/auth');
vi.mock('../../services/notificationService');
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
  created_at: new Date().toISOString(),
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

// Helper to render components within the AppProvider and a MemoryRouter
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>
  );
};

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
    Storage.prototype.getItem = vi.fn();

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock auth service calls
    (authService.login as vi.Mock).mockResolvedValue({ token: 'test-token', user: mockUser });
    (authService.logout as vi.Mock).mockResolvedValue(undefined);
    (authService.getCurrentUser as vi.Mock).mockResolvedValue(mockUser);
    
    // Mock notification service methods
    (notificationService.connect as vi.Mock).mockImplementation(() => {});
    (notificationService.getNotifications as vi.Mock).mockResolvedValue([mockNotification]);
    (notificationService.markAsRead as vi.Mock).mockImplementation((id: string) => {
      // Simulate marking a notification as read
      return Promise.resolve();
    });
    (notificationService.markAllAsRead as vi.Mock).mockResolvedValue(undefined);
    (notificationService.deleteNotification as vi.Mock).mockImplementation((id: string) => {
      // Simulate deleting a notification
      return Promise.resolve();
    });
    (notificationService.subscribe as vi.Mock).mockImplementation((callback) => {
      // Return a simple unsubscribe function
      return () => {};
    });
    (notificationService.clear as vi.Mock).mockResolvedValue(undefined);
  });

  it('should render children and provide initial state', () => {
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('null');
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('should handle successful login', async () => {
    renderWithProviders(<TestComponent />);
    
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(notificationService.connect).toHaveBeenCalled();
    });
    
    // Wait for state updates to complete
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('username')).toHaveTextContent('Test User');
      expect(screen.getByTestId('email')).toHaveTextContent('test@example.com');
    });
  });
  it('should handle login and update state', async () => {
    renderWithProviders(<TestComponent />);
    
    // Click login button
    fireEvent.click(screen.getByText('Login'));
    
    // Wait for login service to be called
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
    });
    
    // Wait for token to be stored
    await waitFor(() => {
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
    renderWithProviders(<TestComponent />);
    fireEvent.click(screen.getByText('Login'));
    
    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });
    
    // Now log out
    fireEvent.click(screen.getByText('Logout'));
    
    // Wait for logout service to be called
    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
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
      expect(screen.getByTestId('username')).toHaveTextContent('null');
    });
  });
  
  it('should load notifications', async () => {
    renderWithProviders(<TestComponent />);
    
    // Click load notifications button
    fireEvent.click(screen.getByText('Load Notifications'));
    
    // Wait for service to be called
    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalled();
    });
    
    // Wait for notifications to be displayed
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });
  });
  
  it('should mark notification as read', async () => {
    renderWithProviders(<TestComponent />);
    
    // First load notifications
    fireEvent.click(screen.getByText('Load Notifications'));
    
    // Wait for notifications to load
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });
    
    // Mark notification as read
    fireEvent.click(screen.getByText('Mark as Read'));
    
    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith('1');
    });
  });
  
  it('should mark all notifications as read', async () => {
    renderWithProviders(<TestComponent />);
    
    // Mark all notifications as read
    fireEvent.click(screen.getByText('Mark All as Read'));
    
    await waitFor(() => {
      expect(notificationService.markAllAsRead).toHaveBeenCalled();
    });
  });
  
  it('should delete a notification', async () => {
    renderWithProviders(<TestComponent />);
    
    // First load notifications
    fireEvent.click(screen.getByText('Load Notifications'));
    
    // Wait for notifications to load
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });
    
    // Delete notification
    fireEvent.click(screen.getByText('Delete Notification'));
    
    await waitFor(() => {
      expect(notificationService.deleteNotification).toHaveBeenCalledWith('1');
    });
  });
  
  it('should toggle theme', () => {
    renderWithProviders(<TestComponent />);
    
    // Initial theme is light
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    
    // Toggle to dark
    fireEvent.click(screen.getByText('Toggle Theme'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    
    // Toggle back to light
    fireEvent.click(screen.getByText('Toggle Theme'));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });
  
  it('should handle notification events', async () => {
    renderWithProviders(<TestComponent />);
    
    // Simulate a new notification event
    mockEmit('notification', mockNotification);
    
    // The notification should be added to the state
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });
  });
});
