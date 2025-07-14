// Base message interface
export interface WebSocketMessage<T = unknown> {
  id: string;
  type: string;
  timestamp: string;
  payload?: T;
  [key: string]: unknown;
}

// Authentication messages
export interface AuthMessage extends WebSocketMessage<{
  token: string;
  userId?: string;
  message?: string;
  code?: string;
}> {
  type: 'auth' | 'auth_success' | 'auth_error';
  isAuth?: boolean;
}

// Presence messages
export interface PresenceMessage extends WebSocketMessage<{
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: string;
  [key: string]: unknown;
}> {
  type: 'presence' | 'user_online' | 'user_offline';
  isPresence?: boolean;
}

// Chat messages
export interface ChatMessage extends WebSocketMessage<{
  from: string;
  to: string;
  content?: string;
  isTyping?: boolean;
  messageId?: string;
  readAt?: string;
  [key: string]: unknown;
}> {
  type: 'message' | 'typing' | 'read_receipt';
  isChat?: boolean;
}

// System messages
export interface SystemMessage extends WebSocketMessage<{
  level: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    url?: string;
    callback?: string;
  };
  [key: string]: unknown;
}> {
  type: 'system' | 'notification' | 'alert';
  isSystem?: boolean;
}

// Subscription messages
export interface SubscriptionMessage extends WebSocketMessage<{
  action: 'subscribe' | 'unsubscribe';
  channel: string;
  channels?: string[];
  params?: Record<string, unknown>;
  [key: string]: unknown;
}> {
  type: 'subscription' | 'subscribe' | 'unsubscribe' | 'subscription_update';
  isSubscription?: boolean;
}

// Heartbeat messages
export interface HeartbeatMessage extends WebSocketMessage {
  type: 'heartbeat' | 'ping' | 'pong';
  isHeartbeat?: boolean;
}

// Error messages
export interface ErrorMessage extends WebSocketMessage<{
  message: string;
  code?: string;
  details?: unknown;
  [key: string]: unknown;
}> {
  type: 'error';
  isError: true;
}

// Union type of all possible message types
export type AnyWebSocketMessage =
  | AuthMessage
  | PresenceMessage
  | ChatMessage
  | SystemMessage
  | SubscriptionMessage
  | HeartbeatMessage
  | ErrorMessage
  | WebSocketMessage;

// Type guard functions
export function isAuthMessage(msg: AnyWebSocketMessage): msg is AuthMessage {
  return ['auth', 'auth_success', 'auth_error'].includes(msg.type);
}

export function isPresenceMessage(msg: AnyWebSocketMessage): msg is PresenceMessage {
  return ['presence', 'user_online', 'user_offline'].includes(msg.type);
}

export function isChatMessage(msg: AnyWebSocketMessage): msg is ChatMessage {
  return ['message', 'typing', 'read_receipt'].includes(msg.type);
}

export function isSystemMessage(msg: AnyWebSocketMessage): msg is SystemMessage {
  return ['system', 'notification', 'alert'].includes(msg.type);
}

export function isSubscriptionMessage(msg: AnyWebSocketMessage): msg is SubscriptionMessage {
  return ['subscribe', 'unsubscribe', 'subscription_update'].includes(msg.type);
}

export function isHeartbeatMessage(msg: AnyWebSocketMessage): msg is HeartbeatMessage {
  return ['heartbeat', 'ping', 'pong'].includes(msg.type);
}

export function isErrorMessage(msg: AnyWebSocketMessage): msg is ErrorMessage {
  return msg.type === 'error';
}
