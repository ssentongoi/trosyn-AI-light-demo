import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Icon,
} from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  People as PeopleIcon,
  Timeline as TimelineIcon,
  Api as ApiIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import analyticsService from '../../services/analyticsService';

// --- Reusable Components ---

const StatCard = ({ title, value, trend, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
        </Box>
        <Icon component={icon} sx={{ fontSize: 40, color: `${color}.main`, opacity: 0.8 }} />
      </Box>
      {trend !== undefined && (
        <Box display="flex" alignItems="center" mt={1} sx={{ color: trend >= 0 ? 'success.main' : 'error.main' }}>
          {trend >= 0 ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
          <Typography variant="body2" sx={{ ml: 0.5 }}>
            {(trend * 100).toFixed(1)}% vs last month
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

const ChartContainer = ({ title, children }) => (
  <Paper sx={{ p: 2, height: '400px' }}>
    <Typography variant="h6" gutterBottom>{title}</Typography>
    <ResponsiveContainer width="100%" height="90%">
      {children}
    </ResponsiveContainer>
  </Paper>
);

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// --- Main Dashboard Component ---

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await analyticsService.fetchAnalyticsData(timeRange);
        setData(result);
        setError(null);
      } catch (err) {
        setError('Failed to load analytics data. Please try again later.');
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const handleTimeRangeChange = (event, newRange) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!data) return null;

  const { keyMetrics, timeSeries, userDistribution, apiUsage } = data;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Analytics Dashboard
        </Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          aria-label="time range"
        >
          <ToggleButton value="7d" aria-label="7 days">7D</ToggleButton>
          <ToggleButton value="30d" aria-label="30 days">30D</ToggleButton>
          <ToggleButton value="90d" aria-label="90 days">90D</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Users" value={keyMetrics.totalUsers.value} trend={keyMetrics.totalUsers.trend} icon={PeopleIcon} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Sessions" value={keyMetrics.activeSessions.value} trend={keyMetrics.activeSessions.trend} icon={TimelineIcon} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="API Success Rate" value={`${keyMetrics.apiSuccessRate.value}%`} trend={keyMetrics.apiSuccessRate.trend} icon={ApiIcon} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="System Uptime" value={`${keyMetrics.systemUptime.value}%`} trend={keyMetrics.systemUptime.trend} icon={CheckCircleOutlineIcon} color="info" />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <ChartContainer title="User Activity Over Time">
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="activeUsers" name="Active Users" stroke="#8884d8" />
              <Line type="monotone" dataKey="newSignups" name="New Signups" stroke="#82ca9d" />
            </LineChart>
          </ChartContainer>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartContainer title="User Role Distribution">
            <PieChart>
              <Pie data={userDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                {userDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ChartContainer>
        </Grid>
        <Grid item xs={12}>
          <ChartContainer title="API Call Volume">
            <BarChart data={apiUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="endpoint" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="calls" fill="#82ca9d" />
            </BarChart>
          </ChartContainer>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
