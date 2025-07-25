import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';

// Define the SpellcheckResult interface
export interface SpellcheckResult {
  original: string;
  corrected: string;
  corrections: Array<{ original: string; corrected: string }>;
}

// Create mock implementations with proper typing
const mockSpellcheck = jest.fn().mockImplementation((): Promise<SpellcheckResult> => {
  return Promise.resolve({
    original: '',
    corrected: '',
    corrections: []
  });
});

// Mock initialization function with proper typing
const mockInitialize = jest.fn().mockImplementation((): Promise<void> => Promise.resolve());

// Mock the llamaService before importing the module that uses it
// Using module path alias for ESM compatibility
jest.mock('@services/llama/llamaService.js', () => ({
  llamaService: {
    initialize: mockInitialize,
    spellcheck: mockSpellcheck,
  },
}), { virtual: true });

// Import the modules using path aliases with .js extensions
import { spellcheckText } from '@routes/ai/spellcheck.js';
import { llamaService } from '@services/llama/llamaService.js';

// Inline mock configuration to avoid module resolution issues
const mockConfig = {
  mode: 'test',
  features: {
    spellcheck: {
      enabled: true,
      defaultLanguage: 'en-US',
      temperature: 0.7,
      maxTokens: 100
    }
  }
};

// Mock the config import with the inlined configuration
jest.mock('@config/aiConfig.json', () => mockConfig, { virtual: true });

// Simple mock for createMockResponse
const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res) as any;
  res.json = jest.fn().mockReturnValue(res) as any;
  return res;
};

describe('Spellcheck API', () => {
  beforeEach(() => {
    // Reset mocks before each test to ensure isolation.
    jest.clearAllMocks();
    jest.spyOn(llamaService, 'initialize').mockResolvedValue(undefined);
    jest.spyOn(llamaService, 'spellcheck');
  });

  describe('POST /api/ai/spellcheck', () => {
    it('should return 200 and corrections for valid input', async () => {
      const mockResult: SpellcheckResult = {
        original: 'helo wrld',
        corrected: 'hello world',
        corrections: [{ original: 'helo', corrected: 'hello' }],
      };
      (llamaService.spellcheck as jest.Mock<() => Promise<SpellcheckResult>>).mockResolvedValue(mockResult);

      const req = { body: { text: 'helo wrld' } } as Request;
      const res = createMockResponse();

      await spellcheckText(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 for missing text', async () => {
      const req = { body: {} } as Request;
      const res = createMockResponse();

      await spellcheckText(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Text is required for spellchecking' });
    });

    it('should handle errors from the LLM service', async () => {
      // Mock console.error
      const originalError = console.error;
      const mockError = jest.fn();
      console.error = mockError;
      
      try {
        // Mock the spellcheck function to reject with an error
        const errorMessage = 'LLM Error';
        (llamaService.spellcheck as jest.Mock).mockRejectedValue(new Error(errorMessage));

        const req = { body: { text: 'some text' } } as Request;
        const res = createMockResponse();

        await spellcheckText(req, res as unknown as Response);

        // Verify the response is successful with the original text
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: {
            original: 'some text',
            corrected: 'some text',
            corrections: [],
            language: 'en-US',
            timestamp: expect.any(String)
          }
        });
        
        // With our improved error handling, errors are handled gracefully without logging
        // The error is now handled internally by llamaClient.spellcheck
        // So we just verify that the original text was returned correctly
      } finally {
        // Restore original console.error
        console.error = originalError;
      }
    });

    it('should handle empty string input', async () => {
      const req = { body: { text: ' ' } } as Request;
      const res = createMockResponse();

      await spellcheckText(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Text is required for spellchecking' });
    });

    it('should handle non-string input', async () => {
      const req = { body: { text: 12345 } } as Request;
      const res = createMockResponse();

      await spellcheckText(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Text must be a string' });
    });

    it('should handle very long text input', async () => {
      const longText = 'a '.repeat(1000) + 'eror';
      const mockResult: SpellcheckResult = {
        original: longText,
        corrected: longText.replace('eror', 'error'),
        corrections: [{ original: 'eror', corrected: 'error' }],
      };
      (llamaService.spellcheck as jest.Mock<() => Promise<SpellcheckResult>>).mockResolvedValue(mockResult);

      const req = { body: { text: longText } } as Request;
      const res = createMockResponse();

      await spellcheckText(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should handle special characters and Unicode', async () => {
      const textWithUnicode = 'Café is not coffe';
      const mockResult: SpellcheckResult = {
        original: textWithUnicode,
        corrected: 'Café is not coffee',
        corrections: [{ original: 'coffe', corrected: 'coffee' }],
      };
      (llamaService.spellcheck as jest.Mock<() => Promise<SpellcheckResult>>).mockResolvedValue(mockResult);

      const req = { body: { text: textWithUnicode } } as Request;
      const res = createMockResponse();

      await spellcheckText(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should handle mixed languages', async () => {
      const mixedLangText = 'Bonjour! How are you? こんにちは！';
      const mockResult: SpellcheckResult = {
        original: mixedLangText,
        corrected: mixedLangText, // No corrections expected for this case
        corrections: [],
      };
      (llamaService.spellcheck as jest.Mock<() => Promise<SpellcheckResult>>).mockResolvedValue(mockResult);

      const req = { body: { text: mixedLangText } } as Request;
      const res = createMockResponse();

      await spellcheckText(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should handle intentional grammar mistakes', async () => {
      const textWithGrammarMistakes = 'i has a apple and they is red';
      const mockResult: SpellcheckResult = {
        original: textWithGrammarMistakes,
        corrected: 'I have an apple and it is red',
        corrections: [
          { original: 'i', corrected: 'I' },
          { original: 'has', corrected: 'have' },
          { original: 'a', corrected: 'an' },
          { original: 'they is', corrected: 'it is' },
        ],
      };
      (llamaService.spellcheck as jest.Mock<() => Promise<SpellcheckResult>>).mockResolvedValue(mockResult);

      const req = { body: { text: textWithGrammarMistakes } } as Request;
      const res = createMockResponse();

      await spellcheckText(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should handle different types of whitespace', async () => {
      const textWithWeirdWhitespace = '  hello\tworld\n  how\rare\tyou?  ';
      const mockResult: SpellcheckResult = {
        original: textWithWeirdWhitespace,
        corrected: 'hello world how are you?',
        corrections: [
          { original: 'how', corrected: 'how' },
          { original: 'r', corrected: 'are' },
          { original: 'tyou?', corrected: 'you?' },
        ],
      };
      (llamaService.spellcheck as jest.Mock<() => Promise<SpellcheckResult>>).mockResolvedValue(mockResult);

      const req = { body: { text: textWithWeirdWhitespace } } as Request;
      const res = createMockResponse();

      await spellcheckText(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
