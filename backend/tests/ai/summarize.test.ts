import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { summarizeText } from '../../routes/ai/summarize';
import { createMockRequest, createMockResponse, mockLlamaService } from './testUtils';

// Mock the response type to fix TypeScript errors
interface MockResponse extends Response {
  json: jest.Mock;
  status: jest.Mock;
  send: jest.Mock;
}

describe('Summarization API', () => {
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
    
    // Default request with valid text
    mockReq = createMockRequest({
      text: 'This is a test text that needs to be summarized. It contains multiple sentences to ensure the summarization works correctly.'
    });
    
    // Reset the mock implementation for summarize
    mockLlamaService.summarize.mockResolvedValue('This is a mock summary of the provided text.');
  });

  it('should return a successful response with a summary', async () => {
    await summarizeText(mockReq as any, mockRes as any);
    
    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    
    expect(mockLlamaService.initialize).toHaveBeenCalled();
    expect(mockLlamaService.summarize).toHaveBeenCalledWith(
      mockReq.body.text,
      expect.any(Number) // maxLength
    );
    
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('data');
    expect(response.data).toContain('This is a mock summary');
    expect(response).toHaveProperty('meta');
    expect(response.meta).toHaveProperty('model');
  });

  it('should handle missing text input', async () => {
    mockReq.body.text = '';
    
    await summarizeText(mockReq as any, mockRes as any);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Text input is required'
      })
    );
  });

  it('should handle options parameter', async () => {
    mockReq.body.options = { maxLength: 100 };
    
    await summarizeText(mockReq as any, mockRes as any);
    
    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    expect(response).toHaveProperty('success', true);
  });

  it('should handle long text input', async () => {
    const longText = 'a '.repeat(10000);
    mockReq.body.text = longText;
    
    await summarizeText(mockReq as any, mockRes as any);
    
    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    expect(response).toHaveProperty('success', true);
    expect(response.data.length).toBeLessThan(longText.length);
  });

  it('should handle error cases', async () => {
    // Force an error by making req.body.text a non-string
    mockReq.body.text = { invalid: 'data' };
    
    await summarizeText(mockReq as any, mockRes as any);
    
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Failed to generate summary'
      })
    );
  });
});
