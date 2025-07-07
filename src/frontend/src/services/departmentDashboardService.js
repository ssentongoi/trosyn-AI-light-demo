import api from './api';

/**
 * Fetches team members for the current department
 * @param {string} departmentId - The ID of the department
 * @param {Object} options - Additional options for the request
 * @param {string} [options.search] - Search query to filter members
 * @param {string} [options.role] - Filter members by role
 * @param {number} [options.page=1] - Page number for pagination
 * @param {number} [options.limit=10] - Number of items per page
 * @returns {Promise<Object>} - Object containing team members and pagination info
 */
export const getTeamMembers = async (departmentId, { search, role, page = 1, limit = 10 } = {}) => {
  try {
    const response = await api.get(`/departments/${departmentId}/members`, {
      params: {
        search,
        role,
        page,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
};

/**
 * Fetches recent document activities for the department
 * @param {string} departmentId - The ID of the department
 * @param {Object} options - Additional options for the request
 * @param {string} [options.type] - Filter by activity type (upload, analysis, share, etc.)
 * @param {string} [options.documentId] - Filter by specific document
 * @param {string} [options.userId] - Filter by specific user
 * @param {number} [options.limit=10] - Maximum number of activities to return
 * @param {string} [options.startDate] - Start date for filtering activities (ISO string)
 * @param {string} [options.endDate] - End date for filtering activities (ISO string)
 * @returns {Promise<Array>} - Array of document activities
 */
export const getDocumentActivities = async (departmentId, { 
  type, 
  documentId, 
  userId, 
  limit = 10,
  startDate,
  endDate
} = {}) => {
  try {
    const response = await api.get(`/departments/${departmentId}/activities`, {
      params: {
        type,
        documentId,
        userId,
        limit,
        startDate,
        endDate,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching document activities:', error);
    throw error;
  }
};

/**
 * Fetches department statistics
 * @param {string} departmentId - The ID of the department
 * @returns {Promise<Object>} - Object containing various department statistics
 */
export const getDepartmentStats = async (departmentId) => {
  try {
    const response = await api.get(`/departments/${departmentId}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error fetching department stats:', error);
    throw error;
  }
};

/**
 * Fetches recent documents for the department
 * @param {string} departmentId - The ID of the department
 * @param {Object} options - Additional options for the request
 * @param {number} [options.limit=5] - Maximum number of documents to return
 * @param {string} [options.sortBy='updatedAt'] - Field to sort by
 * @param {string} [options.sortOrder='desc'] - Sort order ('asc' or 'desc')
 * @returns {Promise<Array>} - Array of recent documents
 */
export const getRecentDocuments = async (departmentId, { 
  limit = 5, 
  sortBy = 'updatedAt', 
  sortOrder = 'desc' 
} = {}) => {
  try {
    const response = await api.get(`/departments/${departmentId}/documents/recent`, {
      params: {
        limit,
        sortBy,
        sortOrder,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching recent documents:', error);
    throw error;
  }
};
