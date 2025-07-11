import axios from 'axios';

const API_URL = '/api/v1/memory';

class MemoryService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Get current memory context
  async getContext() {
    try {
      const response = await this.api.get('/context');
      return response.data;
    } catch (error) {
      console.error('Error fetching memory context:', error);
      throw error;
    }
  }

  // Update memory context
  async updateContext(contextUpdates) {
    try {
      const response = await this.api.post('/context', contextUpdates);
      return response.data;
    } catch (error) {
      console.error('Error updating memory context:', error);
      throw error;
    }
  }

  // Add interaction to memory
  async addInteraction(query, response, metadata = {}) {
    try {
      const result = await this.api.post('/interaction', {
        query,
        response,
        metadata
      });
      return result.data;
    } catch (error) {
      console.error('Error adding interaction to memory:', error);
      throw error;
    }
  }

  // Export memory to file
  async exportMemory() {
    try {
      const response = await this.api.get('/export', {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.href = url;
      link.setAttribute('download', `trosyn-memory-${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (error) {
      console.error('Error exporting memory:', error);
      throw error;
    }
  }

  // Import memory from file
  async importMemory(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await this.api.post('/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error importing memory:', error);
      throw error;
    }
  }

  // Clear all memory
  async clearMemory() {
    try {
      const response = await this.api.delete('/clear');
      return response.data;
    } catch (error) {
      console.error('Error clearing memory:', error);
      throw error;
    }
  }
}

export default new MemoryService();
