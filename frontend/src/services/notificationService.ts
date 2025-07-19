import type { 
  Notification, 
  NotificationOptions, 
  NotificationService, 
  NotificationPreferences 
} from '../types/notifications';

const createNotificationService = (): NotificationService => {
  let notifications: Notification[] = [];
  const subscribers: ((notifications: Notification[]) => void)[] = [];
  const timers = new Map<string, NodeJS.Timeout>();

  const notifySubscribers = () => {
    subscribers.forEach(callback => callback([...notifications]));
  };

  const remove = (id: string) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    notifications = notifications.filter(n => n.id !== id);
    notifySubscribers();
  };

  // WebSocket connection state
  let ws: WebSocket | null = null;
  let isConnected = false;

  const service: NotificationService = {
    show(options: NotificationOptions | string) {
      const id = Math.random().toString(36).substring(2, 9);
      const notificationOptions = typeof options === 'string' ? { message: options } : options;
      const now = new Date().toISOString();

      // Ensure we don't have duplicate message properties
      const { message, ...restOptions } = notificationOptions;
      
      const notification: Notification = {
        id,
        type: 'info',
        title: '',
        message: message || '', // Ensure message is always a string
        timestamp: now,
        read: false,
        archived: false,
        ...restOptions,
      };

      notifications = [notification, ...notifications];
      notifySubscribers();

      if (notification.autoDismiss) {
        const timeout = typeof notification.autoDismiss === 'number' ? notification.autoDismiss : 5000;
        const timer = setTimeout(() => remove(id), timeout);
        timers.set(id, timer);
      }

      return id;
    },

    success(message: string, options: Omit<NotificationOptions, 'type' | 'message'> = {}) {
      return this.show({ ...options, message, type: 'success' });
    },

    error(message: string, options: Omit<NotificationOptions, 'type' | 'message'> = {}) {
      return this.show({ ...options, message, type: 'error' });
    },

    warning(message: string, options: Omit<NotificationOptions, 'type' | 'message'> = {}) {
      return this.show({ ...options, message, type: 'warning' });
    },

    info(message: string, options: Omit<NotificationOptions, 'type' | 'message'> = {}) {
      return this.show({ ...options, message, type: 'info' });
    },

    remove(id: string) {
      remove(id);
    },

    clear() {
      // Clear all timers
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      
      // Clear notifications
      notifications = [];
      notifySubscribers();
    },

    markAsRead(id: string) {
      notifications = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
      notifySubscribers();
    },

    markAllAsRead() {
      notifications = notifications.map(n => ({ ...n, read: true }));
      notifySubscribers();
    },

    archive(id: string) {
      notifications = notifications.map(n => (n.id === id ? { ...n, archived: true } : n));
      notifySubscribers();
    },

    getUnreadCount() {
      return notifications.filter(n => !n.read).length;
    },

    getNotifications() {
      return [...notifications];
    },


    subscribe(callback: (notifications: Notification[]) => void) {
      subscribers.push(callback);
      callback([...notifications]); // Initial call
      
      // Return unsubscribe function
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },
    // WebSocket connection management
    connect(token: string) {
      if (ws) {
        console.warn('WebSocket already connected');
        return;
      }

      try {
        // In a real implementation, you would connect to your WebSocket server here
        // For example: ws = new WebSocket(`wss://your-api.com/ws?token=${token}`);
        console.log('Connecting to WebSocket...');
        isConnected = true;
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        isConnected = false;
      }
    },

    disconnect() {
      if (ws) {
        ws.close();
        ws = null;
        isConnected = false;
      }
    },

    // Alias for connect for backward compatibility
    initialize(token: string) {
      this.connect(token);
    },

    // Update user preferences
    async updatePreferences(preferences: NotificationPreferences): Promise<void> {
      try {
        // In a real implementation, you would save these preferences to your backend
        console.log('Updating notification preferences:', preferences);
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('Failed to update notification preferences:', error);
        throw error;
      }
    },
  };

  return service;
};

// Create and export the singleton instance
const notificationService = createNotificationService();

export default notificationService;
