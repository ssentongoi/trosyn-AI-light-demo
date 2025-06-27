import React, { useState, useRef } from 'react';
import { useMemory } from '../../contexts/MemoryContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  Alert,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import { CloudUpload, CloudDownload, Delete } from '@mui/icons-material';

const MemorySettings = () => {
  const { 
    context, 
    isLoading, 
    updateContext, 
    exportMemory, 
    importMemory, 
    clearMemory 
  } = useMemory();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const result = await exportMemory();
      if (result.success) {
        showSnackbar('Memory exported successfully', 'success');
      } else {
        throw new Error(result.error || 'Failed to export memory');
      }
    } catch (error) {
      console.error('Export error:', error);
      showSnackbar(error.message || 'Failed to export memory', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const result = await importMemory(file);
      if (result.success) {
        showSnackbar('Memory imported successfully', 'success');
      } else {
        throw new Error(result.error || 'Failed to import memory');
      }
    } catch (error) {
      console.error('Import error:', error);
      showSnackbar(error.message || 'Failed to import memory', 'error');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsImporting(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear all memory? This action cannot be undone.')) {
      return;
    }

    try {
      setIsClearing(true);
      const result = await clearMemory();
      if (result.success) {
        showSnackbar('Memory cleared successfully', 'success');
      } else {
        throw new Error(result.error || 'Failed to clear memory');
      }
    } catch (error) {
      console.error('Clear error:', error);
      showSnackbar(error.message || 'Failed to clear memory', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    updateContext({
      preferences: {
        ...context?.preferences,
        [key]: value,
      },
    });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (isLoading && !context) {
    return <LinearProgress />;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Memory Settings
      </Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardHeader title="Memory Management" />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Import/Export Memory
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Export your memory to a file or import from a previous export.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<CloudDownload />}
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export Memory'}
                </Button>
                
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  disabled={isImporting}
                >
                  {isImporting ? 'Importing...' : 'Import Memory'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    hidden
                    onChange={handleImport}
                    disabled={isImporting}
                  />
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Danger Zone
              </Typography>
              <Typography variant="body2" color="error" paragraph>
                Clearing memory will remove all stored context and interactions.
                This action cannot be undone.
              </Typography>
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleClear}
                disabled={isClearing}
              >
                {isClearing ? 'Clearing...' : 'Clear All Memory'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default MemorySettings;
