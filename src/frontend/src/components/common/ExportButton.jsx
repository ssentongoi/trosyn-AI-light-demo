import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PdfIcon,
  GridOn as ExcelIcon,
  TableChart as CsvIcon,
} from '@mui/icons-material';
import { exportData } from '../../utils/exportUtils';

const ExportButton = ({
  data = [],
  filename = 'export',
  title = 'Export',
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError,
  ...props
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (format) => {
    if (!data || data.length === 0) {
      setSnackbar({
        open: true,
        message: 'No data to export',
        severity: 'warning',
      });
      return;
    }

    setLoading(true);
    onExportStart?.();

    try {
      await exportData(data, format, { filename, title });
      onExportComplete?.();
      setSnackbar({
        open: true,
        message: `Exported successfully to ${format.toUpperCase()}!`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Export failed:', error);
      onExportError?.(error);
      setSnackbar({
        open: true,
        message: `Export failed: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const exportOptions = [
    { format: 'csv', label: 'CSV', icon: <CsvIcon fontSize="small" /> },
    { format: 'excel', label: 'Excel', icon: <ExcelIcon fontSize="small" /> },
    { format: 'pdf', label: 'PDF', icon: <PdfIcon fontSize="small" /> },
  ];

  return (
    <>
      <Tooltip title="Export data">
        <span>
          <Button
            variant="outlined"
            color="primary"
            startIcon={loading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
            onClick={handleClick}
            disabled={disabled || loading}
            {...props}
          >
            {loading ? 'Exporting...' : 'Export'}
          </Button>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {exportOptions.map((option) => (
          <MenuItem
            key={option.format}
            onClick={() => handleExport(option.format)}
            disabled={loading}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ExportButton;
