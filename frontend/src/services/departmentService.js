import { api } from './api';

const DEPARTMENT_API_BASE = '/api/departments';

export const departmentService = {
  /**
   * Get dashboard metrics for a department
   * @param {string} departmentId - The ID of the department
   * @returns {Promise<Object>} Dashboard metrics
   */
  getDashboardMetrics: async (departmentId) => {
    try {
      const response = await api.get(`${DEPARTMENT_API_BASE}/${departmentId}/metrics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching department metrics:', error);
      throw error;
    }
  },

  /**
   * Get team members for a department
   * @param {string} departmentId - The ID of the department
   * @returns {Promise<Array>} List of team members
   */
  getTeamMembers: async (departmentId) => {
    try {
      const response = await api.get(`${DEPARTMENT_API_BASE}/${departmentId}/team-members`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  },

  /**
   * Get recent document activities for a department
   * @param {string} departmentId - The ID of the department
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Object>} Document activities and pagination info
   */
  getDocumentActivities: async (departmentId, options = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      
      const response = await api.get(
        `${DEPARTMENT_API_BASE}/${departmentId}/activities?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching document activities:', error);
      throw error;
    }
  },

  /**
   * Get department activity data for charts
   * @param {string} departmentId - The ID of the department
   * @param {string} period - Time period (day, week, month)
   * @returns {Promise<Array>} Activity data points
   */
  getActivityData: async (departmentId, period = 'week') => {
    try {
      const response = await api.get(
        `${DEPARTMENT_API_BASE}/${departmentId}/activity-data?period=${period}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching activity data:', error);
      throw error;
    }
  },

  /**
   * Get recent activity log for the department
   * @param {string} departmentId - The ID of the department
   * @param {number} limit - Maximum number of activities to return
   * @returns {Promise<Array>} List of recent activities
   */
  getRecentActivities: async (departmentId, limit = 10) => {
    try {
      const response = await api.get(
        `${DEPARTMENT_API_BASE}/${departmentId}/recent-activities?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  },
};
