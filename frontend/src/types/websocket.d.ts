export interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any;
  connect: () => void;
  disconnect: () => void;
}

export interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}
