import React from 'react';
import PropTypes from 'prop-types';
import { Box, Container, Grid, useMediaQuery, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledDashboardLayout = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: theme.palette.grey[100],
}));

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const DashboardLayout = ({ 
  header, 
  sidebar, 
  children, 
  maxWidth = 'xl',
  ...props 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <StyledDashboardLayout {...props}>
      {/* Header */}
      {header && React.cloneElement(header, {
        onMenuClick: handleDrawerToggle,
        isMobile,
      })}

      <Box sx={{ display: 'flex' }}>
        {/* Sidebar */}
        {sidebar && React.cloneElement(sidebar, {
          mobileOpen,
          onClose: handleDrawerToggle,
          isMobile,
        })}

        {/* Main Content */}
        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto' }}>
          <MainContent>
            <Container maxWidth={maxWidth}>
              {children}
            </Container>
          </MainContent>
        </Box>
      </Box>
    </StyledDashboardLayout>
  );
};

DashboardLayout.propTypes = {
  header: PropTypes.node,
  sidebar: PropTypes.node,
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', false]),
};

export default DashboardLayout;
