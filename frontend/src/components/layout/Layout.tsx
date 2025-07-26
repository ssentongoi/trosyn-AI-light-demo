import React, { ReactNode, useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import AppBar from './AppBar';
import Sidebar from './Sidebar';
import AiAssistantSidebar from './AiAssistantSidebar';
import { useApp } from '../../contexts/AppContext';

const LEFT_SIDEBAR_WIDTH = 240;
const RIGHT_SIDEBAR_WIDTH = 320;

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAiAssistantOpen } = useApp();

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
        width={LEFT_SIDEBAR_WIDTH}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: `calc(100% - ${LEFT_SIDEBAR_WIDTH}px - ${isAiAssistantOpen ? RIGHT_SIDEBAR_WIDTH : 0}px)`,
          ml: { 
            xs: 0, 
            md: `${LEFT_SIDEBAR_WIDTH}px` 
          },
          mr: isAiAssistantOpen ? `${RIGHT_SIDEBAR_WIDTH}px` : 0,
          mt: { 
            xs: '56px', 
            sm: '64px' 
          },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {children}
      </Box>
      {isAiAssistantOpen && (
        <Box
          component="aside"
          sx={{
            width: RIGHT_SIDEBAR_WIDTH,
            position: 'fixed',
            right: 0,
            top: { xs: '56px', sm: '64px' }, // Position below AppBar
            height: '100%',
            zIndex: theme.zIndex.drawer -1, // Below the main sidebar on mobile
          }}
        >
          <AiAssistantSidebar />
        </Box>
      )}
    </Box>
  );
};

export default Layout;
