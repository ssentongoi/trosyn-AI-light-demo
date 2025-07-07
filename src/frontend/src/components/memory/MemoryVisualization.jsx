import React, { useEffect, useState, useCallback } from 'react';
import { useMemory } from '../../contexts/MemoryContext';
import memoryService from '../../services/memoryService';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
  Alert,
  Snackbar,
  CircularProgress,
  Button
} from '@mui/material';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
  '#82ca9d', '#ffc658', '#ff7f0e', '#8c564b', '#e377c2'
];

const MemoryVisualization = () => {
  const { context, isLoading, error: contextError } = useMemory();
  const theme = useTheme();
  const [interactions, setInteractions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Fetch memory data
  const fetchMemoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch recent interactions
      const interactionsData = await memoryService.getInteractions({
        limit: 100,
        sort: 'timestamp:desc'
      });
      setInteractions(interactionsData?.data || []);
      
      // Fetch recent sessions
      const sessionsData = await memoryService.getSessions({
        limit: 10,
        sort: 'created_at:desc'
      });
      setSessions(sessionsData?.data || []);
      
      // Fetch memory statistics
      const statsData = await memoryService.getStatistics();
      setStats(statsData);
      
    } catch (err) {
      console.error('Error fetching memory data:', err);
      setError('Failed to load memory data. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemoryData();
  }, [fetchMemoryData]);

  if (isLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Prepare data for visualization
  const getInteractionStats = () => {
    if (!interactions?.length) {
      return [];
    }

    // Group by interaction type or source
    const interactionStats = interactions.reduce((acc, interaction) => {
      const source = interaction.metadata?.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(interactionStats).map(([name, count]) => ({
      name,
      count,
      percentage: (count / interactions.length) * 100
    }));
  };

  const getContextStats = () => {
    if (!context) return [];
    
    const contextData = context.context || {};
    return Object.entries(contextData).map(([key, value]) => ({
      name: key,
      value: typeof value === 'object' ? JSON.stringify(value).length : String(value).length,
      type: typeof value
    }));
  };

  const interactionStats = getInteractionStats();
  const contextStats = getContextStats();

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // The useEffect will automatically refetch the data
  };

  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleRetry}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Retry'}
        </Button>
      </Box>
    );
  }

  // Prepare data for visualization
  const getInteractionStats = () => {
    if (!interactions?.length) {
      return [];
    }

    // Group by interaction type or source
    const interactionStats = interactions.reduce((acc, interaction) => {
      const source = interaction.metadata?.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(interactionStats).map(([name, count]) => ({
      name,
      count,
      percentage: (count / interactions.length) * 100
    }));
  };

  const getContextStats = () => {
    if (!context) return [];
    
    const contextData = context.context || {};
    return Object.entries(contextData).map(([key, value]) => ({
      name: key,
      value: typeof value === 'object' ? JSON.stringify(value).length : String(value).length,
      type: typeof value
    }));
  };

  const interactionStats = getInteractionStats();
  const contextStats = getContextStats();

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // The useEffect will automatically refetch the data
  };

  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleRetry}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Retry'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Memory Insights
        </Typography>
        {stats && (
          <Box display="flex" gap={2}>
            <Typography variant="subtitle1">
              Total Interactions: <strong>{stats.total_interactions || 0}</strong>
            </Typography>
            <Typography variant="subtitle1">
              Active Sessions: <strong>{stats.active_sessions || 0}</strong>
            </Typography>
            <Typography variant="subtitle1">
              Context Size: <strong>{(stats.context_size / 1024).toFixed(2)} KB</strong>
            </Typography>
          </Box>
        )}
      </Box>
      
      <Grid container spacing={3}>
        {/* Interaction Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Interaction Distribution" />
            <Divider />
            <CardContent>
              {interactionStats.length > 0 ? (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={interactionStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="name"
                        label={({ name, percent }) => 
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {interactionStats.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          value,
                          `${props.payload.percentage.toFixed(1)}% of total`
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary" align="center">
                  No interaction data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Context Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Context Size Distribution" />
            <Divider />
            <CardContent>
              {contextStats.length > 0 ? (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={contextStats}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`${value} chars`, 'Size']}
                      />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        name="Size (chars)" 
                        fill={theme.palette.primary.main}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary" align="center">
                  No context data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Interactions */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Recent Interactions" />
            <Divider />
            <CardContent>
              {interactions?.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Query</TableCell>
                        <TableCell>Response</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.isArray(interactions) && interactions
                        .slice(0, 5)
                        .map((interaction, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography noWrap sx={{ maxWidth: 300 }}>
                                {interaction.query}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography noWrap sx={{ maxWidth: 300 }}>
                                {interaction.response}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {interaction.metadata?.source || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {new Date(interaction.timestamp).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" align="center">
                  No recent interactions
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

      {/* Error Snackbar */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default React.memo(MemoryVisualization);
