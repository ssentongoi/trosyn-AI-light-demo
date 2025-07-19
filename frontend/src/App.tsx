import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { MemoryProvider } from './contexts/MemoryContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { useWebSocket } from './hooks/useWebSocketContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { TauriProvider, useTauriContext } from './contexts/TauriContext';
import TestLayout from './components/layout/TestLayout';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import TestEditorPage from './pages/TestEditorPage';
import RecoveryDialog from './components/dialogs/RecoveryDialog';
import { DocumentService } from './services/DocumentService';
import { isTauri } from './utils/environment';
import './App.css';

// A wrapper for protected routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('ProtectedRoute: Checking authentication...');
  const { isAuthenticated, loading } = useApp();

  console.log(`ProtectedRoute: isAuthenticated=${isAuthenticated}, loading=${loading}`);

  if (loading) {
    console.log('ProtectedRoute: Authentication in progress, showing loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute: User is authenticated, rendering children');
  return <>{children}</>;
};

// WebSocket connection status indicator
const WebSocketStatus: React.FC = () => {
  const { isConnected } = useWebSocket();
  
  if (isConnected) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-md shadow-lg">
      <p>Connection lost. Reconnecting...</p>
    </div>
  );
};

// Test component to verify Tauri integration
const TauriTest = () => {
  const { isTauri, isLoading, error, fileExists } = useTauriContext();
  const [fileStatus, setFileStatus] = useState<string>('');

  useEffect(() => {
    const checkFile = async () => {
      if (isTauri) {
        try {
          const exists = await fileExists('.');
          setFileStatus(`Tauri FS API working: ${exists ? 'Current directory exists' : 'Current directory not found'}`);
        } catch (err) {
          setFileStatus(`Tauri FS API error: ${(err as Error).message}`);
        }
      }
    };

    checkFile();
  }, [isTauri, fileExists]);

  if (isLoading) {
    return <div className="text-sm text-gray-500">Checking Tauri environment...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg mt-4">
      <h3 className="font-bold mb-2">Tauri Environment Check</h3>
      <p className="text-sm">Tauri available: <span className={isTauri ? 'text-green-600' : 'text-yellow-600'}>
        {isTauri ? 'Yes' : 'No (running in browser)'}
      </span></p>
      {fileStatus && <p className="text-sm mt-1">{fileStatus}</p>}
      {error && <p className="text-red-600 text-sm mt-1">Error: {error.message}</p>}
    </div>
  );
};

// Component with the actual app content, which can use the contexts
const AppContent: React.FC = () => {
  console.log('App: Component rendering');
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    console.log('App: Component mounted');
    setMounted(true);
    return () => {
      console.log('App: Component unmounting');
    };
  }, []);
  const [showRecovery, setShowRecovery] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(true);

  useEffect(() => {
    const checkForRecovery = async () => {
      if (!isTauri) {
        setIsCheckingRecovery(false);
        return;
      }

      try {
        const recoveryFiles = await DocumentService.checkForRecoveryFiles();
        if (recoveryFiles.length > 0) {
          setShowRecovery(true);
        }
      } catch (error) {
        console.error('Error checking for recovery files:', error);
      } finally {
        setIsCheckingRecovery(false);
      }
    };

    checkForRecovery();
  }, []);

  const handleRecoveryClose = (content?: string, filePath?: string) => {
    setShowRecovery(false);
    // In a real implementation, we would handle the recovered content
    if (content && filePath) {
      console.log('Recovering document:', filePath);
      // Here you would navigate to the editor with the recovered content
    }
  };

  if (isCheckingRecovery) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

    return (
      <div className="min-h-screen bg-gray-50">
        <WebSocketStatus />
        <RecoveryDialog 
          open={showRecovery} 
          onClose={handleRecoveryClose} 
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
              <Login />
            </div>
          } />
          <Route path="/register" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
              <Register />
            </div>
          } />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <div><Dashboard /><TauriTest /></div>
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/documents" element={
            <ProtectedRoute>
              <Layout>
                <Documents />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/test-editor" element={
            <ProtectedRoute>
              <Layout>
                <TestEditorPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Development route - remove in production */}
          <Route path="/dev/editor" element={
            <TestLayout>
              <TestEditorPage />
            </TestLayout>
          } />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
  );
};

// The main App component now only sets up the providers
const App: React.FC = () => {
  return (
    <Router>
      <AppProvider>
        <TauriProvider>
          <WebSocketProvider>
            <DocumentProvider>
              <MemoryProvider>
                <AppContent />
              </MemoryProvider>
            </DocumentProvider>
          </WebSocketProvider>
        </TauriProvider>
      </AppProvider>
    </Router>
  );
};

export default App;
