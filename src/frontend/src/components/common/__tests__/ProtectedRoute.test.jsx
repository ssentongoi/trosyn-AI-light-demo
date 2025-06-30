import React from 'react';
import { render, screen, waitFor } from '../../../test-utils';
import ProtectedRoute from '../ProtectedRoute';
import { useApp } from '../../../contexts/AppContext';

// Mock child component
const MockComponent = () => <div data-testid="protected-content">Protected Content</div>;

// Mock the useApp hook
jest.mock('../../../contexts/AppContext', () => ({
  useApp: jest.fn(),
}));

describe('ProtectedRoute', () => {
  const mockUseApp = useApp;
  const mockNavigate = jest.fn();

  beforeEach(() => {
    // Mock the useNavigate hook
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
      useLocation: () => ({
        pathname: '/protected',
        state: { from: { pathname: '/protected' } },
      }),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when user is authenticated and has required role', () => {
    // Mock authenticated user with required role
    mockUseApp.mockReturnValue({
      isAuthenticated: true,
      user: { roles: ['admin'] },
      loading: false,
    });

    render(
      <ProtectedRoute roles={['admin']}>
        <MockComponent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    // Mock unauthenticated user
    mockUseApp.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
    });

    render(
      <ProtectedRoute>
        <MockComponent />
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      '/login',
      {
        replace: true,
        state: { from: { pathname: '/protected' } }
      }
    );
  });

  it('shows loading spinner while checking authentication', () => {
    // Mock loading state
    mockUseApp.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: true,
    });

    render(
      <ProtectedRoute>
        <MockComponent />
      </ProtectedRoute>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to unauthorized page when user does not have required role', () => {
    // Mock authenticated user without required role
    mockUseApp.mockReturnValue({
      isAuthenticated: true,
      user: { roles: ['user'] }, // Doesn't have 'admin' role
      loading: false,
    });

    render(
      <ProtectedRoute roles={['admin']} unauthorizedRedirectTo="/unauthorized">
        <MockComponent />
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      '/unauthorized',
      {
        replace: true,
        state: { from: { pathname: '/protected' } }
      }
    );
  });

  it('uses custom redirect path when provided', () => {
    // Mock unauthenticated user
    mockUseApp.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
    });

    render(
      <ProtectedRoute redirectTo="/custom-login">
        <MockComponent />
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      '/custom-login',
      {
        replace: true,
        state: { from: { pathname: '/protected' } }
      }
    );
  });
});
