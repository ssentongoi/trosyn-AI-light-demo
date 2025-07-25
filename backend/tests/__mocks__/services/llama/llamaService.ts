import { jest } from '@jest/globals';

// Mock implementation of llamaService
export const llamaService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  summarize: jest.fn().mockImplementation((text: string, maxLength?: number) => {
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }
    const mockSummary = 'This is a mock summary of the provided text.';
    return Promise.resolve(mockSummary);
  }),
  redact: jest.fn().mockImplementation((text: string, redactionTypes?: string[]) => {
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }
    // Return a mock redacted text with [REDACTED] placeholders
    if (text.includes('sensitive information')) {
      return Promise.resolve('This is a test text containing sensitive information like [REDACTED] and [REDACTED].');
    }
    // Return the original text for 'no matches' test case
    return Promise.resolve(text);
  }),
  spellcheck: jest.fn().mockImplementation((text: string) => {
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }
    return Promise.resolve({
      original: text,
      corrected: text,
      corrections: []
    });
  }),
  generateText: jest.fn().mockImplementation((prompt: string) => {
    if (typeof prompt !== 'string') {
      throw new Error('Prompt must be a string');
    }
    return Promise.resolve('This is mock generated text based on the prompt.');
  })
};

export default { llamaService };
