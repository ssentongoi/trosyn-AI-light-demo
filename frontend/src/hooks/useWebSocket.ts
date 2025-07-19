import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AnyWebSocketMessage, WebSocketMessage } from '../types/websocket';

type MessageHandler<T = AnyWebSocketMessage> = (message: T) => void;

interface WebSocketOptions {
  autoConnect?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  onConnect?: () => void;
  onDisconnect?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onReconnectFailed?: (attempts: number) => void;
  onMessage?: (event: MessageEvent) => void;
}

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const {
    autoConnect = true,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 1000,
    maxReconnectInterval = 30000,
    heartbeatInterval = 25000,
    connectionTimeout = 10000,
    onConnect,
    onDisconnect,
    onError,
    onReconnectFailed,
    onMessage
  } = options;

  const { token, isAuthenticated } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number>();
  const heartbeatIntervalRef = useRef<number>();
  const connectionTimeoutRef = useRef<number>();
  const messageHandlers = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const lastMessageTime = useRef<number>(0);

  const [state, setState] = useState({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    lastError: null as Error | null,
    lastMessage: null as AnyWebSocketMessage | null,
    lastMessageTime: 0,
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<typeof state>) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, []);

  // Handle WebSocket open event
  const handleOpen = useCallback(() => {
    reconnectAttempts.current = 0;
    updateState({ 
      isConnected: true, 
      isConnecting: false,
      lastError: null,
      reconnectAttempts: 0
    });
    
    // Start heartbeat
    if (heartbeatInterval > 0) {
      heartbeatIntervalRef.current = window.setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          const heartbeatMsg: WebSocketMessage = {
            id: `heartbeat-${Date.now()}`,
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            payload: {}
          };
          ws.current.send(JSON.stringify(heartbeatMsg));
        }
      }, heartbeatInterval);
    }
    
    onConnect?.();
  }, [heartbeatInterval, onConnect, updateState]);

  // Handle WebSocket close event
  const handleClose = useCallback((event: CloseEvent) => {
    updateState({ isConnected: false, isConnecting: false });
    
    // Clear heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
    
    onDisconnect?.(event);
    
    // Attempt to reconnect if needed
    if (autoReconnect && isMounted.current) {
      const attempt = reconnectAttempts.current + 1;
      
      if (attempt <= maxReconnectAttempts) {
        const delay = Math.min(
          reconnectInterval * Math.pow(2, attempt - 1),
          maxReconnectInterval
        );
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (isMounted.current) {
            reconnectAttempts.current = attempt;
            updateState({ reconnectAttempts: attempt });
            connect();
          }
        }, delay);
      } else {
        onReconnectFailed?.(attempt);
      }
    }
  }, [
    autoReconnect, 
    maxReconnectAttempts, 
    reconnectInterval, 
    maxReconnectInterval, 
    onDisconnect, 
    onReconnectFailed, 
    updateState
  ]);

  // Handle WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const messageData = JSON.parse(event.data) as AnyWebSocketMessage;
      lastMessageTime.current = Date.now();
      
      updateState({ 
        lastMessage: messageData,
        lastMessageTime: lastMessageTime.current,
        lastError: null 
      });

      // Call the generic message handler
      onMessage?.(event);

      // Call specific handlers for the message type
      const handlers = messageHandlers.current.get(messageData.type) || [];
      handlers.forEach(handler => handler(messageData));
      
      // Call wildcard handlers
      const wildcardHandlers = messageHandlers.current.get('*') || [];
      wildcardHandlers.forEach(handler => handler(messageData));
      
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      updateState({ 
        lastError: error instanceof Error ? error : new Error('Failed to process message') 
      });
    }
  }, [onMessage, updateState]);

  // Handle WebSocket errors
  const handleError = useCallback((event: Event) => {
    const error = event instanceof ErrorEvent ? event.error : new Error('WebSocket error occurred');
    updateState({ lastError: error });
    onError?.(event);
  }, [onError, updateState]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!isMounted.current) return;

    if (ws.current?.readyState === WebSocket.OPEN || state.isConnecting) {
      return;
    }

    if (!isAuthenticated || !token) {
      console.log('Not authenticated, skipping WebSocket connection');
      return;
    }

    cleanup();
    updateState({ isConnecting: true });

    try {
      const wsUrl = new URL(url);
      if (token) {
        wsUrl.searchParams.set('token', token);
      }
      
      ws.current = new WebSocket(wsUrl.toString());

      // Set up event listeners
      ws.current.onopen = handleOpen;
      ws.current.onclose = handleClose;
      ws.current.onerror = handleError;
      ws.current.onmessage = handleMessage;

      // Set connection timeout
      connectionTimeoutRef.current = window.setTimeout(() => {
        if (ws.current?.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket connection timeout');
          cleanup(1000, 'Connection timeout');
        }
      }, connectionTimeout);
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      updateState({ 
        isConnecting: false,
        lastError: error instanceof Error ? error : new Error('Failed to create WebSocket')
      });
    }
  }, [
    url, 
    token, 
    isAuthenticated, 
    state.isConnecting, 
    handleOpen, 
    handleClose, 
    handleError, 
    handleMessage, 
    connectionTimeout,
    updateState
  ]);

  // Disconnect WebSocket
  const disconnect = useCallback((code = 1000, reason?: string) => {
    if (ws.current) {
      cleanup(code, reason);
    }
  }, []);

  // Reconnect to WebSocket
  const reconnect = useCallback(() => {
    disconnect(1000, 'Reconnecting...');
    connect();
  }, [connect, disconnect]);

  // Clean up resources
  const cleanup = useCallback((code?: number, reason?: string) => {
    // Clear timeouts and intervals
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = undefined;
    }

    // Close WebSocket if it exists
    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      
      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.close(code, reason);
      } else if (ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close(4000, 'Connection aborted');
      }
      
      ws.current = null;
    }
    
    updateState({ 
      isConnected: false, 
      isConnecting: false,
      lastError: reason ? new Error(reason) : null
    });
  }, [updateState]);

  // Send a message through the WebSocket
  const sendMessage = useCallback(<T = any>(message: WebSocketMessage<T>): boolean => {
    if (!ws.current) {
      console.warn('WebSocket is not initialized');
      return false;
    }

    if (ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        updateState({ 
          lastError: error instanceof Error ? error : new Error('Failed to send message') 
        });
        return false;
      }
    }

    console.warn('WebSocket is not connected');
    return false;
  }, [updateState]);

  // Register a message handler
  const on = useCallback(<T = AnyWebSocketMessage>(
    messageType: string, 
    handler: MessageHandler<T>
  ) => {
    if (!messageHandlers.current.has(messageType)) {
      messageHandlers.current.set(messageType, new Set());
    }
    const handlers = messageHandlers.current.get(messageType)!;
    // @ts-ignore - TypeScript can't properly infer the type here
    handlers.add(handler);
    
    // Return cleanup function
    return () => {
      if (handlers.has(handler as any)) {
        handlers.delete(handler as any);
      }
    };
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && isAuthenticated) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [autoConnect, connect, isAuthenticated, cleanup]);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    lastError: state.lastError,
    lastMessage: state.lastMessage,
    lastMessageTime: state.lastMessageTime,
    reconnectAttempts: state.reconnectAttempts,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    on,
  };
};

export default useWebSocket;
