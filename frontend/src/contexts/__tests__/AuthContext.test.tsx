import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock the environment configuration
vi.mock('../../config/env', () => ({
  env: {
    IS_BROWSER: true,
    IS_APP: false,
    IS_DEVELOPMENT: true,
    IS_PRODUCTION: false,
    FEATURES: {
      USE_MOCK_SERVICES: true
    }
  }
}));

// Import the mocked module after setting up the mock
import { env } from '../../config/env';

// Mock the env object for dynamic updates
const mockEnv = vi.mocked(env, true);
import { AuthProvider, useAuth } from '../AuthContext';

// Mock the secure storage module
const mockSecureSetItem = vi.fn().mockResolvedValue(undefined);
const mockSecureGetItem = vi.fn().mockResolvedValue(null);
const mockSecureRemoveItem = vi.fn().mockResolvedValue(undefined);

vi.mock('../../utils/secureStorage', () => ({
  secureSetItem: mockSecureSetItem,
  secureGetItem: mockSecureGetItem,
  secureRemoveItem: mockSecureRemoveItem,
  memoryStorage: {}
}));

// Mock the auth service
const mockLogin = vi.fn().mockResolvedValue({
  token: 'mock-jwt-token',
  user: { 
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'test',
    role: 'admin' 
  }
});

const mockLogout = vi.fn().mockResolvedValue(undefined);

const mockGetCurrentUser = vi.fn().mockResolvedValue({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'test',
  role: 'admin'
});

vi.mock('../../services/authService', () => ({
  login: mockLogin,
  logout: mockLogout,
  getCurrentUser: mockGetCurrentUser
}));

// Mock react-router-dom is now at the bottom of the file

// Mock the router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as object,
    useNavigate: () => mockNavigate,
  };
});

// Mock the console.error to avoid polluting test output
const originalConsoleError = console.error;
const consoleErrorMock = vi.fn((...args) => {
  // Ignore specific error messages if needed
  const errorMessage = args[0]?.toString() || '';
  if (!errorMessage.includes('Auth initialization error')) {
    originalConsoleError(...args);
  }
});

beforeAll(() => {
  console.error = consoleErrorMock;
});

afterAll(() => {
  console.error = originalConsoleError;
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Reset the DOM
  document.body.innerHTML = '';
  
  // Reset the mock implementations
  mockSecureGetItem.mockResolvedValue(null);
  mockSecureSetItem.mockResolvedValue(undefined);
  mockSecureRemoveItem.mockResolvedValue(undefined);
  mockNavigate.mockClear();
});

// Test component that uses the auth context
const TestComponent = () => {
  const { 
    currentUser, 
    isAuthenticated, 
    login, 
    logout, 
    hasRole,
    loading,
    error
  } = useAuth();

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user-email">{currentUser?.email || 'no-user'}</div>
      <div data-testid="is-authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <button 
        onClick={() => login('test@example.com', 'password')}
        data-testid="login-button"
      >
        Login
      </button>
      <button 
        onClick={logout}
        data-testid="logout-button"
      >
        Logout
      </button>
      <div data-testid="has-admin-role">
        {hasRole('admin') ? 'admin' : 'not-admin'}
      </div>
    </div>
  );
};

describe('AuthContext', () => {

  it('should provide initial auth state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state should be unauthenticated
    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe('no-user');
      expect(screen.getByTestId('is-authenticated').textContent).toBe('no');
    });
  });

  it('should handle login and store token', async () => {
    // Set up test environment
    mockEnv.IS_BROWSER = true;
    mockEnv.IS_DEVELOPMENT = true;
    
    // Mock localStorage for development mode
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    // Set a mock token in localStorage
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'dev_auth_token') return 'mock-dev-token';
      return null;
    });
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    // Mock the login response
    mockSecureSetItem.mockResolvedValue(undefined);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // Click login button
    const loginButton = screen.getByTestId('login-button');
    await act(async () => {
      loginButton.click();
    });

    // Check that the user is now authenticated
    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe('test@example.com');
      expect(screen.getByTestId('is-authenticated').textContent).toBe('yes');
      // In dev mode, user should be admin
      expect(screen.getByTestId('has-admin-role').textContent).toBe('admin');
    });
  }, 10000); // Increase timeout for this test

  it('should handle logout and clear token', async () => {
    // Set up test environment
    mockEnv.IS_BROWSER = true;
    mockEnv.IS_DEVELOPMENT = true;
    
    // Mock localStorage for development mode
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    // Set a mock token in localStorage
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'dev_auth_token') return 'mock-dev-token';
      return null;
    });
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Reset navigation mock before each test
    mockNavigate.mockClear();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // Click logout button
    const logoutButton = screen.getByTestId('logout-button');
    await act(async () => {
      logoutButton.click();
    });

    // In development mode, we use localStorage instead of secure storage
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('dev_auth_token');
    
    // Check that navigation occurred
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    
    // Check that the user is now unauthenticated
    expect(screen.getByTestId('is-authenticated').textContent).toBe('no');
  }, 10000); // Increase timeout for this test

  it('should check user roles correctly', async () => {
    // Set up test environment
    mockEnv.IS_DEVELOPMENT = true;
    
    // Mock initial state with a logged-in admin user
    mockSecureGetItem.mockResolvedValueOnce('admin-token');
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // In dev mode, user should have admin role by default
    await waitFor(() => {
      expect(screen.getByTestId('has-admin-role').textContent).toBe('admin');
    });
  });

  it('should handle initialization with existing token', async () => {
    // Set up test environment
    mockEnv.IS_BROWSER = true;
    mockEnv.IS_DEVELOPMENT = true;
    
    // Mock localStorage for development mode
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    // Set a mock token in localStorage
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'dev_auth_token') return 'mock-dev-token';
      return null;
    });
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Mock secureGetItem to simulate existing token
    mockSecureGetItem.mockImplementation(async (key: string) => {
      if (key === 'auth_token') {
        return 'existing-token';
      }
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Check that the user is authenticated after initialization
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated').textContent).toBe('yes');
      // In dev mode, we expect the default dev user
      expect(screen.getByTestId('user-email').textContent).toBe('dev@example.com');
    }, { timeout: 5000 });
  }, 10000); // Increase timeout for this test
});
