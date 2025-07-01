import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Login from '../Login';
import AppContext from '../../contexts/AppContext';

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Helper to render Login with a mock AuthContext
const renderLogin = (contextValue) => {
  return render(
    <AppContext.Provider value={contextValue}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AppContext.Provider>
  );
};

describe('Login Component', () => {
  let mockLogin;

  beforeEach(() => {
    // Reset mocks before each test
    mockLogin = jest.fn();
    mockNavigate.mockClear();
  });

  it('renders the login form correctly', () => {
    renderLogin({ login: mockLogin, error: null, loading: false });
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls login on form submission', async () => {
    renderLogin({ login: mockLogin, error: null, loading: false });

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password');
    });
  });

  it('displays an error message on login failure', async () => {
    const error = 'Invalid credentials';
    renderLogin({ login: mockLogin, error, loading: false });
    expect(screen.getByText(error)).toBeInTheDocument();
  });



  it('shows a loading state while logging in', () => {
    renderLogin({ login: mockLogin, error: null, loading: true });
    expect(screen.getByRole('button', { name: /signing in.../i })).toBeDisabled();
  });
});
