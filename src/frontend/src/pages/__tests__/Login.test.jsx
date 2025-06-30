import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock CSS imports
jest.mock('../../Auth.css', () => ({}));

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockUseNavigate = () => mockNavigate;
const mockLink = ({ children, ...props }) => <a {...props}>{children}</a>;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: mockUseNavigate,
  Link: mockLink,
}));

// Mock AuthContext
const mockLogin = jest.fn().mockResolvedValue({ success: true });
const mockLogout = jest.fn();
const mockRefreshToken = jest.fn();

// Import the actual Login component after setting up mocks
let Login;

beforeAll(async () => {
  // Mock the AuthContext before importing Login
  jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
      currentUser: null,
      loading: false,
      error: null,
      login: mockLogin,
      logout: mockLogout,
      refreshToken: mockRefreshToken,
    }),
  }));

  // Now import the Login component
  const LoginModule = await import('../Login');
  Login = LoginModule.default;
});

// Test helper function to render the Login component
const renderLogin = () => {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders the login form', () => {
    renderLogin();
    
    // Check if the form elements are rendered
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    renderLogin();

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
    });

    // Check if login was called with correct credentials
    expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
  });

  it('navigates to dashboard on successful login', async () => {
    // Mock a successful login
    mockLogin.mockResolvedValueOnce({ success: true });
    
    renderLogin();

    // Fill in and submit the form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
    });

    // Check if navigation occurred
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('displays an error message on login failure', async () => {
    // Mock a failed login
    const errorMessage = 'Invalid username or password';
    mockLogin.mockResolvedValueOnce({
      success: false,
      message: errorMessage,
    });

    renderLogin();

    // Fill in and submit the form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
    });

    // Check for error message
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  it('shows loading state during form submission', async () => {
    // Create a promise that we can resolve later
    let resolveLogin;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    
    mockLogin.mockImplementationOnce(() => loginPromise);
    
    renderLogin();
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Check if loading state is shown
    expect(screen.getByRole('button', { name: /logging in.../i })).toBeInTheDocument();
    
    // Resolve the login promise
    await act(async () => {
      resolveLogin({ success: true });
      await loginPromise;
    });
  });

  it('handles unexpected errors', async () => {
    // Mock an error during login
    mockLogin.mockRejectedValueOnce(new Error('Network error'));
    
    renderLogin();
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/username/i), { 
      target: { value: 'testuser' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'password123' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Check that the error message is displayed
    expect(await screen.findByText(/an unexpected error occurred/i)).toBeInTheDocument();
  });
});
