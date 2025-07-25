import type { Request, Response, NextFunction } from 'express';
import { jest } from '@jest/globals';

// Types for the mock service
type Correction = {
  word: string;
  offset: number;
  suggestions: string[];
};

export type SpellcheckResult = {
  original: string;
  corrected: string;
  corrections: Correction[];
};

interface IMockLlamaService {
  initialize(): Promise<void>;
  generateText(prompt: string, options?: any): Promise<string>;
  summarize(text: string, maxLength?: number): Promise<string>;
  redact(text: string): Promise<string>;
  spellcheck(text: string): Promise<SpellcheckResult>;
}

// Create a simple mock implementation
class MockLlamaService implements IMockLlamaService {
  constructor() {
    // Initialize all mocks
    this.initialize = jest.fn(this.initialize.bind(this));
    this.generateText = jest.fn(this.generateText.bind(this));
    this.summarize = jest.fn(this.summarize.bind(this));
    this.redact = jest.fn(this.redact.bind(this));
    this.spellcheck = jest.fn(this.spellcheck.bind(this));
  }

  async initialize(): Promise<void> {
    return Promise.resolve();
  }
  
  async generateText(_prompt: string, _options?: any): Promise<string> {
    return Promise.resolve('mock generated text');
  }
  
  async summarize(_text: string, _maxLength?: number): Promise<string> {
    return Promise.resolve('mock summary');
  }
  
  async redact(_text: string): Promise<string> {
    return Promise.resolve('mock [REDACTED] text');
  }
  
  async spellcheck(_text: string): Promise<SpellcheckResult> {
    return Promise.resolve({
      original: 'mock text with error',
      corrected: 'mock text with error',
      corrections: []
    });
  }
}

export const mockLlamaService = new MockLlamaService();

// Simplified mock response type
type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  setHeader: jest.Mock;
  get: jest.Mock;
  body?: any;
  headers: Record<string, any>;
  statusCode?: number;
};

// Create a proper mock response
export const createMockResponse = (): MockResponse => {
  const mockResponse: any = {};
  
  // Initialize properties
  mockResponse.body = undefined;
  mockResponse.headers = {};
  mockResponse.statusCode = 200;

  // Create mock functions with proper typing
  mockResponse.status = jest.fn((code: number) => {
    mockResponse.statusCode = code;
    return mockResponse;
  });

  mockResponse.json = jest.fn((body: any) => {
    mockResponse.body = body;
    return mockResponse;
  });

  mockResponse.send = jest.fn((body?: any) => {
    mockResponse.body = body;
    return mockResponse;
  });

  mockResponse.setHeader = jest.fn((name: string, value: any) => {
    mockResponse.headers[name] = value;
    return mockResponse;
  });

  mockResponse.get = jest.fn((name: string) => {
    return mockResponse.headers[name];
  });

  return mockResponse as MockResponse;
};

// Simplified mock request type
type MockRequest = {
  body: any;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  get: jest.Mock;
  header: jest.Mock;
};

// Create a mock request
export const createMockRequest = (
  body: any = {},
  params: Record<string, string> = {},
  query: Record<string, string | string[]> = {}
): MockRequest => {
  const req: any = {
    body,
    params,
    query,
    get: jest.fn(),
    header: jest.fn()
  };
  
  return req as MockRequest;
};

// Helper to wait for promises to resolve
export const flushPromises = (): Promise<void> => 
  new Promise(resolve => process.nextTick(resolve));

// Helper to test error handling
export const expectAsyncError = async (
  fn: () => Promise<any>,
  errorMessage?: string | RegExp
): Promise<void> => {
  let error: Error | null = null;
  try {
    await fn();
  } catch (err) {
    error = err as Error;
  }
  expect(error).toBeInstanceOf(Error);
  if (errorMessage) {
    if (typeof errorMessage === 'string') {
      expect(error?.message).toContain(errorMessage);
    } else {
      expect(error?.message).toMatch(errorMessage);
    }
  }
};
