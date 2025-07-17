import React, { ReactNode } from 'react';
import { Box } from '@mui/material';
import AppBar from './AppBar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          marginTop: '64px', // Adjust based on your AppBar height
          width: 'calc(100% - 240px)', // Adjust based on your Sidebar width
          marginLeft: '240px', // Adjust based on your Sidebar width
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
