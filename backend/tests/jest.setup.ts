import { jest } from '@jest/globals';

// Mock node-fetch for ESM compatibility
jest.unstable_mockModule('node-fetch', () => ({
  default: jest.fn().mockResolvedValue({ 
    ok: true, 
    json: async () => ({}),
    text: async () => ''
  })
}));

// Extend the global type to include our mocks
declare global {
  // eslint-disable-next-line no-var
  var mockResponse: () => any;
  namespace NodeJS {
    interface Global {
      mockResponse: () => any;
    }
  }
}

// Simple mock response implementation
const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.contentType = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

// Assign to global for backward compatibility
(global as any).mockResponse = createMockResponse;
