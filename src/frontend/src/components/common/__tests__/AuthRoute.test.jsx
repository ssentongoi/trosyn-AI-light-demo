import React from 'react';
import { render, screen, waitFor } from '../../../../test-utils';
import AuthRoute from '../AuthRoute';
import { useApp } from '../../../contexts/AppContext';

// Mock child component
const MockComponent = () => <div data-testid="auth-content">Public Content</div>;

// Mock the useApp hook
jest.mock('../../../contexts/AppContext', () => ({
  useApp: jest.fn(),
}));

describe('AuthRoute', () => {
  const mockUseApp = useApp;
  const mockNavigate = jest.fn();

  beforeEach(() => {
    // Mock the useNavigate hook
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
      useLocation: () => ({
        pathname: '/login',
        state: { from: { pathname: '/dashboard' } },
      }),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when user is not authenticated', () => {
    // Mock unauthenticated user
    mockUseApp.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
    });

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
    mockUseApp.mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', username: 'testuser' },
      loading: false,
    });

    render(
      <AuthRoute>
        <MockComponent />
      </AuthRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    expect(screen.queryByTestId('auth-content')).not.toBeInTheDocument();
  });

  it('redirects to custom path when user is authenticated and redirectTo is provided', () => {
    // Mock authenticated user
    mockUseApp.mockReturnValue({
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
    mockUseApp.mockReturnValue({
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
    // Mock authenticated user with location state
    mockUseApp.mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', username: 'testuser' },
      loading: false,
    });

    // Mock useLocation with a from state
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useLocation: () => ({
        pathname: '/login',
        state: { from: { pathname: '/protected-page' } },
      }),
    }));

    render(
      <AuthRoute>
        <MockComponent />
      </AuthRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      '/',
      { 
        replace: true,
        state: { from: { pathname: '/protected-page' } }
      }
    );
  });
});
