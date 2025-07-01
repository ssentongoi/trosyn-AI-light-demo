import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useApp } from '../../contexts/AppContext';

/**
 * ProtectedRoute component that redirects to login if user is not authenticated
 * or to unauthorized page if user doesn't have required role
 */
const ProtectedRoute = ({ 
  children, 
  roles = [], 
  redirectTo = '/login',
  unauthorizedRedirectTo = '/unauthorized'
}) => {
  const { isAuthenticated, user, loading } = useApp();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (roles.length > 0 && !roles.some(role => user.roles?.includes(role))) {
    // Redirect to unauthorized page or home if no unauthorizedRedirectTo is provided
    return <Navigate to={unauthorizedRedirectTo || '/'} state={{ from: location }} replace />;
  }

  // User is authenticated and has required role, render the children
  return children;
};

ProtectedRoute.propTypes = {
  /** Child components to render if user is authenticated and authorized */
  children: PropTypes.node.isRequired,
  
  /** Array of roles that are allowed to access the route */
  roles: PropTypes.arrayOf(PropTypes.string),
  
  /** Path to redirect to if user is not authenticated */
  redirectTo: PropTypes.string,
  
  /** Path to redirect to if user is not authorized */
  unauthorizedRedirectTo: PropTypes.string,
};

export default ProtectedRoute;
