import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { MemoryProvider } from './contexts/MemoryContext';
import { WebSocketProvider, useWebSocket } from './contexts/WebSocketContext';
import { DocumentProvider } from './contexts/DocumentContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import Documents from './pages/Documents';
import RecoveryDialog from './components/dialogs/RecoveryDialog';
import { DocumentService } from './services/DocumentService';
import { isTauri } from './utils/environment';
import './App.css';

// A wrapper for protected routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useApp();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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

// Main App component
const App: React.FC = () => {
  const [showRecovery, setShowRecovery] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(true);

  useEffect(() => {
    const checkForRecovery = async () => {
      if (!isTauri) {
        setIsCheckingRecovery(false);
        return;
      }

      try {
        const recoveryFiles = await DocumentService.getInstance().checkForRecoveryFiles();
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
    <AppProvider>
      <WebSocketProvider>
        <MemoryProvider>
          <DocumentProvider>
            <WebSocketStatus />
            <Router>
              <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/editor" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EditorPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/editor/:documentId" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EditorPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/documents" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Documents />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/documents/:documentId" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Documents />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </DocumentProvider>
        </MemoryProvider>
      </WebSocketProvider>
      <RecoveryDialog 
        open={showRecovery} 
        onClose={handleRecoveryClose} 
      />
    </AppProvider>
  );
};

export default App;
