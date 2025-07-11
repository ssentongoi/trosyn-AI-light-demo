import api from './api';

const documentService = {
  // Get all documents with optional filtering
  async getDocuments(params = {}) {
    const response = await api.get('/documents', { params });
    return response;
  },

  // Get document by ID
  async getDocumentById(documentId) {
    const response = await api.get(`/documents/${documentId}`);
    return response;
  },

  // Upload a new document
  async uploadDocument(documentData) {
    const formData = new FormData();
    
    // Append file and metadata
    formData.append('file', documentData.file);
    formData.append('title', documentData.title);
    formData.append('description', documentData.description || '');
    formData.append('tags', JSON.stringify(documentData.tags || []));
    
    if (documentData.folderId) {
      formData.append('folder_id', documentData.folderId);
    }
    
    if (documentData.companyId) {
      formData.append('company_id', documentData.companyId);
    }
    
    if (documentData.permissions) {
      formData.append('permissions', JSON.stringify(documentData.permissions));
    }

    const response = await api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response;
  },

  // Update document metadata
  async updateDocument(documentId, updates) {
    const response = await api.put(`/documents/${documentId}`, updates);
    return response;
  },

  // Delete document
  async deleteDocument(documentId) {
    const response = await api.delete(`/documents/${documentId}`);
    return response;
  },

  // Download document
  async downloadDocument(documentId) {
    const response = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response;
  },

  // Get document versions
  async getDocumentVersions(documentId) {
    const response = await api.get(`/documents/${documentId}/versions`);
    return response;
  },

  // Restore document version
  async restoreDocumentVersion(documentId, versionId) {
    const response = await api.post(`/documents/${documentId}/versions/${versionId}/restore`);
    return response;
  },

  // Share document
  async shareDocument(documentId, shareData) {
    const response = await api.post(`/documents/${documentId}/share`, shareData);
    return response;
  },

  // Get document shares
  async getDocumentShares(documentId) {
    const response = await api.get(`/documents/${documentId}/shares`);
    return response;
  },

  // Update document share
  async updateDocumentShare(documentId, shareId, updates) {
    const response = await api.put(`/documents/${documentId}/shares/${shareId}`, updates);
    return response;
  },

  // Remove document share
  async removeDocumentShare(documentId, shareId) {
    const response = await api.delete(`/documents/${documentId}/shares/${shareId}`);
    return response;
  },

  // Add document comment
  async addDocumentComment(documentId, comment) {
    const response = await api.post(`/documents/${documentId}/comments`, { comment });
    return response;
  },

  // Get document comments
  async getDocumentComments(documentId) {
    const response = await api.get(`/documents/${documentId}/comments`);
    return response;
  },

  // Update document comment
  async updateDocumentComment(documentId, commentId, updates) {
    const response = await api.put(`/documents/${documentId}/comments/${commentId}`, updates);
    return response;
  },

  // Delete document comment
  async deleteDocumentComment(documentId, commentId) {
    const response = await api.delete(`/documents/${documentId}/comments/${commentId}`);
    return response;
  },

  // Add document tag
  async addDocumentTag(documentId, tag) {
    const response = await api.post(`/documents/${documentId}/tags`, { tag });
    return response;
  },

  // Remove document tag
  async removeDocumentTag(documentId, tagId) {
    const response = await api.delete(`/documents/${documentId}/tags/${tagId}`);
    return response;
  },

  // Search documents
  async searchDocuments(query, params = {}) {
    const response = await api.get('/documents/search', { 
      params: { q: query, ...params } 
    });
    return response;
  },

  // Get document analytics
  async getDocumentAnalytics(documentId, params = {}) {
    const response = await api.get(`/documents/${documentId}/analytics`, { params });
    return response;
  },

  // Get document preview URL
  getDocumentPreviewUrl(documentId, page = 1) {
    return `${api.defaults.baseURL}/documents/${documentId}/preview?page=${page}`;
  },

  // Get document thumbnail URL
  getDocumentThumbnailUrl(documentId) {
    return `${api.defaults.baseURL}/documents/${documentId}/thumbnail`;
  },

  // Get document OCR text
  async getDocumentOcrText(documentId) {
    const response = await api.get(`/documents/${documentId}/ocr`);
    return response;
  },

  // Get document metadata
  async getDocumentMetadata(documentId) {
    const response = await api.get(`/documents/${documentId}/metadata`);
    return response;
  },

  // Update document content
  async updateDocumentContent(documentId, content) {
    const response = await api.put(`/documents/${documentId}/content`, { content });
    return response;
  },

  // Lock document
  async lockDocument(documentId) {
    const response = await api.post(`/documents/${documentId}/lock`);
    return response;
  },

  // Unlock document
  async unlockDocument(documentId) {
    const response = await api.post(`/documents/${documentId}/unlock`);
    return response;
  },

  // Get document collaborators
  async getDocumentCollaborators(documentId) {
    const response = await api.get(`/documents/${documentId}/collaborators`);
    return response;
  },
};

export default documentService;
