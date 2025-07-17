import { vi } from 'vitest';
import type { Notification, NotificationService } from '../../../types/notifications';

export function createNotificationServiceMocks(overrides: Partial<NotificationService> = {}) {
  return {
    // Core methods
    show: vi.fn((options) => 'mock-id'),
    success: vi.fn((message, options) => 'mock-id'),
    error: vi.fn((message, options) => 'mock-id'),
    warning: vi.fn((message, options) => 'mock-id'),
    info: vi.fn((message, options) => 'mock-id'),
    
    // Management methods
    remove: vi.fn(),
    clear: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    archive: vi.fn(),
    getUnreadCount: vi.fn(() => 0),
    getNotifications: vi.fn(() => []),
    
    // Subscription
    subscribe: vi.fn(() => () => {}), // Returns unsubscribe function
    
    // WebSocket
    connect: vi.fn(),
    disconnect: vi.fn(),
    initialize: vi.fn(),
    
    // Preferences
    updatePreferences: vi.fn(),
    
    // Allow overrides
    ...overrides,
  } as unknown as NotificationService;
}

export const mockNotification: Notification = {
  id: 'test-notification-1',
  type: 'info',
  title: 'Test Notification',
  message: 'This is a test notification',
  timestamp: new Date().toISOString(),
  read: false,
  archived: false,
};

export const mockNotifications = [
  mockNotification,
  { ...mockNotification, id: 'test-notification-2', type: 'success', read: true },
  { ...mockNotification, id: 'test-notification-3', type: 'error', archived: true },
];
