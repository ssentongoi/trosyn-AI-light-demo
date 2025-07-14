import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { MemoryProvider } from './contexts/MemoryContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SuperadminDashboard from './pages/SuperadminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CompanyHub from './pages/CompanyHub';
import LicensingSync from './pages/LicensingSync';
import MemoryManagement from './pages/MemoryManagement';
import DeviceRegistration from './pages/DeviceRegistration';
import DepartmentDashboard from './pages/DepartmentDashboard';
import AIAssistant from './pages/AIAssistant';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';
import DepartmentRequestPage from './pages/DepartmentRequestPage';
import EditorPage from './pages/EditorPage';
import { UserRole } from './types';
import './App.css';

// A wrapper for protected routes
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, user, loading, error } = useApp();
  const location = useLocation();

  useEffect(() => {
    if (error) {
      console.error('Authentication error:', error);
    }
  }, [error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, but save the location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to unauthorized or dashboard based on user role
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Wrapper component to provide memory context to authenticated users
const AuthenticatedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useApp();
  
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return <MemoryProvider>{children}</MemoryProvider>;
};

// WebSocket connection status indicator
const WebSocketStatus: React.FC = () => {
  const { isConnected } = useWebSocketContext();
  
  if (isConnected) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-md shadow-lg">
      <div className="flex items-center">
        <span className="relative flex h-3 w-3 mr-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span>Reconnecting to server...</span>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <WebSocketProvider>
        <AuthenticatedApp>
          <WebSocketStatus />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="superadmin" element={
                <ProtectedRoute requiredRole={UserRole.SUPERADMIN}>
                  <SuperadminDashboard />
                </ProtectedRoute>
              } />
              <Route path="admin" element={
                <ProtectedRoute requiredRole={UserRole.ADMIN}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="company-hub" element={
                <ProtectedRoute>
                  <CompanyHub />
                </ProtectedRoute>
              } />
              <Route path="licensing" element={
                <ProtectedRoute>
                  <LicensingSync />
                </ProtectedRoute>
              } />
              <Route path="memory" element={
                <ProtectedRoute>
                  <MemoryManagement />
                </ProtectedRoute>
              } />
              <Route path="device-registration" element={
                <ProtectedRoute>
                  <DeviceRegistration />
                </ProtectedRoute>
              } />
              <Route path="department" element={
                <ProtectedRoute>
                  <DepartmentDashboard />
                </ProtectedRoute>
              } />
              <Route path="ai-assistant" element={
                <ProtectedRoute>
                  <AIAssistant />
                </ProtectedRoute>
              } />
              <Route path="documents" element={
                <ProtectedRoute>
                  <DocumentsPage />
                </ProtectedRoute>
              } />
              <Route path="notifications" element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              } />
              <Route path="department-request" element={
                <ProtectedRoute>
                  <DepartmentRequestPage />
                </ProtectedRoute>
              } />
              <Route path="editor" element={
                <ProtectedRoute>
                  <EditorPage />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthenticatedApp>
      </WebSocketProvider>
    </AppProvider>
  );
};

export default App;
