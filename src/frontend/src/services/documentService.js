import api from './api';

/**
 * Document service for handling document-related API calls
 */
const documentService = {
  /**
   * Get all documents with optional filtering and pagination
   * @param {Object} params - Query parameters (page, limit, search, etc.)
   * @returns {Promise<Array>} List of documents
   */
  async getDocuments(params = {}) {
    try {
      const response = await api.get('/api/v1/documents', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  },

  /**
   * Get a single document by ID
   * @param {string|number} id - Document ID
   * @returns {Promise<Object>} Document details
   */
  async getDocumentById(id) {
    try {
      const response = await api.get(`/api/v1/documents/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching document ${id}:`, error);
      throw error;
    }
  },

  /**
   * Upload a new document
   * @param {File} file - The file to upload
   * @param {Object} metadata - Additional document metadata
   * @param {Function} onUploadProgress - Progress callback
   * @returns {Promise<Object>} Uploaded document details
   */
  async uploadDocument(file, metadata = {}, onUploadProgress = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata fields
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (onUploadProgress) {
        config.onUploadProgress = onUploadProgress;
      }

      const response = await api.post('/api/v1/documents/upload', formData, config);
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  /**
   * Update document metadata
   * @param {string|number} id - Document ID
   * @param {Object} updates - Document updates
   * @returns {Promise<Object>} Updated document
   */
  async updateDocument(id, updates) {
    try {
      const response = await api.put(`/api/v1/documents/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error(`Error updating document ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a document
   * @param {string|number} id - Document ID
   * @returns {Promise<Object>} Deletion status
   */
  async deleteDocument(id) {
    try {
      const response = await api.delete(`/api/v1/documents/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting document ${id}:`, error);
      throw error;
    }
  },

  /**
   * Download a document
   * @param {string|number} id - Document ID
   * @param {string} disposition - Content disposition (inline or attachment)
   * @returns {Promise<Blob>} File blob
   */
  async downloadDocument(id, disposition = 'attachment') {
    try {
      const response = await api.get(`/api/v1/documents/${id}/download`, {
        responseType: 'blob',
        params: { disposition },
      });
      return response.data;
    } catch (error) {
      console.error(`Error downloading document ${id}:`, error);
      throw error;
    }
  },

  /**
   * Share a document with other users
   * @param {string|number} id - Document ID
   * @param {Array} userIds - Array of user IDs to share with
   * @param {string} permission - Permission level (view, edit, etc.)
   * @returns {Promise<Object>} Sharing status
   */
  async shareDocument(id, userIds, permission = 'view') {
    try {
      const response = await api.post(`/api/v1/documents/${id}/share`, {
        userIds,
        permission,
      });
      return response.data;
    } catch (error) {
      console.error(`Error sharing document ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get document versions
   * @param {string|number} id - Document ID
   * @returns {Promise<Array>} List of document versions
   */
  async getDocumentVersions(id) {
    try {
      const response = await api.get(`/api/v1/documents/${id}/versions`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching versions for document ${id}:`, error);
      throw error;
    }
  },

  /**
   * Restore a previous version of a document
   * @param {string|number} id - Document ID
   * @param {string|number} versionId - Version ID to restore
   * @returns {Promise<Object>} Restored document
   */
  async restoreDocumentVersion(id, versionId) {
    try {
      const response = await api.post(`/api/v1/documents/${id}/restore-version`, { versionId });
      return response.data;
    } catch (error) {
      console.error(`Error restoring version ${versionId} for document ${id}:`, error);
      throw error;
    }
  },
};

export default documentService;
