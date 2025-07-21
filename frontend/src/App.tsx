import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { MemoryProvider } from './contexts/MemoryContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { TauriProvider } from './contexts/TauriContext';
import EditorSandbox from './pages/EditorSandbox';

import './App.css';

// The main App component now only sets up the providers and renders the sandbox
const App: React.FC = () => {
  return (
    <AuthProvider>
      <TauriProvider>
        <AppProvider>
          <MemoryProvider>
            <WebSocketProvider>
              <DocumentProvider>
                <EditorSandbox />
              </DocumentProvider>
            </WebSocketProvider>
          </MemoryProvider>
        </AppProvider>
      </TauriProvider>
    </AuthProvider>
  );
};

// The main App component now only sets up the providers
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <TauriProvider>
          <AppProvider>
            <MemoryProvider>
              <WebSocketProvider>
                <DocumentProvider>
                  <AppContent />
                </DocumentProvider>
              </WebSocketProvider>
            </MemoryProvider>
          </AppProvider>
        </TauriProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
