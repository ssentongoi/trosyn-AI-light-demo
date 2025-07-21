import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { MemoryProvider } from './contexts/MemoryContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { useWebSocket } from './hooks/useWebSocketContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { TauriProvider, useTauriContext } from './contexts/TauriContext';

import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import TestEditorPage from './pages/TestEditorPage';
import SimpleEditorTest from './pages/SimpleEditorTest';
import EditorSandbox from './pages/EditorSandbox';

import RecoveryDialog from './components/dialogs/RecoveryDialog';
import { DocumentService } from './services/DocumentService';
import { Box, Typography } from '@mui/material';

import './App.css';

// A wrapper for protected routes - temporarily disabled authentication
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('ProtectedRoute: Authentication temporarily disabled - allowing access');
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
                <Dashboard />
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
                {window.__TAURI__ ? (
                  <TestEditorPage />
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" color="error">
                      This editor is only available in the Tauri desktop application.
                    </Typography>
                  </Box>
                )}
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/simple-editor" element={
            <ProtectedRoute>
              <Layout>
                <SimpleEditorTest />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/editor-sandbox" element={
            <ProtectedRoute>
              <Layout>
                <EditorSandbox />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Development route - bypasses authentication for testing */}
          <Route path="/dev/editor" element={
            <div className="min-h-screen bg-gray-50">
              <Layout>
                <TestEditorPage />
              </Layout>
            </div>
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
