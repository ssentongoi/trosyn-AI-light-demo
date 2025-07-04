import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import { Save, Refresh, Security, Settings, Api } from '@mui/icons-material';

// Mock data - replace with actual API calls
const mockSettings = {
  general: {
    siteName: 'Trosyn AI',
    siteDescription: 'Self-hosted AI Assistant Platform',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
  },
  security: {
    requireEmailVerification: true,
    enableTwoFactorAuth: true,
    failedLoginAttempts: 5,
    sessionTimeout: 30, // in minutes
    passwordMinLength: 8,
  },
  api: {
    enableApiAccess: true,
    rateLimit: 1000, // requests per hour
    enableSwagger: true,
    enableCors: true,
    allowedOrigins: '*',
  },
};

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const SystemSettings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState(mockSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSettings(mockSettings);
      } catch (err) {
        showSnackbar('Failed to load settings', 'error');
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChange = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const handleToggle = (section, key) => (event) => {
    handleChange(section, key, event.target.checked);
  };

  const handleInputChange = (section, key) => (event) => {
    handleChange(section, key, event.target.value);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showSnackbar('Settings saved successfully');
    } catch (err) {
      showSnackbar('Failed to save settings', 'error');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(mockSettings);
    showSnackbar('Changes discarded', 'info');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          System Settings
        </Typography>
        <Box>
          <Button
            variant="outlined"
            onClick={handleReset}
            startIcon={<Refresh />}
            sx={{ mr: 1 }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="General" icon={<Settings />} iconPosition="start" />
          <Tab label="Security" icon={<Security />} iconPosition="start" />
          <Tab label="API" icon={<Api />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Site Name"
                value={settings.general.siteName}
                onChange={handleInputChange('general', 'siteName')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Site Description"
                value={settings.general.siteDescription}
                onChange={handleInputChange('general', 'siteDescription')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={settings.general.timezone}
                  onChange={handleInputChange('general', 'timezone')}
                  label="Timezone"
                >
                  {timezones.map((tz) => (
                    <MenuItem key={tz} value={tz}>
                      {tz}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Date Format"
                value={settings.general.dateFormat}
                onChange={handleInputChange('general', 'dateFormat')}
                margin="normal"
                helperText="e.g., YYYY-MM-DD, MM/DD/YYYY"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Time Format</InputLabel>
                <Select
                  value={settings.general.timeFormat}
                  onChange={handleInputChange('general', 'timeFormat')}
                  label="Time Format"
                >
                  <MenuItem value="12h">12-hour (1:00 PM)</MenuItem>
                  <MenuItem value="24h">24-hour (13:00)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.security.requireEmailVerification}
                    onChange={handleToggle('security', 'requireEmailVerification')}
                  />
                }
                label="Require Email Verification"
              />
              <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mt: -1, mb: 2 }}>
                Users must verify their email address before accessing the platform.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.security.enableTwoFactorAuth}
                    onChange={handleToggle('security', 'enableTwoFactorAuth')}
                  />
                }
                label="Enable Two-Factor Authentication"
              />
              <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mt: -1, mb: 2 }}>
                Require users to set up two-factor authentication for added security.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Failed Login Attempts Before Lockout"
                value={settings.security.failedLoginAttempts}
                onChange={handleInputChange('security', 'failedLoginAttempts')}
                margin="normal"
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Session Timeout (minutes)"
                value={settings.security.sessionTimeout}
                onChange={handleInputChange('security', 'sessionTimeout')}
                margin="normal"
                inputProps={{ min: 1, max: 1440 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Password Length"
                value={settings.security.passwordMinLength}
                onChange={handleInputChange('security', 'passwordMinLength')}
                margin="normal"
                inputProps={{ min: 6, max: 64 }}
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.api.enableApiAccess}
                    onChange={handleToggle('api', 'enableApiAccess')}
                  />
                }
                label="Enable API Access"
              />
              <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mt: -1, mb: 2 }}>
                Allow API access to the platform. When disabled, all API requests will be rejected.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Rate Limit (requests per hour)"
                value={settings.api.rateLimit}
                onChange={handleInputChange('api', 'rateLimit')}
                margin="normal"
                disabled={!settings.api.enableApiAccess}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.api.enableSwagger}
                    onChange={handleToggle('api', 'enableSwagger')}
                    disabled={!settings.api.enableApiAccess}
                  />
                }
                label="Enable Swagger UI"
              />
              <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mt: -1, mb: 2 }}>
                Enable the interactive API documentation at /api/docs
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.api.enableCors}
                    onChange={handleToggle('api', 'enableCors')}
                    disabled={!settings.api.enableApiAccess}
                  />
                }
                label="Enable CORS"
              />
              <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mt: -1, mb: 2 }}>
                Allow Cross-Origin Resource Sharing for API requests
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Allowed Origins"
                value={settings.api.allowedOrigins}
                onChange={handleInputChange('api', 'allowedOrigins')}
                margin="normal"
                disabled={!settings.api.enableApiAccess || !settings.api.enableCors}
                helperText="Comma-separated list of allowed origins (e.g., https://example.com,http://localhost:3000)"
              />
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSettings;
