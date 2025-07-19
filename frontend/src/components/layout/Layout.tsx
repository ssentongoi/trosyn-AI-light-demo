import React, { ReactNode, useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import AppBar from './AppBar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar onMenuClick={isMobile ? handleDrawerToggle : undefined} />
      <Sidebar 
        mobileOpen={mobileOpen} 
        onClose={handleDrawerClose} 
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { 
            xs: '100%', 
            md: `calc(100% - 240px)` 
          },
          ml: { 
            xs: 0, 
            md: '240px' 
          },
          mt: { 
            xs: '56px', 
            sm: '64px' 
          },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
