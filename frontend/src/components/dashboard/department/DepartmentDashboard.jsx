import React, { useMemo, useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Grid, 
  Typography, 
  useTheme, 
  Button, 
  CircularProgress, 
  Alert, 
  Snackbar,
  useMediaQuery
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { tokens } from 'src/theme/theme';
import DashboardCard from '../DashboardCard';
import MetricCard from '../MetricCard';
import ResponsiveChart from '../ResponsiveChart';
import TeamMembers from './TeamMembers';
import DocumentActivity from './DocumentActivity';
import { Refresh, Error as ErrorIcon } from '@mui/icons-material';
import { useDepartmentDashboard } from '../../../hooks/useDepartmentDashboard';

const DepartmentDashboard = ({ departmentId = 'current' }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const { 
    loading, 
    error, 
    data, 
    refreshData,
    fetchTeamMembers,
    fetchDocumentActivities
  } = useDepartmentDashboard(departmentId);

  // Handle refresh with loading state and feedback
  const handleRefresh = useCallback(async () => {
    const result = await refreshData();
    if (result?.success) {
      setSnackbar({
        open: true,
        message: 'Dashboard data refreshed successfully',
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: result?.error?.message || 'Failed to refresh data',
        severity: 'error'
      });
    }
  }, [refreshData]);

  // Handle team members pagination
  const handleTeamMembersPageChange = useCallback((params) => {
    fetchTeamMembers({
      page: params.page + 1,
      pageSize: params.pageSize
    });
  }, [fetchTeamMembers]);

  // Handle document activities pagination
  const handleActivitiesPageChange = useCallback((params) => {
    fetchDocumentActivities({
      page: params.page + 1,
      pageSize: params.pageSize
    });
  }, [fetchDocumentActivities]);

  // Close snackbar
  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // Format metrics for display
  const metrics = useMemo(() => {
    if (!data.metrics) return [];
    
    return [
      { 
        title: 'Active Users', 
        value: data.metrics.activeUsers?.toLocaleString() || '0', 
        change: data.metrics.activeUsersChange != null 
          ? (data.metrics.activeUsersChange >= 0 
              ? `+${data.metrics.activeUsersChange}%` 
              : `${data.metrics.activeUsersChange}%`)
          : 'N/A',
        trend: data.metrics.activeUsersChange >= 0 ? 'up' : 'down',
        loading: loading.metrics
      },
      { 
        title: 'AI Requests', 
        value: data.metrics.aiRequests?.toLocaleString() || '0',
        change: data.metrics.aiRequestsChange != null
          ? (data.metrics.aiRequestsChange >= 0 
              ? `+${data.metrics.aiRequestsChange}%` 
              : `${data.metrics.aiRequestsChange}%`)
          : 'N/A',
        trend: data.metrics.aiRequestsChange >= 0 ? 'up' : 'down',
        loading: loading.metrics
      },
      { 
        title: 'Documents Processed', 
        value: data.metrics.documentsProcessed?.toLocaleString() || '0',
        change: data.metrics.documentsProcessedChange != null
          ? (data.metrics.documentsProcessedChange >= 0 
              ? `+${data.metrics.documentsProcessedChange}%` 
              : `${data.metrics.documentsProcessedChange}%`)
          : 'N/A',
        trend: data.metrics.documentsProcessedChange >= 0 ? 'up' : 'down',
        loading: loading.metrics
      },
      { 
        title: 'Collaboration Score', 
        value: data.metrics.collaborationScore ? 
          `${Math.round(data.metrics.collaborationScore * 100)}%` : 'N/A',
        change: data.metrics.collaborationScoreChange >= 0 
          ? `+${data.metrics.collaborationScoreChange}%` 
          : `${data.metrics.collaborationScoreChange}%`,
        trend: data.metrics.collaborationScoreChange >= 0 ? 'up' : 'down'
      },
    ];
  }, [data.metrics]);

  // Table columns for recent activities
  const columns = [
    { field: 'id', headerName: 'ID', flex: 1 },
    { 
      field: 'user', 
      headerName: 'User', 
      flex: 2,
      valueGetter: (params) => params.row.user?.name || 'Unknown User'
    },
    { 
      field: 'action', 
      headerName: 'Action', 
      flex: 3,
      valueGetter: (params) => {
        const { action, document } = params.row;
        if (!document) return action;
        return `${action}: ${document.name || document.id}`;
      }
    },
    { 
      field: 'timestamp', 
      headerName: 'Time', 
      flex: 1,
      valueFormatter: (params) => {
        if (!params.value) return 'Just now';
        return new Date(params.value).toLocaleTimeString();
      }
    },
  ];

  return (
    <Box m="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h2" color={colors.grey[100]} fontWeight="bold">
          Department Dashboard
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={loading.metrics ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
          onClick={handleRefresh}
          disabled={loading.metrics}
          sx={{
            backgroundColor: colors.blueAccent[600],
            '&:hover': {
              backgroundColor: colors.blueAccent[700],
            },
            '&.Mui-disabled': {
              backgroundColor: colors.blueAccent[800],
              color: colors.grey[500],
            },
          }}
        >
          {loading.metrics ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </Box>

      {/* Error Alert */}
      {(error.metrics || error.teamMembers || error.activities || error.activityData) && (
        <Box mb={3}>
          <Alert severity="error">
            Some data couldn't be loaded. Please try refreshing the page.
          </Alert>
        </Box>
      )}

      {/* Metrics Grid */}
      <Grid container spacing={3} mb={3}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <MetricCard 
              title={metric.title}
              value={metric.value}
              change={metric.change}
              trend={metric.trend}
              loading={metric.loading}
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Activity Chart */}
        <Grid item xs={12} md={8}>
          <DashboardCard 
            title="Weekly Activity"
            loading={loading.activityData}
          >
            <Box height="300px">
              {Object.values(loading).some(Boolean) && !Object.values(data).some(Boolean) ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                  <CircularProgress />
                </Box>
              ) : (
                Object.values(error).some(Boolean) ? (
                  <Box p={3}>
                    <Alert 
                      severity="error" 
                      icon={<ErrorIcon />}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Failed to load dashboard data
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, m: 0 }}>
                        {Object.entries(error)
                          .filter(([_, value]) => Boolean(value))
                          .map(([key, value], index) => (
                            <li key={index}>
                              <Typography variant="body2">{`${key}: ${value}`}</Typography>
                            </li>
                          ))}
                      </Box>
                    </Alert>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={<Refresh />}
                      onClick={handleRefresh}
                      sx={{ mt: 2 }}
                    >
                      Retry Loading Data
                    </Button>
                  </Box>
                ) : (
                  error.activityData ? (
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center" 
                      height="100%"
                      color={colors.grey[300]}
                    >
                      Failed to load activity data
                    </Box>
                  ) : loading.activityData ? (
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center" 
                      height="100%"
                    >
                      <CircularProgress />
                    </Box>
                  ) : (
                    <ResponsiveChart 
                      data={data.activityData} 
                      xDataKey="name"
                      yDataKey="value"
                    />
                  )
                )
              )}
            </Box>
          </DashboardCard>
        </Grid>

        {/* Team Members */}
        <Grid item xs={12} md={4}>
          <TeamMembers 
            members={data.teamMembers || []} 
            loading={loading.teamMembers}
            error={error.teamMembers}
            pagination={data.teamMembersPagination}
            onPageChange={handleTeamMembersPageChange}
          />
        </Grid>

        {/* Document Activity */}
        <Grid item xs={12} md={8}>
          <DocumentActivity 
            activities={data.activities || []} 
            loading={loading.activities}
            error={error.activities}
            pagination={data.activitiesPagination}
            onPageChange={handleActivitiesPageChange}
          />
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <DashboardCard 
            title="Recent Activity"
            loading={loading.activities}
          >
            <Box
              m="0 0 0 0"
              height="400px"
              sx={{
                '& .MuiDataGrid-root': {
                  border: 'none',
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: 'none',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: colors.blueAccent[700],
                  borderBottom: 'none',
                },
                '& .MuiDataGrid-virtualScroller': {
                  backgroundColor: colors.primary[400],
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: 'none',
                  backgroundColor: colors.blueAccent[700],
                },
              }}
            >
              {error.activities ? (
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center" 
                  height="100%"
                  color={colors.grey[300]}
                >
                  Failed to load recent activities
                </Box>
              ) : loading.activities ? (
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center" 
                  height="100%"
                >
                  <CircularProgress />
                </Box>
              ) : (
                <DataGrid
                  rows={data.activities}
                  columns={columns}
                  pageSize={5}
                  rowsPerPageOptions={[5]}
                  disableSelectionOnClick
                  disableColumnMenu
                  loading={loading.activities}
                />
              )}
            </Box>
          </DashboardCard>
        </Grid>
      </Grid>
    </Box>
  );
};

DepartmentDashboard.propTypes = {
  departmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

DepartmentDashboard.defaultProps = {
  departmentId: 'current',
};

export default DepartmentDashboard;
