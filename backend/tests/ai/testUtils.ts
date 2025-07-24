import { Request, Response } from 'express';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define the interface for our mock service
type MockLlamaService = {
  initialize: jest.Mock<Promise<void>, []>;
  generateText: jest.Mock<Promise<string>, [string, Record<string, any>?]>;
  summarize: jest.Mock<Promise<string>, [string, number?]>;
  redact: jest.Mock<Promise<string>, [string]>;
  spellcheck: jest.Mock<Promise<{
    original: string;
    corrected: string;
    corrections: Array<{
      word: string;
      offset: number;
      suggestions: string[];
    }>;
  }>, [string]>;
};

// Create a properly typed mock service
export const mockLlamaService: MockLlamaService = {
  initialize: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  generateText: jest.fn<Promise<string>, [string, Record<string, any>?]>().mockResolvedValue('mock generated text'),
  summarize: jest.fn<Promise<string>, [string, number?]>().mockResolvedValue('mock summary'),
  redact: jest.fn<Promise<string>, [string]>().mockResolvedValue('mock [REDACTED] text'),
  spellcheck: jest.fn<Promise<{
    original: string;
    corrected: string;
    corrections: Array<{
      word: string;
      offset: number;
      suggestions: string[];
    }>;
  }>, [string]>().mockResolvedValue({
    original: 'mock text with error',
    corrected: 'mock text with error',
    corrections: []
  })
};

// Define a custom mock response type that extends Express Response
export interface MockResponse extends Response {
  json: jest.Mock<this, [any]>;
  status: jest.Mock<this, [number]>;
  send: jest.Mock<this, [any?]>;
}

// Helper to create a mock response
export const createMockResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {};
  res.json = jest.fn<MockResponse, [any]>().mockReturnThis();
  res.status = jest.fn<MockResponse, [number]>().mockReturnThis();
  res.send = jest.fn<MockResponse, [any?]>().mockReturnThis();
  return res as MockResponse;
};

// Mock the entire llamaService module with proper typing
jest.mock('../../services/llama/llamaService', () => ({
  llamaService: mockLlamaService
}));

// Re-export jest globals for convenience
export { describe, it, expect, beforeEach };

/**
 * Creates a mock Express request object
 */
export const createMockRequest = (body: any = {}, params: any = {}, query: any = {}): Partial<Request> => ({
  body,
  params,
  query,
  get: jest.fn(),
  header: jest.fn(),
});

/**
 * Creates a mock Express response object with Jest mocks
 */
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Helper to wait for a promise to resolve in tests
 */
export const flushPromises = () => new Promise(setImmediate);

/**
 * Helper to test error handling in async functions
 */
export const expectAsyncError = async (
  fn: () => Promise<any>,
  errorMessage?: string | RegExp
) => {
  let error: Error | null = null;
  try {
    await fn();
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
  }
  
  expect(error).toBeInstanceOf(Error);
  if (errorMessage) {
    if (errorMessage instanceof RegExp) {
      expect(error?.message).toMatch(errorMessage);
    } else {
      expect(error?.message).toContain(errorMessage);
    }
  }
};
