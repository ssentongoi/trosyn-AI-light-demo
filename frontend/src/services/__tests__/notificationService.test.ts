import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';
import type { Notification, NotificationService } from '../../types/notifications';

// This variable will hold the actual service instance for each test.
let notificationService: NotificationService;

// --- Mock WebSocket setup ---
global.WebSocket = vi.fn(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
})) as any;


describe('NotificationService (Isolated)', () => {
  beforeEach(async () => {
    // Reset modules to ensure we get a fresh, un-mocked instance of the service.
    vi.resetModules();
    const actualServiceModule = (await vi.importActual(
      '../notificationService'
    )) as { default: NotificationService };
    notificationService = actualServiceModule.default;
    
    // Clear any previous state or mocks.
    vi.clearAllMocks();
    notificationService.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should add and retrieve a notification', () => {
    const notificationId = notificationService.show({
      title: 'Success',
      message: 'Your document has been saved.',
      type: 'success',
    });

    const allNotifications = notificationService.getNotifications();
    expect(allNotifications).toHaveLength(1);
    expect(allNotifications[0].id).toBe(notificationId);
    expect(allNotifications[0].message).toBe('Your document has been saved.');
  });

  it('should clear all notifications', () => {
    notificationService.show({ title: 'Info', message: 'First message' });
    notificationService.show({ title: 'Warning', message: 'Second message' });

    expect(notificationService.getNotifications()).toHaveLength(2);

    notificationService.clear();
    expect(notificationService.getNotifications()).toHaveLength(0);
  });

  it('should mark a notification as read', () => {
    const notificationId = notificationService.show({ title: 'Test', message: 'Mark me as read' });
    notificationService.markAsRead(notificationId);
    const notification = notificationService.getNotifications()[0];
    expect(notification.read).toBe(true);
  });

  it('should subscribe to and receive updates', () => {
    const subscriberCallback = vi.fn();
    const unsubscribe = notificationService.subscribe(subscriberCallback);

    // The subscriber should be called immediately with the current state.
    expect(subscriberCallback).toHaveBeenCalledWith([]);

    // Add a notification and check if the subscriber is called again.
    notificationService.show({ title: 'Update', message: 'A new update!' });
    expect(subscriberCallback).toHaveBeenCalledTimes(2);
    expect(subscriberCallback).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ message: 'A new update!' })]));

    // Unsubscribe and ensure the callback is no longer called.
    unsubscribe();
    notificationService.show({ title: 'Final', message: 'This should not be received.' });
    expect(subscriberCallback).toHaveBeenCalledTimes(2);
  });

  it('should connect to WebSocket with a token', () => {
    notificationService.connect('test-jwt-token');
    expect(global.WebSocket).toHaveBeenCalledWith(expect.stringContaining('/ws/notifications?token=test-jwt-token'));
  });
});

