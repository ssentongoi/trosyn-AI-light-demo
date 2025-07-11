import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider, useApp } from '../AppContext';
import authService from '../../services/auth';
import notificationService from '../../services/notification';

// Use automatic mocks from __mocks__ directory
vi.mock('../../services/auth');
vi.mock('../../services/notification');

// Mock useNavigate
vi.mock('react-router-dom', () => ({
  ...vi.requireActual('react-router-dom'),
  useNavigate: () => vi.fn(),
}));

// A simple component to interact with and display context values
const TestComponent = () => {
  const { isAuthenticated, user, login, logout, theme, toggleTheme, notifications, error } = useApp();
  return (
    <div>
      {error && <div data-testid="error">{error}</div>}
      <div data-testid="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="username">{user?.username || 'null'}</div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="notification-count">{notifications.length}</div>
      <button onClick={() => login({ username: 'testuser', password: 'password' })}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};

// Helper to render components within the AppProvider and a MemoryRouter
const renderWithProviders = (ui) => {
  return render(
    <MemoryRouter>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>
  );
};

describe('AppContext', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.clearAllMocks();
    localStorage.clear();

    // Default successful mock implementations for services
    authService.login.mockResolvedValue({ user: { id: '1', username: 'testuser' }, token: 'test-token' });
    authService.getCurrentUser.mockResolvedValue({ id: '1', username: 'testuser' });
    notificationService.getNotifications.mockResolvedValue([]);
    notificationService.initialize.mockImplementation(() => {});
    notificationService.disconnect.mockImplementation(() => {});
  });

  it('provides correct initial context values when no session exists', () => {
    authService.getCurrentUser.mockResolvedValue(null); // Simulate no active session
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('null');
  });

  it('handles successful login and updates context', async () => {
    renderWithProviders(<TestComponent />);
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true'));
    expect(screen.getByTestId('username')).toHaveTextContent('testuser');
    expect(localStorage.getItem('token')).toBe('test-token');
    expect(authService.login).toHaveBeenCalledWith({ username: 'testuser', password: 'password' });
  });

  it('handles failed login and sets an error message', async () => {
    const error = new Error('Invalid credentials');
    authService.login.mockRejectedValue(error);
    renderWithProviders(<TestComponent />);
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials'));
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('handles successful logout and clears context', async () => {
    localStorage.setItem('token', 'test-token');
    renderWithProviders(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true'));
    fireEvent.click(screen.getByText('Logout'));
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'));
    expect(screen.getByTestId('username')).toHaveTextContent('null');
    expect(localStorage.getItem('token')).toBeNull();
    expect(notificationService.disconnect).toHaveBeenCalled();
  });

  it('toggles theme between light and dark', async () => {
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    fireEvent.click(screen.getByText('Toggle Theme'));
    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('dark'));
    fireEvent.click(screen.getByText('Toggle Theme'));
    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('light'));
  });

  it('loads notifications on mount', async () => {
    localStorage.setItem('token', 'test-token');
    notificationService.getNotifications.mockResolvedValue([{ id: '1', message: 'Test' }]);
    renderWithProviders(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId('notification-count')).toHaveTextContent('1'));
  });

  it('restores an active session from a token on mount', async () => {
    localStorage.setItem('token', 'test-token');
    renderWithProviders(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true'));
    expect(authService.getCurrentUser).toHaveBeenCalled();
    expect(screen.getByTestId('username')).toHaveTextContent('testuser');
  });
});
