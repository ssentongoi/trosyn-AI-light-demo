import React from 'react';

// Default mock values
const defaultContextValue = {
  currentUser: null,
  loading: false,
  error: null,
  login: jest.fn().mockResolvedValue({ success: true }),
  logout: jest.fn().mockResolvedValue({ success: true }),
  refreshToken: jest.fn().mockResolvedValue({ success: true }),
  register: jest.fn().mockResolvedValue({ success: true }),
  resetPassword: jest.fn().mockResolvedValue({ success: true }),
  updateProfile: jest.fn().mockResolvedValue({ success: true }),
};

// Create a React context with default values
const AuthContext = React.createContext(defaultContextValue);

export const useAuth = () => React.useContext(AuthContext);

export const AuthProvider = ({ children, value = {} }) => {
  // Merge default values with any provided values
  const contextValue = { ...defaultContextValue, ...value };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Mock the module
export default {
  AuthContext,
  useAuth,
  AuthProvider,
};
