import React from 'react';
import { screen, render, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createNotificationServiceMocks, mockNotifications } from '../../test-utils/mocks/notificationService';

// Mock MUI components
vi.mock('@mui/material/Dialog', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="dialog" onClick={props.onClose}>
      {props.children}
    </div>
  ),
}));

// Mock MUI Tab component
vi.mock('@mui/material/Tab', () => ({
  __esModule: true,
  default: (props: any) => (
    <button
      data-testid={`tab-${props.value}`}
      onClick={() => props.onChange({}, props.value)}
    >
      {props.label}
    </button>
  ),
}));

// Mock the notification service
let notificationMocks: ReturnType<typeof createNotificationServiceMocks>;

// Reset modules and mocks before each test
beforeEach(() => {
  vi.resetModules();
  notificationMocks = createNotificationServiceMocks({
    getNotifications: vi.fn().mockResolvedValue(mockNotifications),
    getUnreadCount: vi.fn().mockReturnValue(1),
  });
  
  vi.doMock('../../services/notificationService', () => ({
    __esModule: true,
    default: notificationMocks,
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});

// Import component after setting up mocks
let NotificationsPage: React.ComponentType;

beforeEach(async () => {
  // Dynamic import to ensure we get a fresh module with our mocks
  const module = await import('../NotificationsPage');
  NotificationsPage = module.default;
});

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}));

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Add to global scope
window.ResizeObserver = ResizeObserver;

describe('NotificationsPage', () => {
  const renderNotificationsPage = async () => {
    const result = render(
      <div data-testid="notifications-page">
        <NotificationsPage />
      </div>
    );
    
    // Wait for any async operations to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    return result;
  };

  beforeEach(() => {
    // Reset mock implementations
    notificationMocks.getNotifications.mockClear();
    notificationMocks.subscribe.mockClear();
    notificationMocks.getUnreadCount.mockClear();
    
    // Setup default mock implementations
    notificationMocks.getNotifications.mockResolvedValue(mockNotifications);
    notificationMocks.getUnreadCount.mockReturnValue(1);
    notificationMocks.subscribe.mockImplementation((callback) => {
      // Call the callback with test data
      callback(mockNotifications);
      return vi.fn(); // Return unsubscribe function
    });
  });

  it('renders the notifications page', async () => {
    // Act
    await renderNotificationsPage();
    
    // Assert
    expect(screen.getByTestId('notifications-page')).toBeInTheDocument();
  });

  it('loads notifications on mount', async () => {
    // Arrange
    const testNotifications = [
      { ...mockNotifications[0], id: 'test-1', message: 'Test notification 1' },
      { ...mockNotifications[1], id: 'test-2', message: 'Test notification 2' },
    ];
    notificationMocks.getNotifications.mockResolvedValueOnce(testNotifications);
    
    // Act
    await renderNotificationsPage();
    
    // Assert
    expect(notificationMocks.getNotifications).toHaveBeenCalled();
    await waitFor(() => {
      testNotifications.forEach(notification => {
        expect(screen.getByText(notification.message)).toBeInTheDocument();
      });
    });
  });

  it('subscribes to notification updates', async () => {
    // Act
    await renderNotificationsPage();
    
    // Assert
    expect(notificationMocks.subscribe).toHaveBeenCalled();
    expect(notificationMocks.subscribe.mock.calls[0][0]).toBeInstanceOf(Function);
  });

  it('unsubscribes on unmount', async () => {
    // Arrange
    const unsubscribeMock = vi.fn();
    notificationMocks.subscribe.mockReturnValueOnce(unsubscribeMock);
    
    // Act
    const { unmount } = render(
      <div data-testid="notifications-page">
        <NotificationsPage />
      </div>
    );
    unmount();
    
    // Assert
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
