import { vi, describe, beforeEach, it, expect } from 'vitest';
import { notificationService } from '../notificationService';
import type { Notification, NotificationOptions } from '../../types/notifications';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  readyState: number;
  url: string;

  constructor(url: string) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    MockWebSocket.instances.push(this);
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data: string) {
    // Handle authentication
    if (data.includes('auth')) {
      const response = JSON.stringify({ type: 'auth_success' });
      if (this.onmessage) this.onmessage({ data: response });
    }
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

global.WebSocket = MockWebSocket as any;

describe('NotificationService', () => {
  let testNotification: Notification;
  
  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
    
    // Reset notification service state
    notificationService.clear();
    
    // Create a test notification
    testNotification = {
      id: 'test-1',
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification',
      read: false,
      createdAt: new Date().toISOString(),
    };
  });

  it('should initialize WebSocket connection', async () => {
    notificationService.connect('test-token');
    
    // Wait for connection to be established
    await new Promise(resolve => setTimeout(resolve, 20));
    
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toContain('/ws/notifications');
  });

  it('should add and retrieve notifications', () => {
    const id = notificationService.show({
      type: 'info',
      title: 'Test',
      message: 'Test message',
    });
    
    const notifications = notificationService.getNotifications();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe(id);
  });

  it('should mark notifications as read', () => {
    const id = notificationService.show(testNotification);
    notificationService.markAsRead(id);
    
    const notification = notificationService.getNotifications().find(n => n.id === id);
    expect(notification?.read).toBe(true);
  });

  it('should mark all notifications as read', () => {
    // Add multiple notifications
    notificationService.show({ ...testNotification, id: '1' });
    notificationService.show({ ...testNotification, id: '2' });
    
    notificationService.markAllAsRead();
    
    const notifications = notificationService.getNotifications();
    expect(notifications.every(n => n.read)).toBe(true);
  });

  it('should handle WebSocket messages', async () => {
    const callback = vi.fn();
    notificationService.subscribe(callback);
    
    // Simulate incoming WebSocket message
    const ws = MockWebSocket.instances[0];
    const message = {
      type: 'new_notification',
      data: testNotification
    };
    
    if (ws.onmessage) {
      ws.onmessage({ data: JSON.stringify(message) });
    }
    
    // Wait for the message to be processed
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(callback).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: testNotification.id })
    ]));
  });

  it('should handle WebSocket disconnection', async () => {
    notificationService.connect('test-token');
    await new Promise(resolve => setTimeout(resolve, 20));
    
    const ws = MockWebSocket.instances[0];
    notificationService.disconnect();
    
    expect(ws.readyState).toBe(WebSocket.CLOSED);
  });

  it('should handle reconnection on connection loss', async () => {
    notificationService.connect('test-token');
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // Simulate connection loss
    const ws = MockWebSocket.instances[0];
    if (ws.onclose) ws.onclose();
    
    // Should attempt to reconnect
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
  });
});
