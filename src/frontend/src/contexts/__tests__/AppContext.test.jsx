import React from 'react';
import { render, screen, act, waitFor } from '../../../test-utils';
import { AppProvider, useApp } from '../AppContext';
import authService from '../../services/auth';
import notificationService from '../../services/notification';

// Mock child component that uses the context
const TestComponent = () => {
  const { 
    isAuthenticated, 
    user, 
    login, 
    logout, 
    theme, 
    toggleTheme,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  } = useApp();

  return (
    <div>
      <div data-testid="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="username">{user?.username || 'null'}</div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="notification-count">{notifications.length}</div>
      
      <button onClick={() => login({ username: 'test', password: 'password' })}>
        Login
      </button>
      
      <button onClick={logout}>
        Logout
      </button>
      
      <button onClick={toggleTheme}>
        Toggle Theme
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

describe('AppContext', () => {
  // Mock the auth service
  beforeEach(() => {
    // Mock the login function
    authService.login = jest.fn().mockResolvedValue({
      user: { id: '1', username: 'testuser' },
      token: 'test-token',
    });

    // Mock the getCurrentUser function
    authService.getCurrentUser = jest.fn().mockResolvedValue({
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
    });

    // Mock notification service
    notificationService.initialize = jest.fn();
    notificationService.disconnect = jest.fn();
    notificationService.getNotifications = jest.fn().mockResolvedValue([
      { id: '1', title: 'Test', message: 'Test message', read: false },
    ]);
    notificationService.markAsRead = jest.fn().mockResolvedValue({});
    notificationService.markAllAsRead = jest.fn().mockResolvedValue({});
    notificationService.deleteNotification = jest.fn().mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('provides initial context values', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('null');
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('handles login and logout', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );
    });

    // Initial state
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

    // Perform login
    await act(async () => {
      screen.getByText('Login').click();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Check if login was successful
    expect(authService.login).toHaveBeenCalledWith({
      username: 'test',
      password: 'password',
    });
    
    // Check if token was stored
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
    
    // Check if user is authenticated
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('username')).toHaveTextContent('testuser');
    
    // Perform logout
    await act(async () => {
      screen.getByText('Logout').click();
    });
    
    // Check if token was removed
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    
    // Check if user is logged out
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('null');
  });

  it('toggles theme', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );
    });

    // Initial theme is light
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    
    // Toggle to dark
    await act(async () => {
      screen.getByText('Toggle Theme').click();
    });
    
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    
    // Toggle back to light
    await act(async () => {
      screen.getByText('Toggle Theme').click();
    });
    
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  it('loads notifications', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );
    });

    // Check if notifications were loaded
    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalled();
    });
    
    // Check if notification count is correct
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });

  it('marks notification as read', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );
    });

    // Mark notification as read
    await act(async () => {
      screen.getByText('Mark as Read').click();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(notificationService.markAsRead).toHaveBeenCalledWith('1');
  });

  it('marks all notifications as read', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );
    });

    // Mark all notifications as read
    await act(async () => {
      screen.getByText('Mark All as Read').click();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(notificationService.markAllAsRead).toHaveBeenCalled();
  });

  it('deletes a notification', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );
    });

    // Delete notification
    await act(async () => {
      screen.getByText('Delete Notification').click();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(notificationService.deleteNotification).toHaveBeenCalledWith('1');
  });

  it('initializes with saved theme from localStorage', async () => {
    // Set theme in localStorage
    localStorage.setItem('theme', 'dark');
    
    await act(async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );
    });

    // Check if theme was loaded from localStorage
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('handles authentication check on mount', async () => {
    // Set token in localStorage to simulate previous login
    localStorage.setItem('token', 'test-token');
    
    await act(async () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );
    });

    // Check if getCurrentUser was called
    expect(authService.getCurrentUser).toHaveBeenCalled();
    
    // Check if user is authenticated
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });
  });
});
