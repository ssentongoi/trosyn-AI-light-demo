import React, { createContext, useContext, useMemo, ReactNode, useEffect } from 'react';
import { useWebSocket as useWebSocketHook } from '../hooks/useWebSocket';
import { useApp } from './AppContext';
import { AnyWebSocketMessage, WebSocketMessage } from '../types/websocket';
import notificationService, { NotificationService, WebSocketConnector } from '../services/notification';

type MessageHandler = (message: AnyWebSocketMessage) => void;

export interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: <T = any>(message: WebSocketMessage<T>) => boolean;
  on: <T = any>(event: string, handler: (message: T) => void) => () => void;
  reconnect: () => void;
  disconnect: () => void;
  isConnecting: boolean;
  lastError: Error | null;
  notificationService: NotificationService;
}

export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  /**
   * WebSocket URL to connect to
   * @default 'ws://localhost:8000/ws/notifications' in development, 'wss://<host>/ws/notifications' in production
   */
  url?: string;
  /**
   * Whether to automatically connect when the component mounts
   * @default true
   */
  autoConnect?: boolean;
  /**
   * Whether to automatically reconnect on disconnection
   * @default true
   */
  autoReconnect?: boolean;
  /**
   * Maximum number of reconnection attempts
   * @default 5
   */
  maxReconnectAttempts?: number;
  /**
   * Time between reconnection attempts in milliseconds
   * @default 1000
   */
  reconnectInterval?: number;
  /**
   * Time between heartbeat messages in milliseconds
   * @default 25000
   */
  heartbeatInterval?: number;
  /**
   * Callback when connection is established
   */
  onConnect?: () => void;
  /**
   * Callback when connection is closed
   */
  onDisconnect?: (event: CloseEvent) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (error: Event) => void;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url: propUrl,
  autoConnect = true,
  autoReconnect = true,
  maxReconnectAttempts = 5,
  reconnectInterval = 1000,
  heartbeatInterval = 25000,
  onConnect,
  onDisconnect,
  onError,
}) => {
  const { isAuthenticated } = useApp();
  
  // Determine WebSocket URL
  const wsUrl = useMemo(() => {
    if (propUrl) return propUrl;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.REACT_APP_WS_URL || `${window.location.hostname}:8000`;
    return `${protocol}//${host}/ws/notifications`;
  }, [propUrl]);
  
  // WebSocket configuration
  const wsConfig = useMemo(() => ({
    autoConnect,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    heartbeatInterval,
    onConnect,
    onDisconnect,
    onError,
  }), [
    autoConnect,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    heartbeatInterval,
    onConnect,
    onDisconnect,
    onError,
  ]);

  const {
    isConnected,
    isConnecting,
    sendMessage,
    on,
    reconnect,
    disconnect,
    lastError,
  } = useWebSocketHook(wsUrl, wsConfig);

  // Connect the notification service to the WebSocket
  useEffect(() => {
    if (isConnected) {
      const connector: WebSocketConnector = {
        sendMessage: sendMessage as <T = any>(message: WebSocketMessage<T>) => boolean,
        on: on as <T = any>(event: string, handler: (message: T) => void) => () => void,
      };
      notificationService.connect(connector);
    }

    // Cleanup on disconnect or unmount
    return () => {
      notificationService.disconnect();
    };
  }, [isConnected, sendMessage, on]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<WebSocketContextType>(() => ({
    isConnected,
    isConnecting,
    sendMessage: sendMessage as <T = any>(message: WebSocketMessage<T>) => boolean,
    on: on as <T = any>(event: string, handler: (message: T) => void) => () => void,
    reconnect,
    disconnect,
    lastError,
    notificationService,
  }), [
    isConnected,
    isConnecting,
    sendMessage,
    on,
    reconnect,
    disconnect,
    lastError,
    notificationService,
  ]);

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};


