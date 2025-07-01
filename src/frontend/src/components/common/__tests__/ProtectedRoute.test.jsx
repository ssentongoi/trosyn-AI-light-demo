import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import AppContext from '../../../contexts/AppContext';

// Mock the Navigate component to spy on its props
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    Navigate: (props) => {
      mockNavigate(props);
      // Render a div to confirm Navigate was called in the DOM
      return <div data-testid="navigate-mock" />;
    },
  };
});

// Helper to render with context and router
const renderComponent = (contextValue, route, routeProps = {}) => {
  const initialEntries = [route || '/protected'];
  return render(
    <AppContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute {...routeProps}>
                <div data-testid="protected-content" />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    </AppContext.Provider>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders children when user is authenticated', () => {
    renderComponent({ isAuthenticated: true, user: {}, loading: false });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows loading spinner when loading', () => {
    renderComponent({ isAuthenticated: false, loading: true });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login by default', () => {
    const route = { pathname: '/protected' };
    renderComponent({ isAuthenticated: false, loading: false }, route);
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login', state: { from: expect.any(Object) }, replace: true });
  });

  it('renders children when user has a required role', () => {
    const context = { isAuthenticated: true, user: { roles: ['admin'] }, loading: false };
    renderComponent(context, null, { roles: ['admin'] });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects when user does not have a required role', () => {
    const context = { isAuthenticated: true, user: { roles: ['user'] }, loading: false };
    renderComponent(context, null, { roles: ['admin'] });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/unauthorized', state: { from: expect.any(Object) }, replace: true });
  });

  it('uses custom redirect paths when provided', () => {
    // Test custom login redirect
    renderComponent({ isAuthenticated: false, loading: false }, null, { redirectTo: '/custom-login' });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/custom-login', state: { from: expect.any(Object) }, replace: true });
    mockNavigate.mockClear();

    // Test custom unauthorized redirect
    const context = { isAuthenticated: true, user: { roles: ['user'] }, loading: false };
    renderComponent(context, null, { roles: ['admin'], unauthorizedRedirectTo: '/no-access' });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/no-access', state: { from: expect.any(Object) }, replace: true });
  });
});
