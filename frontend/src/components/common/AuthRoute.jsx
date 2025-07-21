import React from 'react';
import PropTypes from 'prop-types';

/**
 * AuthRoute component - temporarily disabled authentication
 * Now simply renders its children without any auth checks
 */
const AuthRoute = ({ children }) => {
  // Simply render the children without any auth checks
  return children;
};

AuthRoute.propTypes = {
  /** Child components to render */
  children: PropTypes.node.isRequired,
};

export default AuthRoute;
