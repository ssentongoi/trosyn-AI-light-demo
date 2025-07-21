import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Chip,
  Tab,
  Tabs
} from '@mui/material';
import { 
  QrCode2 as QrCodeIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ContentCopy as CopyIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Types
type DeviceStatus = 'active' | 'inactive' | 'pending';

interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  lastSeen: string;
}

type TabValue = 'register' | 'list';

// Mock device data - replace with real API calls
const mockDevices: Device[] = [
  { id: 'DEV-001', name: 'Office Desktop', status: 'active', lastSeen: '2023-06-20T10:30:00Z' },
  { id: 'DEV-002', name: 'Laptop - John', status: 'pending', lastSeen: '2023-06-19T15:45:00Z' },
];

const DeviceRegistration: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabValue>('register');

  // Generate a random PIN for demo purposes
  const generatePin = (): void => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(newPin);
    // In a real app, this would generate a QR code with the device ID and PIN
    setQrCode(`data:image/svg+xml;base64,${btoa(`<svg>QR Code for PIN: ${newPin}</svg>`)}`);
  };

  const handleRegisterDevice = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!deviceId || !deviceName) {
      setError('Device ID and Name are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newDevice: Device = {
        id: deviceId,
        name: deviceName,
        status: 'pending',
        lastSeen: new Date().toISOString(),
      };
      
      setDevices([...devices, newDevice]);
      setDeviceId('');
      setDeviceName('');
      setSuccess('Device registration request sent successfully');
      setActiveTab('list');
    } catch (err) {
      setError('Failed to register device. Please try again.');
      console.error('Device registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDevice = async (deviceId: string): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDevices(devices.map(device => 
        device.id === deviceId 
          ? { ...device, status: 'active' as DeviceStatus } 
          : device
      ));
      
      setSuccess('Device verified successfully');
    } catch (err) {
      setError('Failed to verify device. Please try again.');
      console.error('Device verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to remove this device?')) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDevices(devices.filter(device => device.id !== deviceId));
      setSuccess('Device removed successfully');
    } catch (err) {
      setError('Failed to remove device. Please try again.');
      console.error('Device removal error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  const handleCloseSnackbar = (): void => {
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // Generate PIN on component mount
  useEffect(() => {
    generatePin();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Device Registration
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue as TabValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="Register New Device" value="register" />
          <Tab label="My Devices" value="list" />
        </Tabs>
        
        {activeTab === 'register' ? (
          <form onSubmit={handleRegisterDevice}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Device ID"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Device Name"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  margin="normal"
                  required
                />
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Verification PIN:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      disabled
                      sx={{ flexGrow: 1 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPin(!showPin)}
                              edge="end"
                            >
                              {showPin ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                            <IconButton
                              onClick={() => handleCopyToClipboard(pin)}
                              edge="end"
                            >
                              <CopyIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button 
                      variant="outlined" 
                      onClick={generatePin}
                      startIcon={<RefreshIcon />}
                    >
                      New PIN
                    </Button>
                  </Box>
                </Box>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading || !deviceId || !deviceName}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Registering...' : 'Register Device'}
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      QR Code for Authentication
                    </Typography>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: 200,
                        backgroundColor: '#f5f5f5',
                        mb: 2,
                        p: 2
                      }}
                    >
                      {qrCode ? (
                        <img 
                          src={qrCode} 
                          alt="QR Code" 
                          style={{ maxWidth: '100%', maxHeight: 180 }} 
                        />
                      ) : (
                        <CircularProgress />
                      )}
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Scan this QR code with your device camera to authenticate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </form>
        ) : (
          <Box>
            {devices.length === 0 ? (
              <Typography>No devices registered yet.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {devices.map((device) => (
                  <Card key={device.id} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h6">{device.name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            ID: {device.id}
                          </Typography>
                          <Chip 
                            label={device.status.toUpperCase()}
                            color={
                              device.status === 'active' ? 'success' : 
                              device.status === 'pending' ? 'warning' : 'default'
                            }
                            size="small"
                            sx={{ mt: 1, mr: 1 }}
                          />
                          <Typography variant="caption" display="block" color="textSecondary">
                            Last seen: {new Date(device.lastSeen).toLocaleString()}
                          </Typography>
                        </Box>
                        <Box>
                          {device.status === 'pending' && (
                            <Button
                              variant="outlined"
                              color="primary"
                              onClick={() => handleVerifyDevice(device.id)}
                              disabled={loading}
                              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                              sx={{ mr: 1 }}
                            >
                              Verify
                            </Button>
                          )}
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => handleRemoveDevice(device.id)}
                            disabled={loading}
                          >
                            Remove
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Success/Error Snackbars */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeviceRegistration;
