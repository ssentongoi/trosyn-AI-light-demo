import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Grid,
  Paper,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Stack,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  DateRange as DateRangeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Block as BlockIcon,
  Person as PersonIcon,
  PersonOff as PersonOffIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active', icon: <CheckCircleIcon fontSize="small" /> },
  { value: 'inactive', label: 'Inactive', icon: <CancelIcon fontSize="small" /> },
  { value: 'suspended', label: 'Suspended', icon: <BlockIcon fontSize="small" /> },
  { value: 'pending', label: 'Pending', icon: <HourglassEmptyIcon fontSize="small" /> },
];

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

const UserFilters = ({
  filters,
  onFilterChange,
  onReset,
  availableRoles = [],
  showAdvanced = false,
  onToggleAdvanced,
}) => {
  // State for date range picker
  const [dateRangeAnchorEl, setDateRangeAnchorEl] = useState(null);
  const [activeDateRange, setActiveDateRange] = useState(null);
  const [tempDateRange, setTempDateRange] = useState({});
  const handleStatusChange = (event) => {
    onFilterChange('status', event.target.value);
  };

  const handleRoleChange = (event) => {
    onFilterChange('role', event.target.value);
  };

  const handleDateRangeChange = (event) => {
    onFilterChange('dateRange', event.target.value);
  };

  const handleSearchChange = (event) => {
    onFilterChange('search', event.target.value);
  };

  const handleVerifiedChange = (event) => {
    onFilterChange('verified', event.target.value);
  };

  // Format date for display
  const formatDateRange = (start, end) => {
    if (!start && !end) return '';
    const startStr = start ? format(new Date(start), 'MMM d, yyyy') : '...';
    const endStr = end ? format(new Date(end), 'MMM d, yyyy') : '...';
    return `${startStr} - ${endStr}`;
  };

  // Handle date range selection
  const handleDateRangeApply = (type) => {
    const { start, end } = tempDateRange[type];
    if (start || end) {
      onFilterChange(`${type}DateRange`, { start, end });
    } else {
      onFilterChange(`${type}DateRange`, null);
    }
    setDateRangeAnchorEl(null);
  };

  // Open date range picker
  const handleOpenDateRangePicker = (event, type) => {
    setActiveDateRange(type);
    setDateRangeAnchorEl(event.currentTarget);
    
    // Initialize temp date range with current filter values
    setTempDateRange(prev => ({
      ...prev,
      [type]: filters[`${type}DateRange`] || { start: null, end: null }
    }));
  };

  // Close date range picker
  const handleCloseDateRangePicker = () => {
    setDateRangeAnchorEl(null);
  };

  // Reset date range
  const handleResetDateRange = (type) => {
    onFilterChange(`${type}DateRange`, null);
  };

  // Get active filter count for the badge
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).reduce((count, [key, value]) => {
      if (key === 'showAdvanced') return count;
      if (key.endsWith('DateRange')) {
        return value ? count + 1 : count;
      }
      return value && value !== 'all' ? count + 1 : count;
    }, 0);
  }, [filters]);

  return (
    <Paper sx={{ p: 2, mb: 3 }} elevation={0} variant="outlined">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="medium">
          Filters
        </Typography>
        <Box>
          <Tooltip title="Reset Filters">
            <IconButton
              size="small"
              onClick={onReset}
              disabled={activeFilterCount === 0}
              color="error"
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            startIcon={<FilterListIcon />}
            onClick={onToggleAdvanced}
            color={showAdvanced ? 'primary' : 'inherit'}
            variant={showAdvanced ? 'contained' : 'text'}
            sx={{ ml: 1 }}
          >
            {showAdvanced ? 'Hide Advanced' : 'Advanced'}
            {activeFilterCount > 0 && (
              <Chip
                label={activeFilterCount}
                size="small"
                color="primary"
                sx={{ ml: 1, color: 'white' }}
              />
            )}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Search Field */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            label="Search users..."
            variant="outlined"
            value={filters.search || ''}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
        </Grid>

        {/* Status Filter */}
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || 'all'}
              onChange={handleStatusChange}
              label="Status"
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box display="flex" alignItems="center">
                    {option.icon && <Box mr={1}>{option.icon}</Box>}
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Role Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select
              value={filters.role || 'all'}
              onChange={handleRoleChange}
              label="Role"
            >
              <MenuItem value="all">All Roles</MenuItem>
              {availableRoles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Date Range Filter */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Date Range</InputLabel>
            <Select
              value={filters.dateRange || 'all'}
              onChange={handleDateRangeChange}
              label="Date Range"
              startAdornment={<DateRangeIcon color="action" sx={{ mr: 1 }} />}
            >
              {dateRangeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Advanced Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Verification Status</InputLabel>
                <Select
                  value={filters.verified || 'all'}
                  onChange={handleVerifiedChange}
                  label="Verification Status"
                >
                  <MenuItem value="all">All Users</MenuItem>
                  <MenuItem value="verified">Verified Only</MenuItem>
                  <MenuItem value="unverified">Unverified Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* Add more advanced filters here */}
          </Grid>
        </Box>
      )}

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <Box mt={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {Object.entries(filters).map(([key, value]) => {
              if (!value || value === 'all' || key === 'showAdvanced') return null;
              
              let label = value;
              let onDelete = () => onFilterChange(key, 'all');
              
              // Format label for display
              if (key === 'status') {
                const status = statusOptions.find(opt => opt.value === value);
                label = status ? status.label : value;
              } else if (key === 'role') {
                const role = availableRoles.find(r => r.id === value);
                label = role ? `Role: ${role.name}` : `Role: ${value}`;
              } else if (key === 'dateRange') {
                const range = dateRangeOptions.find(opt => opt.value === value);
                label = range ? `Date: ${range.label}` : value;
              } else if (key === 'verified') {
                label = value === 'verified' ? 'Verified' : 'Unverified';
              } else if (key === 'search') {
                label = `Search: "${value}"`;
              }
              
              return (
                <Chip
                  key={`${key}-${value}`}
                  label={label}
                  onDelete={onDelete}
                  size="small"
                  variant="outlined"
                />
              );
            })}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

export default UserFilters;
