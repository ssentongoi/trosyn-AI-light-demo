import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter as Router } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';

// Mock the API module
jest.mock('./services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {
    baseURL: 'http://localhost:8000/api',
  },
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
}));

// Mock the notification service
jest.mock('./services/notification', () => {
  const originalModule = jest.requireActual('./services/notification');
  return {
    ...originalModule,
    initialize: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn((callback) => () => {}),
    getNotifications: jest.fn().mockResolvedValue([]),
    markAsRead: jest.fn().mockResolvedValue({}),
    markAllAsRead: jest.fn().mockResolvedValue({}),
    deleteNotification: jest.fn().mockResolvedValue({}),
  };
});

// A simplified test renderer that doesn't use the wrapper pattern
const customRender = (
  ui,
  {
    initialState = {
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
    },
    route = '/',
    ...renderOptions
  } = {}
) => {
  // Mock the window.matchMedia function used by some components
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock the Notification API
  Object.defineProperty(window, 'Notification', {
    writable: true,
    value: {
      permission: 'default',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    },
  });

  // Mock the localStorage API
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Set the URL for testing routes
  window.history.pushState({}, 'Test page', route);

  // Create a test component that wraps the UI with providers
  const TestProviders = ({ children }) => (
    <Router>
      <AppProvider initialState={initialState}>
        {children}
      </AppProvider>
    </Router>
  );

  // Render the UI with the test providers
  const result = render(
    <TestProviders>
      {ui}
    </TestProviders>,
    renderOptions
  );

  // Return the render result with our custom utilities
  return {
    ...result,
    localStorage: localStorageMock,
    // Add a custom rerender function
    rerender: (newUi, newOptions) => 
      result.rerender(
        <TestProviders>
          {newUi}
        </TestProviders>,
        newOptions
      ),
  };
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override the render method
export { customRender as render };

// Utility functions for testing
export const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  roles: ['user'],
  avatar: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockCompany = {
  id: '1',
  name: 'Test Company',
  domain: 'testcompany.com',
  logo: null,
  settings: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockNotification = {
  id: '1',
  title: 'Test Notification',
  message: 'This is a test notification',
  type: 'info',
  read: false,
  createdAt: new Date().toISOString(),
};

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));
