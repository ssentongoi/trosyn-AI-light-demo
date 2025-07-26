import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
// import { MemoryProvider } from './contexts/MemoryContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { TauriProvider } from './contexts/TauriContext';
import EditorSandbox from './pages/EditorSandbox';
import AIEditorTest from './pages/AIEditorTest';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/auth/ProtectedRoute';

import './App.css';

// The main App component now only sets up the providers and renders the routes
const App: React.FC = () => {
  return (
    <Router>
      <TauriProvider>
        <AuthProvider>
          <AppProvider>
            <WebSocketProvider>
              <DocumentProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Sandbox route - does not require authentication */}
                  <Route path="/" element={<EditorSandbox />} />

                  {/* Protected routes */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Layout><Dashboard /></Layout>
                      </ProtectedRoute>
                    }
                  />
                  {/* Add other protected routes here as needed */}
                </Routes>
              </DocumentProvider>
            </WebSocketProvider>
          </AppProvider>
        </AuthProvider>
      </TauriProvider>
    </Router>
  );
};

export default App;
