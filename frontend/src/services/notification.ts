import { useCallback, useEffect, useRef } from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { AnyWebSocketMessage, WebSocketMessage } from '../types/websocket';

// Browser-compatible event emitter implementation
class BrowserEventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  off(event: string, listener: Function) {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

// Create an event emitter instance for real-time notifications
const notificationEmitter = new BrowserEventEmitter();

// Type definitions for notification service
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  [key: string]: boolean;
}

export interface NotificationType {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
}

interface NotificationService {
  isConnected: boolean;
  initialize(token: string): void;
  subscribe<T = any>(callback: (notification: T) => void, type?: string): () => void;
  getNotifications(params?: Record<string, any>): Promise<Notification[]>;
  getUnreadCount(): Promise<number>;
  markAsRead(notificationId: string): Promise<Notification>;
  markAllAsRead(): Promise<{ count: number }>;
  deleteNotification(notificationId: string): Promise<void>;
  clearAll(): Promise<void>;
  getPreferences(): Promise<NotificationPreferences>;
  updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
  testNotification(type: string): Promise<{ success: boolean }>;
  getNotificationTypes(): Promise<NotificationType[]>;
  sendToUsers(data: Omit<Notification, 'id' | 'read' | 'createdAt' | 'updatedAt'>, userIds: string[]): Promise<{ success: boolean }>;
  broadcast(data: Omit<Notification, 'id' | 'read' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean }>;
  disconnect(): void;
  sendNotification<T = any>(type: string, data?: Record<string, any>): boolean;
}

// Create a custom hook for notification service
export const useNotificationService = (): NotificationService => {
  const { isConnected, sendMessage, on: wsOn } = useWebSocketContext();
  const isInitialized = useRef(false);

  // Initialize WebSocket event listeners
  useEffect(() => {
    if (!isInitialized.current && isConnected) {
      // Handle incoming notifications
      const handleNotification = (message: AnyWebSocketMessage) => {
        notificationEmitter.emit('notification', message);
        
        // Emit specific event based on notification type
        if (message.type) {
          notificationEmitter.emit(message.type, message);
        }
      };
      
      // Subscribe to all messages
      const cleanup = wsOn('*', handleNotification);
      
      // Mark as initialized
      isInitialized.current = true;
      
      // Cleanup on unmount
      return () => {
        cleanup();
        isInitialized.current = false;
      };
    }
  }, [isConnected, wsOn]);

  // Send a notification through WebSocket
  const sendNotification = useCallback(<T = any>(
    type: string, 
    data: Record<string, any> = {}
  ): boolean => {
    const message: WebSocketMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: new Date().toISOString(),
      ...data
    };
    return sendMessage(message);
  }, [sendMessage]);

  // Subscribe to a specific notification type
  const subscribe = useCallback(<T = any>(
    callback: (message: T) => void, 
    type: string = '*'
  ): (() => void) => {
    notificationEmitter.on(type, callback);
    return () => {
      notificationEmitter.off(type, callback);
    };
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((recipientId: string, isTyping: boolean = true): boolean => {
    return sendNotification('typing', {
      recipient_id: recipientId,
      is_typing: isTyping
    });
  }, [sendNotification]);

  // Send a direct message
  const sendDirectMessage = useCallback((recipientId: string, message: string): boolean => {
    return sendNotification('message', {
      recipient_id: recipientId,
      message
    });
  }, [sendNotification]);

  // Subscribe to a channel or topic
  const subscribeToChannel = useCallback((channel: string): boolean => {
    return sendNotification('subscribe', {
      channel
    });
  }, [sendNotification]);

  // Initialize the notification service
  const initialize = useCallback((token: string) => {
    // The actual WebSocket connection is handled by the WebSocketProvider
    // This is just for backward compatibility
    console.log('Notification service initialized with token');
  }, []);

  // API methods
  const getNotifications = useCallback(async (params: Record<string, any> = {}): Promise<Notification[]> => {
    // Implementation depends on your API
    return [];
  }, []);

  const getUnreadCount = useCallback(async (): Promise<number> => {
    // Implementation depends on your API
    return 0;
  }, []);

  const markAsRead = useCallback(async (notificationId: string): Promise<Notification> => {
    // Implementation depends on your API
    return {} as Notification;
  }, []);

  const markAllAsRead = useCallback(async (): Promise<{ count: number }> => {
    // Implementation depends on your API
    return { count: 0 };
  }, []);

  const deleteNotification = useCallback(async (notificationId: string): Promise<void> => {
    // Implementation depends on your API
  }, []);

  const clearAll = useCallback(async (): Promise<void> => {
    // Implementation depends on your API
  }, []);

  const getPreferences = useCallback(async (): Promise<NotificationPreferences> => {
    // Implementation depends on your API
    return {
      email: true,
      push: true,
      inApp: true
    };
  }, []);

  const updatePreferences = useCallback(async (
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> => {
    // Implementation depends on your API
    return {
      email: true,
      push: true,
      inApp: true,
      ...preferences
    };
  }, []);

  const testNotification = useCallback(async (type: string): Promise<{ success: boolean }> => {
    // Implementation depends on your API
    return { success: true };
  }, []);

  const getNotificationTypes = useCallback(async (): Promise<NotificationType[]> => {
    // Implementation depends on your API
    return [];
  }, []);

  const sendToUsers = useCallback(async (
    data: Omit<Notification, 'id' | 'read' | 'createdAt' | 'updatedAt'>,
    userIds: string[]
  ): Promise<{ success: boolean }> => {
    // Implementation depends on your API
    return { success: true };
  }, []);

  const broadcast = useCallback(async (
    data: Omit<Notification, 'id' | 'read' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean }> => {
    // Implementation depends on your API
    return { success: true };
  }, []);

  const disconnect = useCallback((): void => {
    // The WebSocket connection is managed by the WebSocketProvider
    // This is just for backward compatibility
    console.log('Notification service disconnected');
  }, []);

  return {
    isConnected,
    initialize,
    subscribe,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    getPreferences,
    updatePreferences,
    testNotification,
    getNotificationTypes,
    sendToUsers,
    broadcast,
    disconnect,
    // Send notification method
    sendNotification,
  };
};

// For backward compatibility with existing code
export const notificationService: NotificationService = {
  isConnected: false,
  initialize: () => {},
  subscribe: () => () => {},
  getNotifications: async () => [],
  getUnreadCount: async () => 0,
  markAsRead: async () => ({
    id: '',
    type: '',
    title: '',
    message: '',
    read: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }),
  markAllAsRead: async () => ({ count: 0 }),
  deleteNotification: async () => {},
  clearAll: async () => {},
  getPreferences: async () => ({
    email: true,
    push: true,
    inApp: true
  }),
  updatePreferences: async (prefs) => ({
    email: true,
    push: true,
    inApp: true,
    ...prefs
  }),
  testNotification: async () => ({ success: true }),
  getNotificationTypes: async () => [],
  sendToUsers: async () => ({ success: true }),
  broadcast: async () => ({ success: true }),
  disconnect: () => {},
  sendNotification: () => true,
};

export { notificationEmitter };

export default notificationService;
