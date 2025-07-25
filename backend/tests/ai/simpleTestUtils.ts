import { Response } from 'express';
import { jest } from '@jest/globals';

// Define the interface for the mock service
interface MockLlamaService {
  initialize: () => Promise<void>;
  generateText: (prompt: string, options?: any) => Promise<string>;
  summarize: (text: string, maxLength?: number) => Promise<string>;
  redact: (text: string) => Promise<string>;
  spellcheck: (text: string) => Promise<{
    original: string;
    corrected: string;
    corrections: any[];
  }>;
}

// Simple mock service with basic functionality
export const mockLlamaService: MockLlamaService = {
  initialize: jest.fn().mockImplementation(() => Promise.resolve()),
  generateText: jest.fn().mockImplementation(() => Promise.resolve('mock generated text')),
  summarize: jest.fn().mockImplementation(() => Promise.resolve('mock summary')),
  redact: jest.fn().mockImplementation(() => Promise.resolve('mock [REDACTED] text')),
  spellcheck: jest.fn().mockImplementation((text: unknown) => {
    const textStr = typeof text === 'string' ? text : String(text);
    return Promise.resolve({
      original: textStr,
      corrected: textStr,
      corrections: []
    });
  })
} as unknown as MockLlamaService;

// Simple mock response implementation
export const createMockResponse = () => {
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

// Simple mock request implementation
export const createMockRequest = (body: any = {}) => ({
  body,
  params: {},
  query: {},
  headers: {},
  get: () => undefined
});

// Extend the global type to include our mocks
declare global {
  // eslint-disable-next-line no-var
  var mockResponse: () => ReturnType<typeof createMockResponse>;
}

// Assign to global for backward compatibility
global.mockResponse = createMockResponse;
