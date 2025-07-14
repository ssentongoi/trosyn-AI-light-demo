import { WebSocketMessage } from '../types/websocket';

/**
 * Validates if a message matches the expected WebSocket message format
 */
export const isValidWebSocketMessage = (message: unknown): message is WebSocketMessage => {
  return (
    message !== null &&
    typeof message === 'object' &&
    'type' in (message as object) &&
    typeof (message as WebSocketMessage).type === 'string'
  );
};

/**
 * Creates a WebSocket message with a unique ID and timestamp
 */
export const createWebSocketMessage = <T = unknown>(
  type: string,
  payload?: T,
  meta: Record<string, unknown> = {}
): WebSocketMessage<T> => {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    ...(payload && { payload }),
    ...meta,
  };
};

/**
 * Creates a WebSocket error message
 */
export const createWebSocketError = (
  error: Error,
  context: Record<string, unknown> = {}
): WebSocketMessage<{ message: string; code?: string }> => {
  return createWebSocketMessage(
    'error',
    {
      message: error.message,
      code: 'code' in error ? String(error.code) : undefined,
      ...context,
    },
    { isError: true }
  );
};

/**
 * Creates a WebSocket subscription message
 */
export const createSubscriptionMessage = (
  channel: string,
  action: 'subscribe' | 'unsubscribe' = 'subscribe',
  params: Record<string, unknown> = {}
): WebSocketMessage => {
  return createWebSocketMessage(
    'subscription',
    {
      action,
      channel,
      ...params,
    },
    { isSubscription: true }
  );
};

/**
 * Creates a WebSocket authentication message
 */
export const createAuthMessage = (token: string): WebSocketMessage => {
  return createWebSocketMessage('auth', { token });
};

/**
 * Creates a WebSocket heartbeat message
 */
export const createHeartbeatMessage = (): WebSocketMessage => {
  return createWebSocketMessage('heartbeat');
};

/**
 * Creates a WebSocket notification message
 */
export const createNotificationMessage = (
  notification: {
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    action?: string;
    actionLabel?: string;
    data?: unknown;
  },
  meta: Record<string, unknown> = {}
): WebSocketMessage => {
  return createWebSocketMessage(
    'notification',
    {
      ...notification,
      type: notification.type || 'info',
      timestamp: new Date().toISOString(),
    },
    { isNotification: true, ...meta }
  );
};

/**
 * Creates a WebSocket presence update message
 */
export const createPresenceUpdateMessage = (
  status: 'online' | 'away' | 'offline' = 'online',
  data: Record<string, unknown> = {}
): WebSocketMessage => {
  return createWebSocketMessage(
    'presence',
    {
      status,
      timestamp: new Date().toISOString(),
      ...data,
    },
    { isPresence: true }
  );
};

/**
 * Helper to parse WebSocket message data
 */
export const parseWebSocketData = <T>(
  data: string | Blob | ArrayBuffer | ArrayBufferView
): T | Promise<T> => {
  try {
    if (typeof data === 'string') {
      return JSON.parse(data) as T;
    }
    
    if (data instanceof Blob) {
      return new Promise<T>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            if (typeof reader.result === 'string') {
              resolve(JSON.parse(reader.result) as T);
            } else {
              throw new Error('Failed to read blob data as text');
            }
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        };
        reader.onerror = () => {
          reject(new Error('Failed to read blob data'));
        };
        reader.readAsText(data);
      });
    }
    
    // Handle ArrayBuffer or ArrayBufferView
    try {
      const decoder = new TextDecoder('utf-8');
      let buffer: ArrayBuffer;
      
      if (data instanceof ArrayBuffer) {
        buffer = data;
      } else if ('buffer' in data && data.buffer instanceof ArrayBuffer) {
        buffer = data.buffer;
      } else {
        throw new Error('Unsupported data type for WebSocket message');
      }
      
      // Create a new Uint8Array from the buffer to ensure we have a standard ArrayBuffer
      const uint8Array = new Uint8Array(buffer);
      const text = decoder.decode(uint8Array);
      return JSON.parse(text) as T;
    } catch (error) {
      console.error('Failed to decode binary data:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  } catch (error) {
    console.error('Failed to parse WebSocket data:', error);
    throw error;
  }
};

/**
 * Helper to check if a WebSocket message is an error
 */
export const isWebSocketError = (
  message: WebSocketMessage
): message is WebSocketMessage<{ message: string; code?: string }> => {
  return message.type === 'error' || 'isError' in message;
};

/**
 * Helper to check if a WebSocket message is a notification
 */
export const isNotificationMessage = (
  message: WebSocketMessage
): message is WebSocketMessage<{
  title: string;
  message: string;
  type?: string;
  timestamp: string;
}> => {
  return message.type === 'notification' || 'isNotification' in message;
};

/**
 * Helper to check if a WebSocket message is a presence update
 */
export const isPresenceMessage = (
  message: WebSocketMessage
): message is WebSocketMessage<{
  status: 'online' | 'away' | 'offline';
  timestamp: string;
  [key: string]: unknown;
}> => {
  return message.type === 'presence' || 'isPresence' in message;
};

export default {
  isValidWebSocketMessage,
  createWebSocketMessage,
  createWebSocketError,
  createSubscriptionMessage,
  createAuthMessage,
  createHeartbeatMessage,
  createNotificationMessage,
  createPresenceUpdateMessage,
  parseWebSocketData,
  isWebSocketError,
  isNotificationMessage,
  isPresenceMessage,
};
