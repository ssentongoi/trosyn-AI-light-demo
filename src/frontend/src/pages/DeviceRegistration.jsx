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
  Chip
} from '@mui/material';
import { 
  QrCode2 as QrCodeIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Mock device data - replace with real API calls
const mockDevices = [
  { id: 'DEV-001', name: 'Office Desktop', status: 'active', lastSeen: '2023-06-20T10:30:00Z' },
  { id: 'DEV-002', name: 'Laptop - John', status: 'pending', lastSeen: '2023-06-19T15:45:00Z' },
];

const DeviceRegistration = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState(mockDevices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [activeTab, setActiveTab] = useState('register'); // 'register' or 'list'

  // Generate a random PIN for demo purposes
  const generatePin = () => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(newPin);
    // In a real app, this would generate a QR code with the device ID and PIN
    setQrCode(`data:image/svg+xml;base64,${btoa(`<svg>QR Code for PIN: ${newPin}</svg>`)}`);
  };

  const handleRegisterDevice = async (e) => {
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
      
      const newDevice = {
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

  const handleVerifyDevice = async (deviceId) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDevices(devices.map(device => 
        device.id === deviceId 
          ? { ...device, status: 'active' } 
          : device
      ));
      
      setSuccess('Device verified successfully');
    } catch (err) {
      setError('Failed to verify device');
      console.error('Device verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    if (!window.confirm('Are you sure you want to remove this device?')) return;
    
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDevices(devices.filter(device => device.id !== deviceId));
      setSuccess('Device removed successfully');
    } catch (err) {
      setError('Failed to remove device');
      console.error('Device removal error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
  };

  // Check if user is authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Device Management
        </Typography>
        <Box>
          <Button
            variant={activeTab === 'register' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('register')}
            sx={{ mr: 1 }}
          >
            Register New Device
          </Button>
          <Button
            variant={activeTab === 'list' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('list')}
          >
            My Devices ({devices.length})
          </Button>
        </Box>
      </Box>

      {activeTab === 'register' ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Register New Device
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box component="form" onSubmit={handleRegisterDevice}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Device ID"
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                      placeholder="Enter device identifier"
                      required
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <QrCodeIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Device Name"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="e.g., John's Laptop"
                      required
                      disabled={loading}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <TextField
                        fullWidth
                        label="Verification PIN"
                        value={pin}
                        type={showPin ? 'text' : 'password'}
                        disabled
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPin(!showPin)}
                                edge="end"
                              >
                                {showPin ? '👁️' : '👁️‍🗨️'}
                              </IconButton>
                              <IconButton
                                onClick={generatePin}
                                edge="end"
                                disabled={loading}
                              >
                                <RefreshIcon />
                              </IconButton>
                              {pin && (
                                <IconButton
                                  onClick={() => copyToClipboard(pin)}
                                  edge="end"
                                  color="primary"
                                >
                                  <CopyIcon />
                                </IconButton>
                              )}
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                    <Button
                      variant="outlined"
                      onClick={generatePin}
                      disabled={loading}
                      startIcon={<RefreshIcon />}
                      sx={{ mr: 1 }}
                    >
                      Generate PIN
                    </Button>
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={!pin || loading}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                      {loading ? 'Registering...' : 'Register Device'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
              
              {pin && (
                <Box mt={3}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Verification Instructions:
                  </Typography>
                  <ol>
                    <li>Save this PIN: <strong>{pin}</strong></li>
                    <li>On the device, open the Trosyn AI app</li>
                    <li>Go to Settings &gt; Add Device</li>
                    <li>Enter the PIN when prompted</li>
                    <li>Wait for admin approval</li>
                  </ol>
                </Box>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {qrCode ? (
                <>
                  <Typography variant="h6" gutterBottom>
                    Scan QR Code
                  </Typography>
                  <Box 
                    component="img" 
                    src={qrCode} 
                    alt="QR Code" 
                    sx={{ 
                      width: 200, 
                      height: 200, 
                      border: '1px solid #eee',
                      mb: 2,
                      p: 1,
                      bgcolor: 'white'
                    }} 
                  />
                  <Typography variant="body2" color="textSecondary" align="center">
                    Scan this QR code with the Trosyn AI mobile app
                  </Typography>
                </>
              ) : (
                <Box textAlign="center">
                  <QrCodeIcon sx={{ fontSize: 80, color: 'action.active', mb: 2 }} />
                  <Typography variant="body1" color="textSecondary">
                    Generate a PIN to display the QR code
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Registered Devices
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
          
          {devices.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="subtitle1" color="textSecondary">
                No devices registered yet. Register a new device to get started.
              </Typography>
            </Box>
          ) : (
            <Box>
              {devices.map((device) => (
                <Card key={device.id} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle1">
                          {device.name}
                          <Chip 
                            label={device.status}
                            size="small"
                            color={device.status === 'active' ? 'success' : 'default'}
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {device.id}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2">
                          Last seen: {new Date(device.lastSeen).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                        {device.status === 'pending' && (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleVerifyDevice(device.id)}
                            disabled={loading}
                            sx={{ mr: 1 }}
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<ErrorIcon />}
                          onClick={() => handleRemoveDevice(device.id)}
                          disabled={loading}
                        >
                          Remove
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Paper>
      )}

      <Snackbar 
        open={!!error || !!success} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={error ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {error || success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeviceRegistration;
