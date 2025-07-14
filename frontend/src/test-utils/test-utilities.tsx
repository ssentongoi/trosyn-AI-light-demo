import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
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
    createdAt: now,
    read: false,
    ...overrides,
  };
};

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Using gcTime instead of cacheTime in newer versions
        staleTime: 0,
      },
    },
  });

  const theme = createTheme();

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

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

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
