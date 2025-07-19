import { vi } from 'vitest';

export class NotificationService {
  notify = vi.fn();
  subscribe = vi.fn().mockImplementation(() => () => {}); // Return unsubscribe function
  unsubscribe = vi.fn();
  clear = vi.fn();
  getNotifications = vi.fn().mockResolvedValue([]);
  markAsRead = vi.fn().mockResolvedValue(undefined);
  markAllAsRead = vi.fn().mockResolvedValue(undefined);
  deleteNotification = vi.fn().mockResolvedValue(undefined);
  connect = vi.fn().mockResolvedValue(undefined);
  disconnect = vi.fn().mockResolvedValue(undefined);
  on = vi.fn().mockImplementation(() => () => {});
  off = vi.fn().mockResolvedValue(undefined);
  
  // Add any other methods that your notification service has
  emit = vi.fn();
  removeListener = vi.fn();
  removeAllListeners = vi.fn();
}

// Create a default instance for default export
export const notificationService = new NotificationService();

export default notificationService;
