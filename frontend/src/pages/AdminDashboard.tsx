import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Drawer,
  CircularProgress as MuiCircularProgress,
  Tooltip
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
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import UserManagement from '../components/admin/UserManagement';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import SystemSettings from '../components/admin/SystemSettings';

// Types
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  [key: string]: any;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
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
};

const a11yProps = (index: number) => {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
};

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'superadmin';
  avatar?: string;
  lastActive?: string;
}

const AdminDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser, logout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tabValue, setTabValue] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    autoSave: true,
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Mock data - replace with real API calls
  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockNotifications: Notification[] = [
          {
            id: '1',
            title: 'System Update',
            message: 'A new system update is available',
            read: false,
            timestamp: new Date(),
            type: 'info'
          },
          {
            id: '2',
            title: 'New User Registration',
            message: 'A new user has registered',
            read: true,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            type: 'success'
          },
          {
            id: '3',
            title: 'Warning',
            message: 'High server load detected',
            read: false,
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            type: 'warning'
          }
        ];
        
        setNotifications(mockNotifications);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        enqueueSnackbar('Failed to load notifications', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Set up online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enqueueSnackbar]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      enqueueSnackbar('Failed to log out', { variant: 'error' });
    }
  };

  const markAllAsRead = () => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => ({
        ...notification,
        read: true
      }))
    );
    enqueueSnackbar('All notifications marked as read', { variant: 'success' });
  };

  const handleSettingChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [setting]: event.target.checked
    });
    enqueueSnackbar('Settings updated', { variant: 'success' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const menuOpen = Boolean(anchorEl);
  const isMenuOpen = Boolean(anchorEl);
  const menuId = 'primary-search-account-menu';

  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
        <ListItemIcon>
          <PersonIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Profile</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
        <ListItemIcon>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Settings</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Admin Panel
        </Typography>
        <IconButton onClick={handleDrawerToggle}>
          {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List>
        <ListItemButton 
          selected={tabValue === 0} 
          onClick={() => setTabValue(0)}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        
        <ListItemButton 
          selected={tabValue === 1}
          onClick={() => setTabValue(1)}
        >
          <ListItemIcon>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText primary="Users" />
          {unreadCount > 0 && (
            <Badge badgeContent={unreadCount} color="error" />
          )}
        </ListItemButton>
        
        <ListItemButton 
          selected={tabValue === 2}
          onClick={() => setTabValue(2)}
        >
          <ListItemIcon>
            <AnalyticsIcon />
          </ListItemIcon>
          <ListItemText primary="Analytics" />
        </ListItemButton>
        
        <ListItemButton 
          selected={tabValue === 3}
          onClick={() => setTabValue(3)}
        >
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Trosyn AI Admin
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={isOnline ? 'Online' : 'Offline'}>
              <Box sx={{ 
                width: 10, 
                height: 10, 
                borderRadius: '50%', 
                bgcolor: isOnline ? 'success.main' : 'error.main',
                mr: 2
              }} />
            </Tooltip>
            
            <IconButton 
              size="large" 
              aria-label="show new notifications" 
              color="inherit"
              onClick={() => setTabValue(notifications.length > 0 ? 1 : 0)}
            >
              <Badge badgeContent={unreadCount} color="error">
                {unreadCount > 0 ? <NotificationsActiveIcon /> : <NotificationsIcon />}
              </Badge>
            </IconButton>
            
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              {currentUser?.photoURL ? (
                <Avatar 
                  alt={currentUser.displayName || 'User'} 
                  src={currentUser.photoURL} 
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <AccountCircleIcon />
              )}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ 
          width: { sm: 240 },
          flexShrink: { sm: 0 },
        }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: 240,
              borderRight: 'none',
              backgroundColor: 'background.paper',
              boxShadow: (theme) => theme.shadows[1]
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - 240px)` },
          mt: '64px' 
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <MuiCircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h4" gutterBottom>
                Dashboard Overview
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Total Users
                      </Typography>
                      <Typography variant="h4">1,234</Typography>
                      <Typography color="textSecondary">+12% from last month</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Active Sessions
                      </Typography>
                      <Typography variant="h4">42</Typography>
                      <Typography color="textSecondary">+5% from yesterday</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        System Status
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box 
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: 'success.main',
                            mr: 1
                          }} 
                        />
                        <Typography variant="h6">All Systems Operational</Typography>
                      </Box>
                      <Typography color="textSecondary">Last updated: Just now</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card>
                    <CardHeader 
                      title="Recent Activity" 
                      action={
                        <Button 
                          size="small" 
                          color="primary"
                          onClick={markAllAsRead}
                          disabled={unreadCount === 0}
                        >
                          Mark all as read
                        </Button>
                      }
                    />
                    <CardContent>
                      <List>
                        {notifications.slice(0, 5).map((notification) => (
                          <ListItem 
                            key={notification.id} 
                            sx={{
                              bgcolor: notification.read ? 'transparent' : 'action.hover',
                              borderRadius: 1,
                              mb: 1
                            }}
                          >
                            <ListItemIcon>
                              {notification.type === 'success' && <CheckCircleIcon color="success" />}
                              {notification.type === 'warning' && <NotificationsActiveIcon color="warning" />}
                              {notification.type === 'error' && <ErrorIcon color="error" />}
                              {notification.type === 'info' && <NotificationsIcon color="info" />}
                            </ListItemIcon>
                            <ListItemText
                              primary={notification.title}
                              secondary={
                                <>
                                  {notification.message}
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="textSecondary"
                                    display="block"
                                  >
                                    {new Date(notification.timestamp).toLocaleString()}
                                  </Typography>
                                </>
                              }
                            />
                          </ListItem>
                        ))}
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
      
      {renderMenu}
    </Box>
  );
};

export default AdminDashboard;
