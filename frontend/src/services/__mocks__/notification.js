import { EventEmitter } from 'events';

const notificationEmitter = new EventEmitter();

export default {
  initialize: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn((callback) => {
    notificationEmitter.on('notification', callback);
    return () => notificationEmitter.off('notification', callback);
  }),
  getNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  clearAll: jest.fn(),
  getPreferences: jest.fn(),
  updatePreferences: jest.fn(),
  testNotification: jest.fn(),
  getNotificationTypes: jest.fn(),
  sendToUsers: jest.fn(),
  broadcast: jest.fn(),
};

export { notificationEmitter };
