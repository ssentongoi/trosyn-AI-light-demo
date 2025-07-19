import { useContext } from 'react';
import { WebSocketContext, WebSocketContextType } from '../contexts/WebSocketContext';

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
