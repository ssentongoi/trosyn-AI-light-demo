import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthRoute from '../AuthRoute';
import AppContext from '../../../contexts/AppContext';

// Mock the Navigate component to spy on its props
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  ...vi.requireActual('react-router-dom'),
  Navigate: (props) => {
    mockNavigate(props);
    return <div data-testid="navigate-mock" />;
  },
}));

// Helper to render with context and router
const renderComponent = (contextValue, route) => {
  const initialEntries = route ? [route] : ['/'];
  return render(
    <AppContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthRoute>
          <div data-testid="auth-content" />
        </AuthRoute>
      </MemoryRouter>
    </AppContext.Provider>
  );
};

describe('AuthRoute', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders children when user is not authenticated', () => {
    renderComponent({ isAuthenticated: false, loading: false });
    expect(screen.getByTestId('auth-content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows loading spinner when loading', () => {
    renderComponent({ isAuthenticated: false, loading: true });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-content')).not.toBeInTheDocument();
  });

  it('redirects authenticated users to the `from` location if available', () => {
    const fromLocation = { pathname: '/protected-route' };
    const route = { pathname: '/login', state: { from: fromLocation } };
    renderComponent({ isAuthenticated: true, loading: false }, route);

    expect(mockNavigate).toHaveBeenCalledWith({ to: fromLocation.pathname, replace: true });
  });

  it('redirects authenticated users to `/` if no `from` location is available', () => {
    renderComponent({ isAuthenticated: true, loading: false });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/', replace: true });
  });
});
