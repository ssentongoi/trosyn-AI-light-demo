// Type definitions for notifications
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface NotificationOptions {
  id?: string;
  type?: NotificationType;
  title?: string;
  message: string;
  autoDismiss?: number | boolean;
  dismissible?: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
  createdAt?: Date;
  read?: boolean;
  archived?: boolean;
  data?: Record<string, any>;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // ISO string format
  read: boolean;
  archived: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
  data?: Record<string, any>;
  autoDismiss?: number | boolean;
  dismissible?: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export interface NotificationService {
  // Core notification methods
  show(options: NotificationOptions | string): string;
  success(message: string, options?: Omit<NotificationOptions, 'type' | 'message'>): string;
  error(message: string, options?: Omit<NotificationOptions, 'type' | 'message'>): string;
  warning(message: string, options?: Omit<NotificationOptions, 'type' | 'message'>): string;
  info(message: string, options?: Omit<NotificationOptions, 'type' | 'message'>): string;
  remove(id: string): void;
  clear(): void;
  
  // Notification management
  markAsRead(id: string): void;
  markAllAsRead(): void;
  archive(id: string): void;
  getUnreadCount(): number;
  getNotifications(): Notification[];
  
  // Subscription and lifecycle
  subscribe(callback: (notifications: Notification[]) => void): () => void;
  
  // WebSocket connection management
  connect(token: string): void;
  disconnect(): void;
  
  // User preferences
  updatePreferences(preferences: NotificationPreferences): Promise<void>;
  
  // Legacy/alias for connect
  initialize(token: string): void;
}
