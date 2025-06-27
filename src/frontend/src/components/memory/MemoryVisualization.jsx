import React from 'react';
import { useMemory } from '../../contexts/MemoryContext';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
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
  const { context, isLoading } = useMemory();
  const theme = useTheme();

  if (isLoading && !context) {
    return <LinearProgress />;
  }

  // Prepare data for visualization
  const getInteractionStats = () => {
    if (!context?.interactions?.length) {
      return [];
    }

    // Group by interaction type or source
    const stats = context.interactions.reduce((acc, interaction) => {
      const source = interaction.metadata?.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(stats).map(([name, count]) => ({
      name,
      count,
      percentage: (count / context.interactions.length) * 100
    }));
  };

  const getContextStats = () => {
    if (!context) return [];
    
    return Object.entries(context.context || {}).map(([key, value]) => ({
      name: key,
      value: typeof value === 'object' ? JSON.stringify(value).length : String(value).length,
      type: typeof value
    }));
  };

  const interactionStats = getInteractionStats();
  const contextStats = getContextStats();

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Memory Insights
      </Typography>
      
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
              {context?.interactions?.length > 0 ? (
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
                      {context.interactions
                        .slice(-5)
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

export default MemoryVisualization;
