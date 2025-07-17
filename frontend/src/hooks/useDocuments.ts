import { useState, useCallback } from 'react';
import { 
  DocumentMetadata, 
  DocumentWithVersions, 
  DocumentVersion,
  DocumentResponse,
  UploadResponse,
  VersionHistoryResponse,
  DocumentListResponse,
  BaseResponse,
  uploadDocument as apiUploadDocument,
  getDocument as apiGetDocument,
  listDocuments as apiListDocuments,
  updateDocument as apiUpdateDocument,
  deleteDocument as apiDeleteDocument,
  getVersionHistory as apiGetVersionHistory,
  getDocumentVersion as apiGetDocumentVersion,
  restoreVersion as apiRestoreVersion,
  summarizeText as apiSummarizeText,
  spellcheckText as apiSpellcheckText,
} from '../services/documentApi';

export const useDocuments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState<DocumentWithVersions | null>(null);
  const [documentList, setDocumentList] = useState<DocumentMetadata[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [versionHistory, setVersionHistory] = useState<DocumentVersion[]>([]);
  const [versionPagination, setVersionPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  // Upload a new document
  const uploadDocument = useCallback(async (file: File, metadata: Partial<DocumentMetadata> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiUploadDocument(file, metadata);
      if (response.status === 'success') {
        // Refresh the document list
        await listDocuments();
        return response;
      }
      throw new Error(response.error || 'Failed to upload document');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a single document by ID
  const getDocument = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGetDocument(documentId);
      if (response.status === 'success') {
        setCurrentDocument(response.document);
        return response.document;
      }
      throw new Error(response.error || 'Failed to fetch document');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // List documents with pagination and filters
  const listDocuments = useCallback(async (page = 1, pageSize = 10, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiListDocuments(page, pageSize, filters);
      if (response.status === 'success') {
        setDocumentList(response.documents);
        setPagination({
          page: response.page,
          pageSize: response.page_size,
          total: response.total,
          totalPages: response.total_pages,
        });
        return response;
      }
      throw new Error(response.error || 'Failed to fetch documents');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update document metadata
  const updateDocument = useCallback(async (documentId: string, updates: Partial<DocumentMetadata>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiUpdateDocument(documentId, updates);
      if (response.status === 'success') {
        // Refresh the current document and document list
        await Promise.all([
          getDocument(documentId),
          listDocuments(pagination.page, pagination.pageSize),
        ]);
        return response;
      }
      throw new Error(response.error || 'Failed to update document');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getDocument, pagination.page, pagination.pageSize]);

  // Delete a document
  const deleteDocument = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiDeleteDocument(documentId);
      if (response.status === 'success') {
        // Refresh the document list
        await listDocuments(pagination.page, pagination.pageSize);
        return response;
      }
      throw new Error(response.error || 'Failed to delete document');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  // Get version history for a document
  const getVersionHistory = useCallback(async (documentId: string, page = 1, pageSize = 10) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGetVersionHistory(documentId, page, pageSize);
      if (response.status === 'success') {
        setVersionHistory(response.versions);
        setVersionPagination({
          page,
          pageSize,
          total: response.total,
        });
        return response;
      }
      throw new Error(response.error || 'Failed to fetch version history');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a specific version of a document
  const getDocumentVersion = useCallback(async (documentId: string, versionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGetDocumentVersion(documentId, versionId);
      if (response.status === 'success') {
        return response.document;
      }
      throw new Error(response.error || 'Failed to fetch document version');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore a specific version of a document
  const restoreVersion = useCallback(async (documentId: string, versionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRestoreVersion(documentId, versionId);
      if (response.status === 'success') {
        // Refresh the current document and version history
        await Promise.all([
          getDocument(documentId),
          getVersionHistory(documentId, versionPagination.page, versionPagination.pageSize),
        ]);
        return response;
      }
      throw new Error(response.error || 'Failed to restore version');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getDocument, getVersionHistory, versionPagination.page, versionPagination.pageSize]);

  // Summarize text
  const summarizeText = useCallback(async (text: string, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiSummarizeText(text, options);
      if (response.status === 'success') {
        return response;
      }
      throw new Error(response.error || 'Failed to summarize text');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Spellcheck text
  const spellcheckText = useCallback(async (text: string, language = 'en') => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiSpellcheckText(text, language);
      if (response.status === 'success') {
        return response;
      }
      throw new Error(response.error || 'Failed to check spelling');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear the current error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    currentDocument,
    documentList,
    pagination,
    versionHistory,
    versionPagination,
    
    // Actions
    uploadDocument,
    getDocument,
    listDocuments,
    updateDocument,
    deleteDocument,
    getVersionHistory,
    getDocumentVersion,
    restoreVersion,
    summarizeText,
    spellcheckText,
    clearError,
  };
};

export default useDocuments;
