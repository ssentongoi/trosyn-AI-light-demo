import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  vi, 
  describe, 
  it, 
  expect, 
  beforeEach, 
  afterEach, 
  beforeAll, 
  afterAll 
} from 'vitest';
import { createNotificationServiceMocks, mockNotifications } from '../../test-utils/mocks/notificationService';

// ====================
// MOCKS
// ====================

// Mock MUI components
vi.mock('@mui/material/Dialog', () => ({
  __esModule: true,
  default: ({ children, onClose }: any) => (
    <div data-testid="dialog" onClick={onClose}>
      {children}
    </div>
  ),
}));

vi.mock('@mui/material/Tab', () => ({
  __esModule: true,
  default: ({ label, value, onChange }: any) => (
    <button 
      data-testid={`tab-${value}`} 
      onClick={(e) => onChange && onChange(e, value)}
    >
      {label}
    </button>
  ),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}));

// ====================
// TEST SETUP
// ====================

// Store the original setImmediate and clearImmediate
const originalSetImmediate = global.setImmediate;
const originalClearImmediate = global.clearImmediate;

// ResizeObserver polyfill
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Notification mocks
let notificationMocks = createNotificationServiceMocks({
  getNotifications: vi.fn().mockResolvedValue(mockNotifications),
  getUnreadCount: vi.fn().mockReturnValue(1),
  subscribe: vi.fn(() => vi.fn()),
});

// Mock the notification service module
vi.mock('../../services/notificationService', () => ({
  __esModule: true,
  default: notificationMocks,
}));

// ====================
// TEST SUITE
// ====================

describe('NotificationsPage', () => {
  let NotificationsPage: React.ComponentType;
  
  beforeAll(async () => {
    // Mock globals
    global.ResizeObserver = ResizeObserver;
    
    // Dynamically import the component after setting up mocks
    const module = await import('../NotificationsPage');
    NotificationsPage = module.default;
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset notification service mocks
    notificationMocks.getNotifications.mockResolvedValue([...mockNotifications]);
    notificationMocks.getUnreadCount.mockReturnValue(1);
    notificationMocks.subscribe.mockImplementation((callback) => {
      // Call the callback immediately with current notifications
      Promise.resolve().then(() => callback([...mockNotifications]));
      return vi.fn();
    });
  });

  afterEach(() => {
    // Clean up any timers
    vi.clearAllTimers();
    // Ensure all pending promises are resolved
    return new Promise(resolve => setTimeout(resolve, 0));
  });

  afterAll(() => {
    // Restore original globals
    vi.restoreAllMocks();
    // @ts-expect-error - Cleaning up mock
    delete global.ResizeObserver;
  });

  // ====================
  // TEST UTILITIES
  // ====================
  
  const renderComponent = async (props = {}) => {
    let result;
    
    await act(async () => {
      result = render(
        <div data-testid="notifications-page">
          <NotificationsPage {...props} />
        </div>
      );
      // Allow any pending state updates to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    return result!;
  };

  // ====================
  // TESTS
  // ====================

  it('renders notifications page', async () => {
    // Act
    await renderComponent();
    
    // Assert
    expect(screen.getByTestId('notifications-page')).toBeInTheDocument();
    await waitFor(() => {
      expect(notificationMocks.getNotifications).toHaveBeenCalledTimes(1);
    });
  });

  it('displays notifications from mock service', async () => {
    // Arrange
    const customNotifications = [
      { ...mockNotifications[0], id: '1', message: 'Test 1' },
      { ...mockNotifications[1], id: '2', message: 'Test 2' },
    ];
    notificationMocks.getNotifications.mockResolvedValueOnce(customNotifications);

    // Act
    await renderComponent();
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('Test 1')).toBeInTheDocument();
      expect(screen.getByText('Test 2')).toBeInTheDocument();
    });
  });

  it('subscribes to notification updates on mount', async () => {
    // Arrange
    const subscribeCallback = vi.fn();
    notificationMocks.subscribe.mockImplementation((callback) => {
      subscribeCallback();
      callback([...mockNotifications]);
      return vi.fn();
    });

    // Act
    await renderComponent();
    
    // Assert
    await waitFor(() => {
      expect(notificationMocks.subscribe).toHaveBeenCalledTimes(1);
      expect(subscribeCallback).toHaveBeenCalled();
    });
  });

  it('cleans up subscription on unmount', async () => {
    // Arrange
    const unsubscribe = vi.fn();
    notificationMocks.subscribe.mockReturnValueOnce(unsubscribe);

    // Act
    const { unmount } = await renderComponent();
    unmount();
    
    // Assert
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('handles empty notifications state', async () => {
    // Arrange
    notificationMocks.getNotifications.mockResolvedValueOnce([]);
    
    // Act
    await renderComponent();
    
    // Assert
    await waitFor(() => {
      expect(screen.queryByText(/no notifications/i)).toBeInTheDocument();
    });
  });

  it('handles notification service errors gracefully', async () => {
    // Arrange
    const errorMessage = 'Failed to load notifications';
    notificationMocks.getNotifications.mockRejectedValueOnce(new Error(errorMessage));
    
    // Spy on console.error to prevent test output pollution
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Act
    await renderComponent();
    
    // Assert
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error loading notifications:',
        expect.any(Error)
      );
    });
    
    // Cleanup
    consoleErrorSpy.mockRestore();
  });
});

