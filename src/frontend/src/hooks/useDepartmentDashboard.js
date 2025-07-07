import { useState, useEffect, useCallback, useMemo } from 'react';
import { departmentService } from '../services/departmentService';
import { 
  getTeamMembers, 
  getDocumentActivities, 
  getDepartmentStats,
  getRecentDocuments
} from '../services/departmentDashboardService';

/**
 * Custom hook for managing Department Dashboard state and data fetching
 * @param {string} departmentId - The ID of the department
 * @returns {Object} Dashboard state and methods
 */
export const useDepartmentDashboard = (departmentId) => {
  const [loading, setLoading] = useState({
    metrics: true,
    teamMembers: true,
    activities: true,
    activityData: true,
  });
  
  const [error, setError] = useState({
    metrics: null,
    teamMembers: null,
    activities: null,
    activityData: null,
  });
  
  const [data, setData] = useState({
    metrics: null,
    teamMembers: [],
    activities: [],
    activityData: [],
    recentActivities: [],
  });

  // Fetch dashboard metrics and stats
  const fetchMetrics = useCallback(async () => {
    if (!departmentId) return;
    
    setLoading(prev => ({ ...prev, metrics: true }));
    setError(prev => ({ ...prev, metrics: null }));
    
    try {
      // Get both dashboard metrics and department stats in parallel
      const [metrics, stats] = await Promise.all([
        departmentService.getDashboardMetrics(departmentId),
        getDepartmentStats(departmentId)
      ]);
      
      setData(prev => ({
        ...prev,
        metrics: {
          ...metrics,
          // Merge any additional stats from the new service
          ...stats
        }
      }));
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(prev => ({ ...prev, metrics: err.message || 'Failed to load dashboard metrics' }));
    } finally {
      setLoading(prev => ({ ...prev, metrics: false }));
    }
  }, [departmentId]);

  // Fetch team members with search and pagination support
  const fetchTeamMembers = useCallback(async (options = {}) => {
    if (!departmentId) return;
    
    setLoading(prev => ({ ...prev, teamMembers: true }));
    setError(prev => ({ ...prev, teamMembers: null }));
    
    try {
      const { members, pagination } = await getTeamMembers(departmentId, {
        search: options.search,
        role: options.role,
        page: options.page || 1,
        limit: options.pageSize || 10
      });
      
      setData(prev => ({
        ...prev,
        teamMembers: members,
        teamMembersPagination: pagination
      }));
    } catch (err) {
      console.error('Failed to fetch team members:', err);
      setError(prev => ({ ...prev, teamMembers: err.message || 'Failed to load team members' }));
    } finally {
      setLoading(prev => ({ ...prev, teamMembers: false }));
    }
  }, [departmentId]);

  // Fetch document activities
  const fetchDocumentActivities = useCallback(async (options = {}) => {
    if (!departmentId) return;
    
    setLoading(prev => ({ ...prev, activities: true }));
    setError(prev => ({ ...prev, activities: null }));
    
    try {
      const activities = await getDocumentActivities(departmentId, {
        type: options.type,
        documentId: options.documentId,
        userId: options.userId,
        limit: options.limit || 10,
        startDate: options.startDate,
        endDate: options.endDate
      });
      
      setData(prev => ({
        ...prev,
        activities,
        activitiesPagination: {
          page: 1,
          pageSize: options.limit || 10,
          total: activities.length
        }
      }));
    } catch (err) {
      console.error('Failed to fetch document activities:', err);
      setError(prev => ({ ...prev, activities: err.message || 'Failed to load document activities' }));
    } finally {
      setLoading(prev => ({ ...prev, activities: false }));
    }
  }, [departmentId]);

  // Fetch activity data for charts
  const fetchActivityData = useCallback(async () => {
    if (!departmentId) return;
    
    setLoading(prev => ({ ...prev, activityData: true }));
    setError(prev => ({ ...prev, activityData: null }));
    
    try {
      const activityData = await departmentService.getActivityData(departmentId, 'week');
      setData(prev => ({
        ...prev,
        activityData: activityData.map(item => ({
          name: item.date,
          value: item.count,
        })),
      }));
    } catch (err) {
      console.error('Failed to fetch activity data:', err);
      setError(prev => ({ ...prev, activityData: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, activityData: false }));
    }
  }, [departmentId]);

  // Fetch recent activities
  const fetchRecentActivities = useCallback(async () => {
    if (!departmentId) return;
    
    try {
      const recentActivities = await departmentService.getRecentActivities(departmentId, 5);
      setData(prev => ({ ...prev, recentActivities }));
    } catch (err) {
      console.error('Failed to fetch recent activities:', err);
    }
  }, [departmentId]);

  // Fetch all data when component mounts or departmentId changes
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await Promise.all([
          fetchMetrics(),
          fetchTeamMembers(),
          fetchDocumentActivities(),
          fetchActivityData(),
          fetchRecentActivities()
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    
    fetchAllData();
  }, [fetchMetrics, fetchTeamMembers, fetchDocumentActivities, fetchActivityData, fetchRecentActivities]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        fetchMetrics(),
        fetchTeamMembers(),
        fetchDocumentActivities(),
        fetchActivityData(),
        fetchRecentActivities()
      ]);
      return { success: true };
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      return { success: false, error };
    }
  }, [fetchMetrics, fetchTeamMembers, fetchDocumentActivities, fetchActivityData, fetchRecentActivities]);
  
  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    loading,
    error,
    data,
    refreshData,
    fetchTeamMembers,
    fetchDocumentActivities
  }), [loading, error, data, refreshData, fetchTeamMembers, fetchDocumentActivities]);
};
