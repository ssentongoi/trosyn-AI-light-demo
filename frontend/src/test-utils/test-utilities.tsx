import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import { vi } from 'vitest';
import { Notification, NotificationType } from '../types/notifications';

// Mock the notification context
export const mockNotificationContext = {
  show: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  getUnreadCount: vi.fn().mockReturnValue(0),
  getNotifications: vi.fn().mockReturnValue([]),
  subscribe: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

// Create a test notification
export const createTestNotification = (overrides: Partial<Notification> = {}): Notification => {
  const id = overrides.id || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  
  return {
    id,
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'info' as NotificationType,
    timestamp: now.toISOString(),
    read: false,
    archived: false, // Ensure archived has a default value
    ...overrides,
  };
};

// Type for the wrapper component props
interface AllTheProvidersProps {
  children: ReactNode;
}

// Create a custom render function that includes providers
const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache(),
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
    },
  });

  const theme: Theme = createTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function with all the providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <AllTheProviders>{children}</AllTheProviders>
  );
  
  return render(ui, { 
    wrapper: Wrapper as React.ComponentType,
    ...options 
  });
};

// Helper function to wait for async operations
export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Mock WebSocket implementation
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  
  constructor(public url: string) {
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }
  
  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data)
      });
      this.onmessage?.(event);
    }
  }
  
  // Helper method to simulate errors
  simulateError() {
    this.readyState = MockWebSocket.CLOSED;
    this.onerror?.(new Event('error'));
  }
}

// Export everything including the custom render
export * from '@testing-library/react';
export { customRender as render };
