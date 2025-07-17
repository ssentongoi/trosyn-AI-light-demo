import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance with base URL and common headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For handling HTTP-only cookies
});

// Add request interceptor for auth token if needed
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized error (token expired, invalid, etc.)
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', error.response.status, error.response.data);
      const errorData = error.response.data as { detail?: string; error?: string; message?: string };
      return Promise.reject({
        status: 'error',
        error: errorData?.detail || errorData?.error || errorData?.message || 'An error occurred',
        code: error.response.status,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      return Promise.reject({
        status: 'error',
        error: 'No response from server. Please check your connection.',
        code: 0,
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
      return Promise.reject({
        status: 'error',
        error: 'Request setup error',
        code: -1,
      });
    }
  }
);

// Base response interface
export interface BaseResponse {
  status: 'success' | 'error';
  error?: string;
  code?: number;
}

// Document related interfaces
export interface DocumentMetadata {
  id: string;
  title: string;
  description?: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  tags?: string[];
  is_public: boolean;
  permissions?: {
    read: string[];
    write: string[];
    admin: string[];
  };
}

export interface DocumentVersion {
  version_id: string;
  document_id: string;
  version_number: number;
  created_at: string;
  created_by: string;
  change_summary?: string;
  content: string;
  metadata: Record<string, any>;
}

export interface DocumentWithVersions extends DocumentMetadata {
  versions: DocumentVersion[];
  current_version: DocumentVersion;
}

// API Response Interfaces
export interface UploadResponse extends BaseResponse {
  document_id: string;
  content?: string;
  metadata?: DocumentMetadata;
}

export interface DocumentListResponse extends BaseResponse {
  documents: DocumentMetadata[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DocumentResponse extends BaseResponse {
  document: DocumentWithVersions;
}

export interface VersionHistoryResponse extends BaseResponse {
  versions: DocumentVersion[];
  total: number;
}

export interface SummarizeResponse extends BaseResponse {
  summary?: string;
  key_points?: string[];
  word_count?: number;
}

export interface SpellcheckResponse extends BaseResponse {
  corrected_text?: string;
  corrections?: Array<{
    original: string;
    suggestion: string;
    offset: number;
    length: number;
    context: string;
  }>;
}

// Document Management API
export const uploadDocument = async (
  file: File,
  metadata: Partial<DocumentMetadata> = {}
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));

  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getDocument = async (documentId: string): Promise<DocumentResponse> => {
  const response = await api.get(`/documents/${documentId}`);
  return response.data;
};

export const listDocuments = async (
  page = 1,
  pageSize = 10,
  filters: Record<string, any> = {}
): Promise<DocumentListResponse> => {
  const response = await api.get('/documents', {
    params: {
      page,
      page_size: pageSize,
      ...filters,
    },
  });
  return response.data;
};

export const updateDocument = async (
  documentId: string,
  updates: Partial<DocumentMetadata>
): Promise<BaseResponse> => {
  const response = await api.patch(`/documents/${documentId}`, updates);
  return response.data;
};

export const deleteDocument = async (documentId: string): Promise<BaseResponse> => {
  const response = await api.delete(`/documents/${documentId}`);
  return response.data;
};

// Version Management
export const getVersionHistory = async (
  documentId: string,
  page = 1,
  pageSize = 10
): Promise<VersionHistoryResponse> => {
  const response = await api.get(`/documents/${documentId}/versions`, {
    params: { page, page_size: pageSize },
  });
  return response.data;
};

export const getDocumentVersion = async (
  documentId: string,
  versionId: string
): Promise<DocumentResponse> => {
  const response = await api.get(`/documents/${documentId}/versions/${versionId}`);
  return response.data;
};

export const restoreVersion = async (
  documentId: string,
  versionId: string
): Promise<DocumentResponse> => {
  const response = await api.post(`/documents/${documentId}/versions/${versionId}/restore`);
  return response.data;
};

// Document Processing
export const summarizeText = async (
  text: string,
  options?: {
    max_length?: number;
    min_length?: number;
    do_sample?: boolean;
  }
): Promise<SummarizeResponse> => {
  const response = await api.post('/summarize', { text, ...options });
  return response.data;
};

export const spellcheckText = async (
  text: string,
  language: string = 'en'
): Promise<SpellcheckResponse> => {
  const response = await api.post('/spellcheck', { text, language });
  return response.data;
};

// Document Collaboration
export const shareDocument = async (
  documentId: string,
  userIds: string[],
  permission: 'read' | 'write' | 'admin'
): Promise<BaseResponse> => {
  const response = await api.post(`/documents/${documentId}/share`, {
    user_ids: userIds,
    permission,
  });
  return response.data;
};

export const updateDocumentPermissions = async (
  documentId: string,
  updates: {
    read?: string[];
    write?: string[];
    admin?: string[];
  }
): Promise<BaseResponse> => {
  const response = await api.patch(`/documents/${documentId}/permissions`, updates);
  return response.data;
};

// Export all types
export type { BaseResponse as IBaseResponse };
export type { DocumentMetadata as IDocumentMetadata };
export type { DocumentVersion as IDocumentVersion };
export type { DocumentWithVersions as IDocumentWithVersions };
