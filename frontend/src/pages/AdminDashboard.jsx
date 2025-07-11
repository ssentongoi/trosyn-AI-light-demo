import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Paper,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  ListItem,
  List,
  Menu,
  MenuItem,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Switch,
  FormControlLabel,
  FormGroup,
  FormLabel,
  FormHelperText,
  LinearProgress,
  Fade,
  Drawer
} from '@mui/material';
import {
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  AccountCircle as AccountCircleIcon,
  ExitToApp as ExitToAppIcon,
  Menu as MenuIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Api as ApiIcon,
  Help as HelpIcon,
  Analytics as AnalyticsIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { CircularProgress, Tooltip } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import UserManagement from '../components/admin/UserManagement';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import SystemSettings from '../components/admin/SystemSettings';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 3 } }}>
          <Typography component="div">{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

const AdminDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser, logout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New user registered', time: '2 minutes ago', read: false },
    { id: 2, message: 'System update available', time: '1 hour ago', read: true },
    { id: 3, message: 'New message from support', time: '3 hours ago', read: false },
  ]);
  
  const [stats, setStats] = useState({
    totalUsers: 1245,
    newUsers: 24,
    activeUsers: 189,
    apiCalls: 12450
  });
  
  const [recentActivities, setRecentActivities] = useState([
    { id: 1, type: 'user', message: 'John Doe updated profile', time: '2 minutes ago' },
    { id: 2, type: 'system', message: 'System backup completed', time: '1 hour ago' },
    { id: 3, type: 'api', message: 'API rate limit reached', time: '3 hours ago' },
  ]);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);
  
  const handleNotificationsOpen = useCallback((event) => {
    setAnchorEl(event.currentTarget);
    setNotificationsOpen(true);
  }, []);
  
  const handleProfileMenuOpen = useCallback((event) => {
    setAnchorEl(event.currentTarget);
    setProfileMenuOpen(true);
  }, []);
  
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
  }, []);
  
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadNotifications(0);
  }, []);
  
  const markNotificationAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadNotifications(prev => Math.max(0, prev - 1));
  }, []);
  
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Mock API functions - replace with actual API calls
  const fetchDashboardStats = useCallback(async () => {
    // Replace with actual API call
    return {
      totalUsers: 1245,
      newUsers: 24,
      activeUsers: 189,
      apiCalls: 12450
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    // Replace with actual API call
    return [
      { id: 1, message: 'New user registered', time: '2 minutes ago', read: false },
      { id: 2, message: 'System update available', time: '1 hour ago', read: true },
      { id: 3, message: 'New message from support', time: '3 hours ago', read: false },
    ];
  }, []);

  const fetchRecentActivities = useCallback(async () => {
    // Replace with actual API call
    return [
      { id: 1, type: 'user', message: 'John Doe updated profile', time: '2 minutes ago' },
      { id: 2, type: 'system', message: 'System backup completed', time: '1 hour ago' },
      { id: 3, type: 'api', message: 'API rate limit reached', time: '3 hours ago' },
    ];
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statsData, notificationsData, activitiesData] = await Promise.all([
          fetchDashboardStats(),
          fetchNotifications(),
          fetchRecentActivities()
        ]);
        
        setStats(statsData);
        setNotifications(notificationsData);
        setRecentActivities(activitiesData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        enqueueSnackbar('Failed to load dashboard data', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Set up refresh interval (every 5 minutes)
    const interval = setInterval(loadData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [enqueueSnackbar, fetchDashboardStats, fetchNotifications, fetchRecentActivities]);

  // Update tab based on route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/users')) setTabValue(1);
    else if (path.includes('/analytics')) setTabValue(2);
    else if (path.includes('/settings')) setTabValue(3);
    else setTabValue(0);
  }, [location]);

  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
    // Update URL based on tab
    switch(newValue) {
      case 0: navigate('/admin'); break;
      case 1: navigate('/admin/users'); break;
      case 2: navigate('/admin/analytics'); break;
      case 3: navigate('/admin/settings'); break;
      default: navigate('/admin');
    }
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [navigate, isMobile]);

  // Notification handlers (commented out as they're currently unused but might be needed later)
  /*
  const handleMarkNotificationAsRead = useCallback(async (id) => {
    try {
      // In a real app, this would be an API call
      // const success = await markNotificationAsRead(id);
      const success = true; // Mock success
      if (success) {
        setNotifications(prev => prev.map(n => 
          n.id === id ? { ...n, read: true } : n
        ));
      }
      return success;
    } catch (error) {
      console.error('Failed to mark notification as read', error);
      enqueueSnackbar('Failed to mark notification as read', { variant: 'error' });
      return false;
    }
  }, [enqueueSnackbar]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      // In a real app, this would be an API call
      // const success = await markAllNotificationsAsRead();
      const success = true; // Mock success
      if (success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
      return success;
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
      enqueueSnackbar('Failed to mark all notifications as read', { variant: 'error' });
      return false;
    }
  }, [enqueueSnackbar]);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  */

  const getUserInitials = (name = '') => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleColor = (role) => {
    switch(role?.toLowerCase()) {
      case 'admin': return 'primary';
      case 'user': return 'success';
      case 'manager': return 'warning';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: <DashboardIcon />, 
      index: 0,
      path: '/admin'
    },
    { 
      label: 'User Management', 
      icon: <PeopleIcon />, 
      index: 1,
      path: '/admin/users'
    },
    { 
      label: 'Analytics', 
      icon: <AnalyticsIcon />, 
      index: 2,
      path: '/admin/analytics'
    },
    { 
      label: 'System Settings', 
      icon: <SettingsIcon />, 
      index: 3,
      path: '/admin/settings'
    },
  ];

  const renderNotifications = () => (
    <Menu
      anchorEl={anchorEl}
      open={notificationsOpen}
      onClose={handleMenuClose}
      onClick={handleMenuClose}
      PaperProps={{
        elevation: 3,
        sx: {
          width: 350,
          maxWidth: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">Notifications</Typography>
        <Button size="small" onClick={(e) => {
          e.stopPropagation();
          markAllAsRead();
        }}>
          Mark all as read
        </Button>
      </Box>
      <Divider />
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress size={24} />
        </Box>
      ) : notifications.length > 0 ? (
        notifications.map((notification) => (
          <MenuItem 
            key={notification.id} 
            onClick={() => markNotificationAsRead(notification.id)}
            sx={{
              bgcolor: notification.read ? 'inherit' : 'action.hover',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <ListItemIcon>
              {notification.read ? <NotificationsIcon /> : <NotificationsActiveIcon color="primary" />}
            </ListItemIcon>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2">{notification.message}</Typography>
              <Typography variant="caption" color="textSecondary">
                {notification.time}
              </Typography>
            </Box>
          </MenuItem>
        ))
      ) : (
        <Box p={2} textAlign="center">
          <Typography variant="body2" color="textSecondary">
            No new notifications
          </Typography>
        </Box>
      )}
      <Divider />
      <Box p={1} display="flex" justifyContent="center">
        <Button size="small" onClick={() => navigate('/admin/notifications')}>
          View All Notifications
        </Button>
      </Box>
    </Menu>
  );

  const renderProfileMenu = () => (
    <Menu
      anchorEl={anchorEl}
      open={profileMenuOpen}
      onClose={handleMenuClose}
      onClick={handleMenuClose}
      PaperProps={{
        elevation: 3,
        sx: { width: 250, maxWidth: '100%' },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1">{currentUser?.name || 'User'}</Typography>
        <Typography variant="body2" color="textSecondary">
          {currentUser?.email || 'user@example.com'}
        </Typography>
      </Box>
      <Divider />
      <MenuItem onClick={() => navigate('/admin/profile')}>
        <ListItemIcon>
          <PersonIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">My Profile</Typography>
      </MenuItem>
      <MenuItem onClick={() => navigate('/admin/settings')}>
        <ListItemIcon>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">Settings</Typography>
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">Logout</Typography>
      </MenuItem>
    </Menu>
  );

  const renderSidebar = () => (
    <div>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <AdminPanelSettingsIcon sx={{ mr: 1 }} />
          <Typography variant="h6" noWrap component="div">
            Trosyn AI
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle} sx={{ ml: 'auto' }}>
          {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem 
            key={item.index} 
            disablePadding 
            onClick={() => navigate(item.path)}
            sx={{
              bgcolor: tabValue === item.index ? 'action.selected' : 'transparent',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ListItemButton>
              <ListItemIcon sx={{ minWidth: 40 }}>
                {React.cloneElement(item.icon, {
                  color: tabValue === item.index ? 'primary' : 'inherit'
                })}
              </ListItemIcon>
              <ListItemText primary={item.label} />
              {tabValue === item.index && (
                <Box sx={{ width: 4, height: 40, bgcolor: 'primary.main', borderRadius: '4px 0 0 4px' }} />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems[tabValue]?.label || 'Admin Dashboard'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Notifications">
              <IconButton 
                size="large" 
                color="inherit" 
                onClick={handleNotificationsOpen}
                aria-label={`show ${unreadNotifications} new notifications`}
              >
                <Badge badgeContent={unreadNotifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Button
              startIcon={
                currentUser?.photoURL ? (
                  <Avatar 
                    src={currentUser.photoURL} 
                    sx={{ width: 24, height: 24 }}
                  />
                ) : (
                  <AccountCircleIcon />
                )
              }
              onClick={handleProfileMenuOpen}
              color="inherit"
              sx={{ 
                textTransform: 'none',
                ml: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                {currentUser?.displayName || currentUser?.email || 'User'}
              </Box>
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Sidebar */}
        <Paper 
          elevation={0}
          sx={{
            width: { xs: mobileOpen ? 240 : 0, sm: 240 },
            flexShrink: 0,
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            borderRight: '1px solid',
            borderColor: 'divider',
            display: { xs: mobileOpen ? 'block' : 'none', sm: 'block' },
            position: { xs: 'fixed', sm: 'static' },
            height: { xs: 'calc(100% - 64px)', sm: 'auto' },
            zIndex: 1100,
            backgroundColor: 'background.paper',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ mb: 4, mt: 2, textAlign: 'center' }}>
              <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h6" color="primary">Admin Panel</Typography>
            </Box>
            
            <Tabs
              orientation="vertical"
              variant="scrollable"
              value={tabValue}
              onChange={handleTabChange}
              aria-label="Admin navigation"
              sx={{
                borderRight: 1,
                borderColor: 'divider',
                '& .MuiTabs-indicator': {
                  left: 0,
                  right: 'auto',
                },
              }}
            >
              {menuItems.map((item) => (
                <Tab
                  key={item.index}
                  icon={item.icon}
                  iconPosition="start"
                  label={item.label}
                  {...a11yProps(item.index)}
                  sx={{
                    minHeight: 48,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    '&.Mui-selected': {
                      color: 'primary.main',
                      backgroundColor: 'action.selected',
                    },
                  }}
                />
              ))}
            </Tabs>
          </Box>
        </Paper>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - 240px)` },
            ml: { sm: '240px' },
            mt: { xs: '64px', sm: 0 },
            backgroundColor: 'background.default',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TabPanel value={tabValue} index={0}>
                <Box mb={4}>
                  <Typography variant="h4" gutterBottom>
                    Dashboard Overview
                  </Typography>
                  <Typography color="textSecondary" paragraph>
                    Welcome back, {currentUser?.displayName || 'Admin'}. Here's what's happening with your system.
                  </Typography>
                </Box>
                
                {/* Stats Grid */}
                <Grid container spacing={3} mb={4}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography color="textSecondary" gutterBottom>Total Users</Typography>
                            <Typography variant="h4">{stats.totalUsers}</Typography>
                            <Typography variant="body2" color="success.main">
                              +{stats.newUsers} new this month
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <PeopleIcon />
                          </Avatar>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography color="textSecondary" gutterBottom>Active Users</Typography>
                            <Typography variant="h4">{stats.activeUsers}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              Currently online
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'success.main' }}>
                            <PersonIcon />
                          </Avatar>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography color="textSecondary" gutterBottom>API Requests</Typography>
                            <Typography variant="h4">
                              {(stats.apiCalls / 1000).toFixed(1)}K
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              This month
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            <ApiIcon />
                          </Avatar>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography color="textSecondary" gutterBottom>System Status</Typography>
                            <Typography variant="h4">Operational</Typography>
                            <Typography variant="body2" color="success.main">
                              All systems normal
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: 'success.main' }}>
                            <CheckCircleIcon />
                          </Avatar>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                {/* Recent Activity */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Card>
                      <CardHeader 
                        title="Recent Activity" 
                        action={
                          <Button size="small" onClick={() => navigate('/admin/activity')}>
                            View All
                          </Button>
                        }
                      />
                      <Divider />
                      <CardContent>
                        <List>
                          {recentActivities.slice(0, 5).map((activity) => (
                            <ListItem key={activity.id} disablePadding>
                              <ListItemButton>
                                <ListItemIcon>
                                  {activity.type === 'user' ? (
                                    <PersonIcon color="primary" />
                                  ) : activity.type === 'system' ? (
                                    <SettingsIcon color="secondary" />
                                  ) : (
                                    <ApiIcon color="action" />
                                  )}
                                </ListItemIcon>
                                <ListItemText 
                                  primary={activity.message}
                                  secondary={activity.time}
                                />
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardHeader title="Quick Actions" />
                      <Divider />
                      <CardContent>
                        <List>
                          <ListItem disablePadding>
                            <ListItemButton onClick={() => navigate('/admin/users/new')}>
                              <ListItemIcon>
                                <PersonAddIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText primary="Add New User" />
                            </ListItemButton>
                          </ListItem>
                          <ListItem disablePadding>
                            <ListItemButton onClick={() => navigate('/admin/settings')}>
                              <ListItemIcon>
                                <SettingsIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText primary="System Settings" />
                            </ListItemButton>
                          </ListItem>
                          <ListItem disablePadding>
                            <ListItemButton onClick={() => navigate('/admin/help')}>
                              <ListItemIcon>
                                <HelpIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText primary="Help & Support" />
                            </ListItemButton>
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <UserManagement />
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                <AnalyticsDashboard />
              </TabPanel>
              
              <TabPanel value={tabValue} index={3}>
                <SystemSettings />
              </TabPanel>
            </>
          )}
        </Box>
      </Box>
      
      {/* Notifications Menu */}
      {renderNotifications()}
      
      {/* Profile Menu */}
      {renderProfileMenu()}
      
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box',
            width: 240,
            borderRight: 'none',
            boxShadow: theme.shadows[8],
          },
        }}
      >
        {renderSidebar()}
      </Drawer>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleMenuClose}>
          <Avatar /> Profile
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Avatar>My Account</Avatar>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <ExitToAppIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AdminDashboard;
