import React from 'react';
import { WebSocketContext, WebSocketContextType } from '../contexts/WebSocketContext';
import { AppProvider } from '../contexts/AppContext';
import { createMockWebSocketContext } from './mockFactories';

type TestWrapperProps = {
  children: React.ReactNode;
  wsContext?: Partial<WebSocketContextType>;
  appContextProps?: Record<string, any>;
};

export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  wsContext = {},
  appContextProps = {}
}) => {
  const mockWsContext = {
    ...createMockWebSocketContext(),
    ...wsContext
  };

  return (
    <WebSocketContext.Provider value={mockWsContext as WebSocketContextType}>
      <AppProvider {...appContextProps}>
        {children}
      </AppProvider>
    </WebSocketContext.Provider>
  );
};
