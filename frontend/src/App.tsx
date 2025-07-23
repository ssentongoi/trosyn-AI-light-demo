import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
    <Router>
      <AuthProvider>
        <TauriProvider>
          <AppProvider>
            <MemoryProvider>
              <WebSocketProvider>
                <DocumentProvider>
                  <Routes>
                    <Route path="/" element={<EditorSandbox />} />
                  </Routes>
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
