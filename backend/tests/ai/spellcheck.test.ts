import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { spellcheckText } from '../../routes/ai/spellcheck';
import { createMockRequest, createMockResponse, mockLlamaService } from './testUtils';

// Mock the response type to fix TypeScript errors
interface MockResponse extends Response {
  json: jest.Mock;
  status: jest.Mock;
  send: jest.Mock;
}

describe('Spellcheck API', () => {
  let mockReq: Partial<Request>;
  let mockRes: MockResponse;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockRes = {
      json: mockJson,
      status: mockStatus,
      send: jest.fn()
    } as unknown as MockResponse;
    
    // Default request with text containing potential spelling errors
    mockReq = createMockRequest({
      text: 'This is a test text with some speling errors.'
    });
    
    // Setup default mock implementation for spellcheck
    mockLlamaService.spellcheck.mockResolvedValue({
      original: 'This is a test text with some speling errors.',
      corrected: 'This is a test text with some spelling errors.',
      corrections: [
        {
          word: 'speling',
          offset: 26,
          suggestions: ['spelling', 'spieling', 'spiel', 'spieler']
        }
      ]
    });
  });

  it('should identify spelling errors', async () => {
    await spellcheckText(mockReq as any, mockRes as any);
    
    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    
    expect(mockLlamaService.initialize).toHaveBeenCalled();
    expect(mockLlamaService.spellcheck).toHaveBeenCalledWith(mockReq.body.text);
    
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('data');
    expect(response.data).toHaveProperty('original');
    expect(response.data).toHaveProperty('corrected');
    expect(response.data).toHaveProperty('corrections');
    expect(Array.isArray(response.data.corrections)).toBe(true);
    expect(response.meta).toHaveProperty('model');
  });

  it('should handle missing text input', async () => {
    mockReq.body.text = '';
    
    await spellcheckText(mockReq as any, mockRes as any);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Text input is required'
      })
    );
  });

  it('should respect language parameter', async () => {
    mockReq.body.language = 'en-GB';
    
    await spellcheckText(mockReq as any, mockRes as any);
    
    const response = mockJson.mock.calls[0][0];
    expect(response.meta).toHaveProperty('language', 'en-GB');
  });

  it('should return mock spelling issues', async () => {
    const testText = 'This is an exmaple text.';
    mockReq.body.text = testText;
    
    await spellcheckText(mockReq as any, mockRes as any);
    
    const response = mockJson.mock.calls[0][0];
    expect(response).toHaveProperty('success', true);
    expect(response.data).toHaveProperty('original', testText);
    expect(response.data).toHaveProperty('corrected');
    expect(response.data.issues).toHaveLength(1);
    expect(response.data.issues[0]).toHaveProperty('offset', 5);
    expect(response.data.issues[0]).toHaveProperty('length', 7);
    expect(response.data.issues[0]).toHaveProperty('type', 'spelling');
    expect(response.data.issues[0]).toHaveProperty('word', 'exmaple');
    expect(response.data.issues[0]).toHaveProperty('suggestions', ['example']);
  });

  it('should handle error cases', async () => {
    // Force an error by making req.body.text a non-string
    mockReq.body.text = { invalid: 'data' };
    
    await spellcheckText(mockReq as any, mockRes as any);
    
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Failed to check spelling'
      })
    );
  });

  it('should return suggestions for misspelled words', async () => {
    mockReq.body.text = 'mispeled';
    
    await spellcheckText(mockReq as any, mockRes as any);
    
    const response = mockJson.mock.calls[0][0];
    expect(response.data.issues[0]).toHaveProperty('suggestions');
    expect(Array.isArray(response.data.issues[0].suggestions)).toBe(true);
  });
});
