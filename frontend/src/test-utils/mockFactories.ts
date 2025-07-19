import { WebSocketContextType } from '../contexts/WebSocketContext';

export const createMockNotificationService = (overrides = {}) => ({
  notify: vi.fn(),
  subscribe: vi.fn(() => () => {}), // Return unsubscribe function
  unsubscribe: vi.fn(),
  clear: vi.fn(),
  getNotifications: vi.fn(() => []),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  ...overrides
});

export const createMockWebSocketContext = (overrides: Partial<WebSocketContextType> = {}): WebSocketContextType => ({
  isConnected: true,
  isConnecting: false,
  lastError: null,
  sendMessage: vi.fn(),
  on: vi.fn(() => () => {}), // Return unsubscribe function
  reconnect: vi.fn(),
  disconnect: vi.fn(),
  notificationService: createMockNotificationService(),
  ...overrides
});

export const createMockAuthService = (overrides = {}) => ({
  login: vi.fn().mockResolvedValue({ token: 'test-token', user: { id: '1', name: 'Test User' } }),
  logout: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue({ id: '1', name: 'Test User' }),
  ...overrides
});
