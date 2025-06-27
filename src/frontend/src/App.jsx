import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MemoryProvider } from './contexts/MemoryContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SuperadminDashboard from './pages/SuperadminDashboard';
import CompanyHub from './pages/CompanyHub';
import LicensingSync from './pages/LicensingSync';
import MemoryManagement from './pages/MemoryManagement';
import './App.css';

// A wrapper for protected routes
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    // You can replace this with a more sophisticated loading spinner
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    // It might be better to redirect to a generic dashboard or a specific 'unauthorized' page
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Wrapper component to provide memory context to authenticated users
const AuthenticatedApp = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
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
    <AuthProvider>
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
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthenticatedApp>
    </AuthProvider>
  );
}

export default App;
