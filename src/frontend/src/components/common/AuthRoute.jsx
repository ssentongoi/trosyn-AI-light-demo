import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useApp } from '../../contexts/AppContext';

/**
 * AuthRoute component that redirects to home if user is already authenticated
 * Used for login/register pages that should only be accessible to unauthenticated users
 */
const AuthRoute = ({ children, redirectTo = '/' }) => {
  const { isAuthenticated, loading } = useApp();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" role="status"></div>
      </div>
    );
  }

  // Redirect to home if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  // User is not authenticated, render the children
  return children;
};

AuthRoute.propTypes = {
  /** Child components to render if user is not authenticated */
  children: PropTypes.node.isRequired,
  
  /** Path to redirect to if user is already authenticated */
  redirectTo: PropTypes.string,
};

export default AuthRoute;
