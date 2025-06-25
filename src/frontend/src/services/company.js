import api from './api';

const companyService = {
  // Get all companies (superadmin only)
  async getAllCompanies() {
    const response = await api.get('/companies');
    return response;
  },

  // Get company by ID
  async getCompanyById(companyId) {
    const response = await api.get(`/companies/${companyId}`);
    return response;
  },

  // Create new company (superadmin only)
  async createCompany(companyData) {
    const response = await api.post('/companies', companyData);
    return response;
  },

  // Update company
  async updateCompany(companyId, updates) {
    const response = await api.put(`/companies/${companyId}`, updates);
    return response;
  },

  // Delete company (superadmin only)
  async deleteCompany(companyId) {
    const response = await api.delete(`/companies/${companyId}`);
    return response;
  },

  // Get company statistics
  async getCompanyStats(companyId) {
    const response = await api.get(`/companies/${companyId}/stats`);
    return response;
  },

  // Get company users
  async getCompanyUsers(companyId, params = {}) {
    const response = await api.get(`/companies/${companyId}/users`, { params });
    return response;
  },

  // Add user to company
  async addUserToCompany(companyId, userData) {
    const response = await api.post(`/companies/${companyId}/users`, userData);
    return response;
  },

  // Remove user from company
  async removeUserFromCompany(companyId, userId) {
    const response = await api.delete(`/companies/${companyId}/users/${userId}`);
    return response;
  },

  // Get company departments
  async getCompanyDepartments(companyId) {
    const response = await api.get(`/companies/${companyId}/departments`);
    return response;
  },

  // Get company documents
  async getCompanyDocuments(companyId, params = {}) {
    const response = await api.get(`/companies/${companyId}/documents`, { params });
    return response;
  },

  // Sync company data
  async syncCompanyData(companyId) {
    const response = await api.post(`/companies/${companyId}/sync`);
    return response;
  },

  // Get sync status
  async getSyncStatus(companyId) {
    const response = await api.get(`/companies/${companyId}/sync/status`);
    return response;
  },

  // Get sync history
  async getSyncHistory(companyId, params = {}) {
    const response = await api.get(`/companies/${companyId}/sync/history`, { params });
    return response;
  },

  // Update company settings
  async updateCompanySettings(companyId, settings) {
    const response = await api.put(`/companies/${companyId}/settings`, settings);
    return response;
  },

  // Get company activity
  async getCompanyActivity(companyId, params = {}) {
    const response = await api.get(`/companies/${companyId}/activity`, { params });
    return response;
  },

  // Get company storage usage
  async getStorageUsage(companyId) {
    const response = await api.get(`/companies/${companyId}/storage`);
    return response;
  },

  // Upload company logo
  async uploadCompanyLogo(companyId, file) {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await api.post(`/companies/${companyId}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response;
  },

  // Get company subscription
  async getCompanySubscription(companyId) {
    const response = await api.get(`/companies/${companyId}/subscription`);
    return response;
  },

  // Update company subscription
  async updateCompanySubscription(companyId, subscriptionData) {
    const response = await api.put(`/companies/${companyId}/subscription`, subscriptionData);
    return response;
  },

  // Get company audit logs
  async getAuditLogs(companyId, params = {}) {
    const response = await api.get(`/companies/${companyId}/audit-logs`, { params });
    return response;
  },
};

export default companyService;
