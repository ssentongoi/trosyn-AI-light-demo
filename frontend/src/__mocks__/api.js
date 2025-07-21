// Mock API service that returns successful responses
const mockApi = {
  get: (url, config) => {
    console.log(`[MOCK API] GET ${url}`, { config });
    return Promise.resolve({ data: { success: true, message: 'Mock success' } });
  },
  post: (url, data, config) => {
    console.log(`[MOCK API] POST ${url}`, { data, config });
    return Promise.resolve({ data: { success: true, message: 'Mock success' } });
  },
  put: (url, data, config) => {
    console.log(`[MOCK API] PUT ${url}`, { data, config });
    return Promise.resolve({ data: { success: true, message: 'Mock success' } });
  },
  delete: (url, config) => {
    console.log(`[MOCK API] DELETE ${url}`, { config });
    return Promise.resolve({ data: { success: true, message: 'Mock success' } });
  },
  interceptors: {
    request: { use: () => {} },
    response: { 
      use: (onFulfilled, onRejected) => {
        // Mock interceptor that just passes through
        return { id: 'mock-interceptor' };
      }
    }
  }
};

export default mockApi;
