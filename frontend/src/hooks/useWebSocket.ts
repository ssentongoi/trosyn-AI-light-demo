import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AnyWebSocketMessage, WebSocketMessage } from '../types/websocket';

type MessageHandler<T = AnyWebSocketMessage> = (message: T) => void;

interface WebSocketOptions {
  /** Whether to automatically connect when the hook is called */
  autoConnect?: boolean;
  /** Whether to automatically reconnect on disconnection */
  autoReconnect?: boolean;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Base delay between reconnection attempts in milliseconds */
  reconnectInterval?: number;
  /** Maximum delay between reconnection attempts in milliseconds */
  maxReconnectInterval?: number;
  /** Time between heartbeat messages in milliseconds */
  heartbeatInterval?: number;
  /** Timeout for the WebSocket connection in milliseconds */
  connectionTimeout?: number;
  /** Called when the WebSocket connection is established */
  onConnect?: () => void;
  /** Called when the WebSocket connection is closed */
  onDisconnect?: (event: CloseEvent) => void;
  /** Called when an error occurs */
  onError?: (error: Event) => void;
  /** Called when reconnection attempts are exhausted */
  onReconnectFailed?: (attempts: number) => void;
  /** Called when a message is received */
  onMessage?: (event: MessageEvent) => void;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastError: Error | null;
  lastMessage: AnyWebSocketMessage | null;
  lastMessageTime: number | null;
}

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const {
    autoConnect = true,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 1000,
    maxReconnectInterval = 30000, // 30 seconds max
    heartbeatInterval = 25000, // 25 seconds
    connectionTimeout = 10000, // 10 seconds
    onConnect,
    onDisconnect,
    onError,
    onReconnectFailed,
    onMessage,
  } = options;

  const { token, isAuthenticated } = useAuth();
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    lastError: null,
    lastMessage: null,
    lastMessageTime: null,
  });

  const ws = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const heartbeatIntervalRef = useRef<number | undefined>(undefined);
  const connectionTimeoutRef = useRef<number | undefined>(undefined);
  const lastMessageTime = useRef<number>(Date.now());
  const reconnectAttemptsRef = useRef(0);
  const isMounted = useRef(true);
  
  // Destructure state for easier access
  const { isConnected, isConnecting, reconnectAttempts, lastError } = state;
  
  // Update state with type safety
  const updateState = useCallback((newState: Partial<WebSocketState>) => {
    if (isMounted.current) {
      setState(prev => ({
        ...prev,
        ...newState,
        lastMessageTime: newState.lastMessage ? Date.now() : prev.lastMessageTime,
      }));
    }
  }, []);
  
  // Calculate reconnect delay with exponential backoff and jitter
  const getReconnectDelay = useCallback((attempt: number): number => {
    const baseDelay = Math.min(
      reconnectInterval * Math.pow(2, attempt),
      maxReconnectInterval
    );
    // Add jitter to prevent thundering herd problem
    const jitter = Math.random() * reconnectInterval;
    return Math.min(baseDelay + jitter, maxReconnectInterval);
  }, [reconnectInterval, maxReconnectInterval]);
  
  // Reset reconnection attempts after successful connection
  const resetReconnectAttempts = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    updateState({ reconnectAttempts: 0 });
  }, [updateState]);
  
  // Handle WebSocket open event
  const handleOpen = useCallback(() => {
    clearTimeout(connectionTimeoutRef.current);
    resetReconnectAttempts();
    updateState({ 
      isConnected: true, 
      isConnecting: false,
      lastError: null 
    });
    onConnect?.();
    
    // Start heartbeat
    heartbeatIntervalRef.current = window.setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, onConnect, resetReconnectAttempts, updateState]);
  
  // Handle WebSocket close event
  const handleClose = useCallback((event: CloseEvent) => {
    clearInterval(heartbeatIntervalRef.current);
    clearTimeout(connectionTimeoutRef.current);
    
    updateState({ 
      isConnected: false, 
      isConnecting: false,
      lastError: new Error(`WebSocket closed: ${event.reason || 'No reason provided'}`)
    });
    
    onDisconnect?.(event);
    
    // Attempt to reconnect if needed
    if (autoReconnect && isMounted.current) {
      const attempts = reconnectAttemptsRef.current + 1;
      if (attempts <= maxReconnectAttempts) {
        const delay = getReconnectDelay(attempts - 1);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (isMounted.current) {
            reconnectAttemptsRef.current = attempts;
            updateState({ reconnectAttempts: attempts });
            connect();
          }
        }, delay);
      } else {
        onReconnectFailed?.(attempts);
      }
    }
  }, [autoReconnect, getReconnectDelay, maxReconnectAttempts, onDisconnect, onReconnectFailed, updateState]);
  
  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data) as AnyWebSocketMessage;
      lastMessageTime.current = Date.now();
      
      // Update last message in state
      updateState({ lastMessage: message });
      
      // Call specific handlers for the message type
      const handlers = messageHandlers.current.get(message.type) || [];
      handlers.forEach(handler => handler(message));
      
      // Call wildcard handlers
      const wildcardHandlers = messageHandlers.current.get('*') || [];
      wildcardHandlers.forEach(handler => handler(message));
      
      // Special handling for ping messages
      if (message.type === 'ping') {
        // Send a properly typed pong message
        const pongMessage: WebSocketMessage<any> = {
          id: `pong-${Date.now()}`,
          type: 'pong',
          timestamp: new Date().toISOString(),
          payload: {}
        };
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify(pongMessage));
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error : new Error(String(error));
      console.error('Error processing WebSocket message:', errorMessage);
      updateState({ lastError: errorMessage });
    }
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
        updateState({ lastError: error instanceof Error ? error : new Error(String(error)) });
        return false;
      }
    }
    
    console.warn('WebSocket is not connected');
    return false;
  }, [updateState]);
  
  // Handle WebSocket errors
  const handleError = useCallback((event: Event) => {
    const error = event instanceof ErrorEvent ? event.error : new Error('WebSocket error occurred');
    updateState({ lastError: error });
    onError?.(event);
  }, [onError, updateState]);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN || isConnecting) {
      return;
    }

    updateState({ isConnecting: true });
    
    try {
      // Create WebSocket connection with auth token if available
      const wsUrl = new URL(url);
      if (token) {
        wsUrl.searchParams.set('token', token);
      }
      
      ws.current = new WebSocket(wsUrl.toString());
      
      // Set up event listeners
      ws.current.onopen = handleOpen;
      ws.current.onclose = handleClose;
      ws.current.onerror = handleError;
      ws.current.onmessage = (event) => {
        handleMessage(event);
        onMessage?.(event);
      };
      
      // Set connection timeout
      connectionTimeoutRef.current = window.setTimeout(() => {
        if (ws.current?.readyState === WebSocket.CONNECTING) {
          ws.current.close(4000, 'Connection timeout');
          updateState({ 
            lastError: new Error('Connection timeout') 
          });
        }
      }, connectionTimeout);
      
    } catch (error) {
      updateState({ 
        isConnecting: false, 
        lastError: error instanceof Error ? error : new Error('Failed to connect to WebSocket') 
      });
      onError?.(error as Event);
    }
  }, [
    url, 
    token, 
    isConnecting, 
    connectionTimeout, 
    handleOpen, 
    handleClose, 
    handleError, 
    handleMessage, 
    onError, 
    onMessage, 
    updateState
  ]);
  
  // Disconnect WebSocket
  const disconnect = useCallback((code = 1000, reason?: string) => {
    if (ws.current) {
      ws.current.close(code, reason);
    }
    cleanup();
  }, []);
  
  // Reconnect to WebSocket
  const reconnect = useCallback(() => {
    disconnect(1000, 'Reconnecting');
    connect();
  }, [connect, disconnect]);
  
  // Clean up resources
  const cleanup = useCallback(() => {
    clearInterval(heartbeatIntervalRef.current);
    clearTimeout(reconnectTimeoutRef.current);
    clearTimeout(connectionTimeoutRef.current);
    
    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      
      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.close(1000, 'Component unmounted');
      }
      
      ws.current = null;
    }
  }, []);
  
  // Initialize connection on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect && isAuthenticated) {
      connect();
    }
    
    return () => {
      return false;
    }
    
    if (ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        setLastError(error instanceof Error ? error : new Error(String(error)));
        return false;
      }
    }
    
    console.warn('WebSocket is not connected');
    return false;
  }, []);

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

  // Send a heartbeat to the server
  const sendHeartbeat = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Create a properly typed heartbeat message
      const heartbeatMessage: WebSocketMessage = {
        id: `heartbeat-${Date.now()}`,
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        payload: {}
      };
      sendMessage(heartbeatMessage);
    }
  }, [sendMessage]);

  // Setup heartbeat interval
  useEffect(() => {
    if (isConnected && heartbeatInterval > 0) {
      const interval = setInterval(() => {
        const timeSinceLastMessage = Date.now() - lastMessageTime.current;
        if (timeSinceLastMessage >= heartbeatInterval) {
          // Create a properly typed heartbeat message
          const heartbeatMessage: WebSocketMessage = {
            id: `heartbeat-${Date.now()}`,
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            payload: {}
          };
          sendMessage(heartbeatMessage);
        }
      }, Math.max(1000, Math.floor(heartbeatInterval / 2)));
      
      return () => clearInterval(interval);
    }
  }, [isConnected, heartbeatInterval, sendMessage]);

  // Handle reconnection logic
  const handleReconnect = useCallback(() => {
    if (!autoReconnect || !isMounted.current) return;
    
    const attempt = reconnectAttemptsRef.current + 1;
    
    if (attempt > maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached');
      return;
    }
    
    const delay = getReconnectDelay(attempt - 1);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${attempt}/${maxReconnectAttempts})`);
    
    reconnectTimeoutRef.current = window.setTimeout(() => {
      if (!isMounted.current) return;
      
      reconnectAttemptsRef.current = attempt;
      updateState({ reconnectAttempts: attempt });
      connect();
    }, delay);
  }, [autoReconnect, maxReconnectAttempts, getReconnectDelay, connect]);

  // Cleanup WebSocket connection
  const cleanupConnection = useCallback((closeCode = 1000, reason?: string) => {
    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onmessage = null;
      ws.current.onerror = null;
      
      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.close(closeCode, reason);
      } else if (ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close(4000, 'Connection aborted');
      }
      
      ws.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    updateState({ isConnected: false, isConnecting: false });
  }, []);

  // Main WebSocket connection logic
  const connect = useCallback(() => {
    if (!isMounted.current) return;
    
    cleanupConnection(1000, 'Reconnecting...');
    
    if (!isAuthenticated || !token) {
      console.log('Not authenticated, skipping WebSocket connection');
      return;
    }
    
    updateState({ isConnecting: true });
    
    try {
      const wsUrl = new URL(url);
      ws.current = new WebSocket(wsUrl.toString());
      
      ws.current.onopen = () => {
        if (!isMounted.current || !ws.current) return;
        
        console.log('WebSocket connected, authenticating...');
        
        // Send authentication message
        sendMessage({
          type: 'auth',
          token: token
        });
        
        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;
        updateState({ reconnectAttempts: 0 });
      };
      
      ws.current.onmessage = (event) => {
        if (!isMounted.current) return;
        handleMessage(event);
      };
      
      ws.current.onclose = (event) => {
        if (!isMounted.current) return;
        
        console.log(`WebSocket closed: ${event.code} ${event.reason || 'No reason provided'}`);
        
        // Don't attempt to reconnect if we explicitly closed the connection
        if (event.code !== 1000 && autoReconnect) {
          handleReconnect();
        }
        
        updateState({ isConnected: false, isConnecting: false });
        
        if (onDisconnect) {
          onDisconnect(event);
        }
      };
      
      ws.current.onerror = (error) => {
        if (!isMounted.current) return;
        
        console.error('WebSocket error:', error);
        updateState({ lastError: new Error('WebSocket connection error') });
        
        if (onError) {
          onError(error);
        }
      };
      
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setLastError(error instanceof Error ? error : new Error(String(error)));
      
      if (onError) {
        onError(new Event('WebSocketError'));
      }
      
      if (autoReconnect) {
        reconnect();
      }
    }
  }, [
    url, 
    token, 
    isAuthenticated, 
    handleMessage, 
    handleReconnect, 
    cleanupConnection, 
    sendMessage, 
    autoReconnect,
    onDisconnect,
    onError
  ]);

  // Connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      isMounted.current = false;
      cleanupConnection(1000, 'Component unmounted');
    };
  }, [connect, cleanupConnection, autoConnect]);

  // Reconnect when token changes and we're authenticated
  useEffect(() => {
    if (isAuthenticated && token && autoConnect) {
      connect();
    }
  }, [token, isAuthenticated, connect, autoConnect]);

  // Handle authentication state changes
  useEffect(() => {
    if (!isAuthenticated && ws.current) {
      // Close connection if user logs out
      cleanupConnection(1000, 'User logged out');
    }
  }, [isAuthenticated, cleanupConnection]);

  // Define the return type for better type safety
  const result = {
    isConnected,
    isConnecting,
    lastError,
    sendMessage,
    on,
    reconnect: useCallback(() => {
      if (!isMounted.current) return;
      
      reconnectAttemptsRef.current = 0;
      updateState({ reconnectAttempts: 0, lastError: null });
      connect();
    }, [connect, updateState]),
    disconnect: useCallback(() => {
      cleanupConnection(1000, 'Disconnected by user');
    }, [cleanupConnection])
  };
  
  return result;
};

export default useWebSocket;
