import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays } from 'date-fns';

// Mock data - replace with actual API calls
const generateMockData = (days = 30) => {
  const data = [];
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = subDays(now, i);
    data.push({
      date: format(date, 'MMM dd'),
      activeUsers: Math.floor(Math.random() * 100) + 50,
      newUsers: Math.floor(Math.random() * 20) + 5,
      apiCalls: Math.floor(Math.random() * 1000) + 500,
      memoryUsage: Math.floor(Math.random() * 80) + 20,
    });
  }
  
  return data;
};

const userActivityData = [
  { name: 'Active Users', value: 75 },
  { name: 'Inactive Users', value: 25 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7days');
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setChartData(generateMockData(timeRange === '7days' ? 7 : 30));
      } catch (err) {
        setError('Failed to load analytics data');
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Calculate summary metrics
  const totalUsers = chartData.reduce((sum, day) => sum + day.activeUsers, 0);
  const avgDailyUsers = Math.round(totalUsers / chartData.length);
  const totalApiCalls = chartData.reduce((sum, day) => sum + day.apiCalls, 0);
  const avgApiCalls = Math.round(totalApiCalls / chartData.length);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Analytics Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              maxDate={endDate || new Date()}
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              minDate={startDate}
              maxDate={new Date()}
              slotProps={{ textField: { size: 'small' } }}
            />
          </LocalizationProvider>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            size="small"
          >
            <ToggleButton value="7days">7 Days</ToggleButton>
            <ToggleButton value="30days">30 Days</ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Active Users
              </Typography>
              <Typography variant="h4">{totalUsers}</Typography>
              <Typography variant="caption" color="textSecondary">
                {avgDailyUsers} avg. daily users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                API Requests
              </Typography>
              <Typography variant="h4">{totalApiCalls.toLocaleString()}</Typography>
              <Typography variant="caption" color="textSecondary">
                {avgApiCalls.toLocaleString()} avg. daily
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Memory Usage
              </Typography>
              <Typography variant="h4">
                {Math.round(
                  chartData.reduce((sum, day) => sum + day.memoryUsage, 0) / chartData.length
                )}
                %
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Average utilization
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                New Users (7d)
              </Typography>
              <Typography variant="h4">
                {chartData
                  .slice(-7)
                  .reduce((sum, day) => sum + day.newUsers, 0)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {Math.round(
                  chartData.slice(-7).reduce((sum, day) => sum + day.newUsers, 0) / 7
                )}{' '}
                avg. daily
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              User Activity
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box height={400}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="activeUsers"
                    name="Active Users"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="apiCalls"
                    name="API Calls"
                    stroke="#82ca9d"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              User Distribution
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box height={400}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userActivityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userActivityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
