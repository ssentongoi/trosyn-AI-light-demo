import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const mockStats = {
  totalDocuments: 1245,
  pendingReviews: 18,
  completedTasks: 87,
  storageUsed: 24.5,
};

const mockActivity = [
  {
    id: 1,
    type: 'document',
    action: 'uploaded',
    title: 'Q2 Financial Report',
    user: 'John Doe',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 2,
    type: 'task',
    action: 'completed',
    title: 'Review marketing materials',
    user: 'Jane Smith',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 3,
    type: 'sync',
    action: 'completed',
    title: 'Cloud sync',
    details: '42 items synced',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 4,
    type: 'user',
    action: 'added',
    title: 'New team member',
    user: 'Alex Johnson',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

const useDashboard = () => {
  const [stats, setStats] = useState(mockStats);
  const [recentActivity, setRecentActivity] = useState(mockActivity);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // In a real app, these would be API calls
      // const [statsRes, activityRes] = await Promise.all([
      //   axios.get('/api/dashboard/stats'),
      //   axios.get('/api/activity'),
      // ]);
      // setStats(statsRes.data);
      // setRecentActivity(activityRes.data);

      // Using mock data for now
      setStats(mockStats);
      setRecentActivity(mockActivity);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getActivityIcon = (type) => {
    const icons = {
      document: 'file-alt',
      task: 'tasks',
      sync: 'sync',
      user: 'user-plus',
    };
    return icons[type] || 'info-circle';
  };

  return { stats, recentActivity, loading, error, getGreeting, getActivityIcon, refetch: fetchDashboardData };
};

export default useDashboard;
