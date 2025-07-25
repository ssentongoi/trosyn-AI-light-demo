import type { Request, Response, NextFunction } from 'express';
import { jest } from '@jest/globals';

// Types for the mock service
type Correction = {
  word: string;
  offset: number;
  suggestions: string[];
};

type SpellcheckResult = {
  original: string;
  corrected: string;
  corrections: Correction[];
};

interface IMockLlamaService {
  initialize: () => Promise<void>;
  generateText: (prompt: string, options?: any) => Promise<string>;
  summarize: (text: string, maxLength?: number) => Promise<string>;
  redact: (text: string) => Promise<string>;
  spellcheck: (text: string) => Promise<SpellcheckResult>;
}

// Create a simple mock implementation
class MockLlamaService implements IMockLlamaService {
  initialize = jest.fn<Promise<void>, []>(
    () => Promise.resolve()
  );
  
  generateText = jest.fn<Promise<string>, [string, any?]>(
    () => Promise.resolve('mock generated text')
  );
  
  summarize = jest.fn<Promise<string>, [string, number?]>(
    () => Promise.resolve('mock summary')
  );
  
  redact = jest.fn<Promise<string>, [string]>(
    () => Promise.resolve('mock [REDACTED] text')
  );
  
  spellcheck = jest.fn<Promise<SpellcheckResult>, [string]>(
    () => Promise.resolve({
      original: 'mock text with error',
      corrected: 'mock text with error',
      corrections: []
    })
  );
}

export const mockLlamaService = new MockLlamaService();

// Create a proper mock response
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.get = jest.fn();
  return res;
};

// Create a mock request
export const createMockRequest = (
  body: any = {},
  params: any = {},
  query: any = {}
): Partial<Request> => ({
  body,
  params,
  query,
  get: jest.fn(),
  header: jest.fn()
});

// Helper to wait for promises to resolve
export const flushPromises = () => 
  new Promise(jest.requireActual('timers').setImmediate);

// Helper to test error handling
export const expectAsyncError = async (
  fn: () => Promise<any>,
  errorMessage?: string | RegExp
) => {
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
