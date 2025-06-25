import api from './api';

const syncService = {
  /**
   * Get sync status
   * @returns {Promise<Object>} Sync status
   */
  async getStatus() {
    const response = await api.get('/sync/status');
    return response;
  },

  /**
   * Start sync process
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async startSync(options = {}) {
    const response = await api.post('/sync/start', options);
    return response;
  },

  /**
   * Stop sync process
   * @returns {Promise<Object>} Stop result
   */
  async stopSync() {
    const response = await api.post('/sync/stop');
    return response;
  },

  /**
   * Get sync history
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Sync history
   */
  async getHistory(params = {}) {
    const response = await api.get('/sync/history', { params });
    return response;
  },

  /**
   * Get sync statistics
   * @returns {Promise<Object>} Sync statistics
   */
  async getStats() {
    const response = await api.get('/sync/stats');
    return response;
  },

  /**
   * Get sync conflicts
   * @returns {Promise<Array>} List of conflicts
   */
  async getConflicts() {
    const response = await api.get('/sync/conflicts');
    return response;
  },

  /**
   * Resolve sync conflict
   * @param {string} conflictId - Conflict ID
   * @param {Object} resolution - Resolution details
   * @returns {Promise<Object>} Resolution result
   */
  async resolveConflict(conflictId, resolution) {
    const response = await api.post(`/sync/conflicts/${conflictId}/resolve`, resolution);
    return response;
  },

  /**
   * Get sync settings
   * @returns {Promise<Object>} Sync settings
   */
  async getSettings() {
    const response = await api.get('/sync/settings');
    return response;
  },

  /**
   * Update sync settings
   * @param {Object} settings - New settings
   * @returns {Promise<Object>} Updated settings
   */
  async updateSettings(settings) {
    const response = await api.put('/sync/settings', settings);
    return response;
  },

  /**
   * Get connected devices
   * @returns {Promise<Array>} List of connected devices
   */
  async getDevices() {
    const response = await api.get('/sync/devices');
    return response;
  },

  /**
   * Remove device
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object>} Removal result
   */
  async removeDevice(deviceId) {
    const response = await api.delete(`/sync/devices/${deviceId}`);
    return response;
  },

  /**
   * Generate sync code
   * @returns {Promise<Object>} Sync code details
   */
  async generateSyncCode() {
    const response = await api.post('/sync/code/generate');
    return response;
  },

  /**
   * Validate sync code
   * @param {string} code - Sync code to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateSyncCode(code) {
    const response = await api.post('/sync/code/validate', { code });
    return response;
  },

  /**
   * Get sync logs
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Sync logs
   */
  async getLogs(params = {}) {
    const response = await api.get('/sync/logs', { params });
    return response;
  },

  /**
   * Clear sync logs
   * @returns {Promise<Object>} Clear result
   */
  async clearLogs() {
    const response = await api.delete('/sync/logs');
    return response;
  },

  /**
   * Get sync performance metrics
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformance() {
    const response = await api.get('/sync/performance');
    return response;
  },

  /**
   * Get sync quotas
   * @returns {Promise<Object>} Quota information
   */
  async getQuotas() {
    const response = await api.get('/sync/quotas');
    return response;
  },

  /**
   * Pause sync
   * @returns {Promise<Object>} Pause result
   */
  async pauseSync() {
    const response = await api.post('/sync/pause');
    return response;
  },

  /**
   * Resume sync
   * @returns {Promise<Object>} Resume result
   */
  async resumeSync() {
    const response = await api.post('/sync/resume');
    return response;
  },

  /**
   * Force sync
   * @returns {Promise<Object>} Force sync result
   */
  async forceSync() {
    const response = await api.post('/sync/force');
    return response;
  },

  /**
   * Get sync health
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    const response = await api.get('/sync/health');
    return response;
  },
};

export default syncService;
