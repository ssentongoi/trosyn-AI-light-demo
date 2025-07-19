import { EventEmitter } from 'eventemitter3';
import { AnyWebSocketMessage, WebSocketMessage } from '../types/websocket';

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

export type WebSocketConnector = {
  sendMessage: <T = any>(message: WebSocketMessage<T>) => boolean;
  on: <T = any>(event: string, handler: (message: T) => void) => () => void;
};

export class NotificationService {
  private emitter = new EventEmitter();
  private ws: WebSocketConnector | null = null;
  private isInitialized = false;
  private cleanupWs: (() => void) | null = null;

  connect(wsConnector: WebSocketConnector) {
    if (this.isInitialized) {
      console.warn('NotificationService is already initialized.');
      return;
    }
    this.ws = wsConnector;

    const handleNotification = (message: AnyWebSocketMessage) => {
      this.emitter.emit('notification', message);
      if (message.type) {
        this.emitter.emit(message.type, message);
      }
    };

    this.cleanupWs = this.ws.on('*', handleNotification);
    this.isInitialized = true;
    console.log('NotificationService connected to WebSocket.');
  }

  disconnect() {
    if (this.cleanupWs) {
      this.cleanupWs();
      this.cleanupWs = null;
    }
    this.ws = null;
    this.isInitialized = false;
    this.emitter.removeAllListeners();
    console.log('NotificationService disconnected.');
  }

  public sendNotification<T = any>(
    type: string,
    payload: Record<string, any> = {}
  ): boolean {
    if (!this.ws) {
      console.error('WebSocket is not connected.');
      return false;
    }
    const message: WebSocketMessage<T> = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: new Date().toISOString(),
      payload: payload as T,
    };
    return this.ws.sendMessage(message);
  }

  public subscribe<T = any>(
    callback: (message: T) => void,
    type: string = '*'
  ): () => void {
    this.emitter.on(type, callback);
    return () => {
      this.emitter.off(type, callback);
    };
  }

  // Mock API methods
  async getNotifications(params?: Record<string, any>): Promise<Notification[]> {
    console.log('Fetching notifications with params:', params);
    return [];
  }

  async getUnreadCount(): Promise<number> {
    return 0;
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    return {} as Notification;
  }

  async markAllAsRead(): Promise<{ count: number }> {
    return { count: 0 };
  }

  async deleteNotification(notificationId: string): Promise<void> {
    return;
  }

  async clearAll(): Promise<void> {
    return;
  }

  async getPreferences(): Promise<NotificationPreferences> {
    return { email: true, push: true, inApp: true };
  }

  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    return { email: true, push: true, inApp: true, ...preferences };
  }

  async testNotification(type: string): Promise<{ success: boolean }> {
    return { success: this.sendNotification('test', { type }) };
  }

  async getNotificationTypes(): Promise<NotificationType[]> {
    return [];
  }

  async sendToUsers(
    data: Omit<Notification, 'id' | 'read' | 'createdAt' | 'updatedAt'>,
    userIds: string[]
  ): Promise<{ success: boolean }> {
    return { success: this.sendNotification('send_to_users', { data, userIds }) };
  }

  async broadcast(
    data: Omit<Notification, 'id' | 'read' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean }> {
    return { success: this.sendNotification('broadcast', { data }) };
  }
}

// Create a single, shared instance of the service
const notificationService = new NotificationService();

export default notificationService;
