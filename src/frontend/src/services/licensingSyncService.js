import axios from 'axios';
import { getAuthHeader } from './authService';

const API_BASE_URL = '/api/v1';

// Helper function to handle API errors
const handleApiError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('API Error Response:', error.response.data);
    throw new Error(error.response.data.message || 'An error occurred');
  } else if (error.request) {
    // The request was made but no response was received
    console.error('API Request Error:', error.request);
    throw new Error('No response from server. Please check your connection.');
  } else {
    // Something happened in setting up the request
    console.error('API Setup Error:', error.message);
    throw error;
  }
};

// License API
const licenseApi = {
  getLicense: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/license`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateLicense: async (licenseKey) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/license`,
        { key: licenseKey },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Sync API
const syncApi = {
  getSyncStatus: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sync/status`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getSyncHistory: async (limit = 50) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sync/history`, {
        params: { limit },
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  triggerSync: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/sync/now`,
        {},
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateSyncSettings: async (settings) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/sync/settings`,
        settings,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Token API
const tokenApi = {
  getTokens: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tokens`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  createToken: async (tokenData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/tokens`,
        tokenData,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  revokeToken: async (tokenId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/tokens/${tokenId}`,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateToken: async (tokenId, updates) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/tokens/${tokenId}`,
        updates,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Analytics API
const analyticsApi = {
  getSyncAnalytics: async (timeRange = '7d') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/sync`, {
        params: { range: timeRange },
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getUsageMetrics: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/usage`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

export { licenseApi, syncApi, tokenApi, analyticsApi };

// Helper function to simulate API delay in development
const simulateApiDelay = (ms = 300) => {
  if (process.env.NODE_ENV === 'development') {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  return Promise.resolve();
};

// Export mock data for development
const mockData = {
  license: {
    key: 'ACME-2023-123456',
    type: 'Enterprise',
    status: 'active',
    issuedDate: '2023-01-15',
    expiryDate: '2024-12-31',
    maxUsers: 50,
    maxStorageGB: 100,
    features: [
      'Unlimited Documents',
      'Advanced Analytics',
      'Priority Support',
      'Custom Branding'
    ]
  },
  syncStatus: {
    lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    nextSync: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    isSyncing: false,
    isOffline: !navigator.onLine,
    settings: {
      syncFrequency: '6',
      autoSync: true,
      notifyOnFailure: true
    }
  },
  syncHistory: [
    { 
      id: 1, 
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), 
      status: 'success', 
      itemsSynced: 42, 
      dataTransferred: '1.2 MB', 
      duration: '12s' 
    },
    { 
      id: 2, 
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), 
      status: 'success', 
      itemsSynced: 38, 
      dataTransferred: '980 KB', 
      duration: '9s' 
    },
    { 
      id: 3, 
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), 
      status: 'failed', 
      itemsSynced: 0, 
      dataTransferred: '0 B', 
      duration: '2s', 
      error: 'Connection timeout' 
    }
  ],
  tokens: [
    { 
      id: 'token-1', 
      name: 'API Access Token', 
      created: '2023-05-15T10:30:00Z', 
      lastUsed: '2023-06-20T14:45:00Z', 
      scopes: ['read', 'write'] 
    },
    { 
      id: 'token-2', 
      name: 'Mobile App Token', 
      created: '2023-06-01T09:15:00Z', 
      lastUsed: '2023-06-20T08:20:00Z', 
      scopes: ['read'] 
    }
  ],
  analytics: {
    syncsLast7Days: 12,
    dataTransferred: '24.5 MB',
    successRate: 98.5,
    avgSyncDuration: '8.2s',
    syncsByDay: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [3, 5, 2, 4, 6, 1, 2]
    },
    dataByType: {
      documents: 45,
      images: 30,
      other: 25
    }
  }
};

export { mockData };
