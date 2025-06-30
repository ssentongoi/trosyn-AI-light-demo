import React from 'react';
import { render, screen } from '../../../test-utils';
import AuthRoute from '../AuthRoute';
import { useApp } from '../../../contexts/AppContext';

// Mock child component
const MockComponent = () => <div data-testid="auth-content">Public Content</div>;

// Mock the useApp hook
jest.mock('../../../contexts/AppContext', () => {
  const actual = jest.requireActual('../../../contexts/AppContext');
  return {
    ...actual,
    useApp: jest.fn(() => ({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
      notifications: [],
      unreadCount: 0,
      theme: 'light',
      sidebarOpen: true,
      currentCompany: null,
      companies: [],
    })),
  };
});

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  // Spy Navigate that calls mockNavigate for test assertions
  const Navigate = ({ to, replace, state }) => {
    mockNavigate(to, { replace, state });
    return null;
  };
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/login',
      state: { from: { pathname: '/dashboard' } },
      ...(mockUseLocation() || {}),
    }),
    Navigate,
  };
});

describe('AuthRoute', () => {
  beforeEach(() => {
    useApp.mockReset();
    useApp.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
      notifications: [],
      unreadCount: 0,
      theme: 'light',
      sidebarOpen: true,
      currentCompany: null,
      companies: [],
    });
    jest.clearAllMocks();
  });
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders children when user is not authenticated', () => {
    render(
      <AuthRoute>
        <MockComponent />
      </AuthRoute>
    );

    expect(screen.getByTestId('auth-content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects to home when user is authenticated', () => {
    // Mock authenticated user
    useApp.mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', username: 'testuser' },
      loading: false,
    });

    render(
      <AuthRoute>
        <MockComponent />
      </AuthRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('redirects to custom path when user is authenticated and redirectTo is provided', () => {
    // Mock authenticated user
    useApp.mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', username: 'testuser' },
      loading: false,
    });

    render(
      <AuthRoute redirectTo="/dashboard">
        <MockComponent />
      </AuthRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('shows loading spinner while checking authentication', () => {
    // Mock loading state
    useApp.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: true,
    });

    render(
      <AuthRoute>
        <MockComponent />
      </AuthRoute>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-content')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('preserves the intended destination in location state', () => {
    // Mock location with from state
    mockUseLocation.mockReturnValue({
      pathname: '/login',
      state: { from: { pathname: '/protected-page' } },
    });
    
    // Mock authenticated user
    useApp.mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', username: 'testuser' },
      loading: false,
    });

    render(
      <AuthRoute>
        <MockComponent />
      </AuthRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/protected-page', { replace: true });
  });
});
