import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AppProvider, useApp } from '../AppContext';
import authService from '../../services/auth';
import { notificationService } from '../../services/notificationService';
import type { User, Notification } from '../../types/notifications';

// Mock modules
vi.mock('../../services/auth');
vi.mock('../../services/notificationService', () => ({
  notificationService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    show: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    getUnreadCount: vi.fn(),
    getNotifications: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Test user data
const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
};

// Test notification data
const mockNotification: Notification = {
  id: '1',
  type: 'test',
  title: 'Test Notification',
  message: 'This is a test notification',
  read: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// A simple component to interact with and display context values
const TestComponent = () => {
  const { 
    isAuthenticated, 
    user, 
    login, 
    logout, 
    theme, 
    toggleTheme, 
    notifications, 
    error,
    loadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  } = useApp();
  
  return (
    <div>
      {error && <div data-testid="error">{error}</div>}
      <div data-testid="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="username">{user?.name || 'null'}</div>
      <div data-testid="email">{user?.email || 'null'}</div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="notification-count">{notifications.length}</div>
      
      <button onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      
      <button onClick={logout}>
        Logout
      </button>
      
      <button onClick={toggleTheme}>
        Toggle Theme
      </button>
      
      <button onClick={loadNotifications}>
        Load Notifications
      </button>
      
      <button onClick={() => markNotificationAsRead('1')}>
        Mark as Read
      </button>
      
      <button onClick={markAllNotificationsAsRead}>
        Mark All as Read
      </button>
      
      <button onClick={() => deleteNotification('1')}>
        Delete Notification
      </button>
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
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Mock localStorage
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
    (authService.logout as jest.Mock).mockResolvedValue(undefined);
    (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    
    // Mock notification service
    (notificationService.getNotifications as jest.Mock).mockReturnValue([mockNotification]);
    (notificationService.getUnreadCount as jest.Mock).mockReturnValue(1);
    (notificationService.subscribe as jest.Mock).mockImplementation((callback) => {
      // Store the callback to simulate notifications
      notificationService.mockCallback = callback;
      return () => {}; // Return cleanup function
    });
  });
  
  it('should initialize with default values', async () => {
    renderWithProviders(<TestComponent />);
    
    expect(screen.getByText(/isAuthenticated: false/)).toBeInTheDocument();
    expect(screen.getByText(/user: null/)).toBeInTheDocument();
    expect(screen.getByText(/theme: light/)).toBeInTheDocument();
    expect(screen.getByText(/loading: false/)).toBeInTheDocument();
    
    // Verify notification service was not initialized
    expect(notificationService.connect).not.toHaveBeenCalled();
  });
  
  it('should initialize notification service on login', async () => {
    renderWithProviders(<TestComponent />);
    
    // Click login button
    fireEvent.click(screen.getByText('Login'));
    
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(notificationService.connect).toHaveBeenCalledWith('test-token');
    });
  });
  
  it('should disconnect notification service on logout', async () => {
    renderWithProviders(<TestComponent />);
    
    // Login first
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => {
      expect(notificationService.connect).toHaveBeenCalled();
    });
    
    // Then logout
    fireEvent.click(screen.getByText('Logout'));
    await waitFor(() => {
      expect(notificationService.disconnect).toHaveBeenCalled();
    });
  });
  
  it('should handle login and update state', async () => {
    renderWithProviders(<TestComponent />);
    
    // Click login button
    fireEvent.click(screen.getByText('Login'));
    
    // Wait for login to complete
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('username')).toHaveTextContent('Test User');
      expect(screen.getByTestId('email')).toHaveTextContent('test@example.com');
    });
  });
  
  it('should handle logout', async () => {
    // First log in
    const { rerender } = renderWithProviders(<TestComponent />);
    fireEvent.click(screen.getByText('Login'));
    
    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });
    
    // Now log out
    fireEvent.click(screen.getByText('Logout'));
    
    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('username')).toHaveTextContent('null');
    });
  });
  
  it('should load notifications', async () => {
    renderWithProviders(<TestComponent />);
    
    // Click load notifications button
    fireEvent.click(screen.getByText('Load Notifications'));
    
    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalled();
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
