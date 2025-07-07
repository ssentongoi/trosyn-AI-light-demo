import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { MemoryProvider } from './contexts/MemoryContext';
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
import './App.css';

// A wrapper for protected routes
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, loading } = useApp();

  if (loading) {
    // You can replace this with a more sophisticated loading spinner
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // It might be better to redirect to a generic dashboard or a specific 'unauthorized' page
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Wrapper component to provide memory context to authenticated users
const AuthenticatedApp = ({ children }) => {
  const { isAuthenticated } = useApp();
  
  if (!isAuthenticated) {
    return children;
  }
  
  return (
    <MemoryProvider>
      {children}
    </MemoryProvider>
  );
};

function App() {
  return (
    <AppProvider>
      <AuthenticatedApp>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="superadmin" element={
            <ProtectedRoute requiredRole="superadmin">
              <SuperadminDashboard />
            </ProtectedRoute>
          } />
          <Route path="admin/*" element={ // Added /* to allow nested routes
            <ProtectedRoute requiredRole="admin">
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
          <Route path="devices" element={
            <ProtectedRoute>
              <DeviceRegistration />
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
          <Route path="department-requests" element={
            <ProtectedRoute>
              <DepartmentRequestPage />
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
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthenticatedApp>
    </AppProvider>
  );
}

export default App;
