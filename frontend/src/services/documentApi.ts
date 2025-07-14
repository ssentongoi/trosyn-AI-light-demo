import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with base URL and common headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', error.response.status, error.response.data);
      const errorData = error.response.data as { detail?: string; error?: string };
      return Promise.reject({
        status: 'error',
        error: errorData?.detail || errorData?.error || 'An error occurred',
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      return Promise.reject({
        status: 'error',
        error: 'No response from server. Please check your connection.',
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
      return Promise.reject({
        status: 'error',
        error: error.message,
      });
    }
  }
);

export interface UploadResponse {
  content?: string;
  metadata?: Record<string, any>;
  status: 'success' | 'error';
  error?: string;
}

export interface SummarizeResponse {
  summary?: string;
  status: 'success' | 'error';
  error?: string;
}

export interface SpellcheckResponse {
  spellchecked_text?: string;
  status: 'success' | 'error';
  error?: string;
}

export async function uploadDocument(fileContent: string, fileType: string): Promise<UploadResponse> {
  try {
    const response = await api.post<UploadResponse>('/api/upload', {
      file_content: fileContent,
      file_type: fileType,
    });
    return response.data;
  } catch (error: any) {
    return {
      status: 'error',
      error: error.error || 'Failed to upload document',
    };
  }
}

export async function summarizeText(text: string): Promise<SummarizeResponse> {
  try {
    const response = await api.post<SummarizeResponse>('/api/summarize', { text });
    return response.data;
  } catch (error: any) {
    return {
      status: 'error',
      error: error.error || 'Failed to summarize text',
    };
  }
}

export async function spellcheckText(text: string): Promise<SpellcheckResponse> {
  try {
    const response = await api.post<SpellcheckResponse>('/api/spellcheck', { text });
    return response.data;
  } catch (error: any) {
    return {
      status: 'error',
      error: error.error || 'Failed to check spelling',
    };
  }
}
