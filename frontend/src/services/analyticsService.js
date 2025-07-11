import { subDays, format } from 'date-fns';

// --- MOCK DATA GENERATION ---

const generateTimeSeriesData = (days = 30) => {
  const data = [];
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = subDays(now, i);
    data.push({
      date: format(date, 'MMM dd'),
      activeUsers: Math.floor(Math.random() * 200) + 100,
      newSignups: Math.floor(Math.random() * 30) + 5,
      apiCalls: Math.floor(Math.random() * 5000) + 1000,
      errorRate: Math.random() * 5,
    });
  }
  return data;
};

const getMockKeyMetrics = () => ({
  totalUsers: { value: 1245, trend: 0.05 },
  activeSessions: { value: 342, trend: 0.12 },
  apiSuccessRate: { value: 99.8, trend: -0.001 },
  systemUptime: { value: 99.99, trend: 0 },
});

const getMockUserDistribution = () => ([
  { name: 'Administrator', value: 50 },
  { name: 'Manager', value: 150 },
  { name: 'Editor', value: 450 },
  { name: 'Viewer', value: 600 },
]);

const getMockApiUsage = () => ([
  { endpoint: '/users', calls: 1200 },
  { endpoint: '/documents', calls: 3400 },
  { endpoint: '/sync', calls: 8500 },
  { endpoint: '/login', calls: 950 },
  { endpoint: '/analytics', calls: 450 },
]);

// --- MOCK SERVICE ---

const analyticsService = {
  fetchAnalyticsData: async (timeRange = '30d') => {
    const days = parseInt(timeRange.replace('d', ''), 10);
    // Simulate API delay
    await new Promise(res => setTimeout(res, 800));

    return {
      keyMetrics: getMockKeyMetrics(),
      timeSeries: generateTimeSeriesData(days),
      userDistribution: getMockUserDistribution(),
      apiUsage: getMockApiUsage(),
    };
  },
};

export default analyticsService;
