import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { redactText } from '../../routes/ai/redact';
import { createMockRequest, createMockResponse, mockLlamaService } from './testUtils';

// Mock the response type to fix TypeScript errors
interface MockResponse extends Response {
  json: jest.Mock;
  status: jest.Mock;
  send: jest.Mock;
}

describe('Redaction API', () => {
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
      text: 'This is a test text containing sensitive information like credit card 4111-1111-1111-1111 and SSN 123-45-6789.'
    });
    
    // Reset the mock implementation for redact
    mockLlamaService.redact.mockResolvedValue('This is a test text containing sensitive information like [REDACTED] and [REDACTED].');
  });

  it('should redact sensitive information', async () => {
    await redactText(mockReq as any, mockRes as any);
    
    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    
    expect(mockLlamaService.initialize).toHaveBeenCalled();
    expect(mockLlamaService.redact).toHaveBeenCalledWith(mockReq.body.text);
    
    expect(response).toHaveProperty('success', true);
    expect(response.data).toContain('[REDACTED]');
    expect(response.meta).toHaveProperty('model');
  });

  it('should handle missing text input', async () => {
    mockReq.body.text = '';
    
    await redactText(mockReq as any, mockRes as any);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Text input is required'
      })
    );
  });

  it('should respect redaction types', async () => {
    mockReq.body.redactionTypes = ['email'];
    
    await redactText(mockReq as any, mockRes as any);
    
    const response = mockJson.mock.calls[0][0];
    // Email should be redacted, phone might not be if we're only looking for emails
    expect(response.data).toContain('[REDACTED]');
  });

  it('should handle text with no matches', async () => {
    mockReq.body.text = 'This text has no sensitive information.';
    
    await redactText(mockReq as any, mockRes as any);
    
    const response = mockJson.mock.calls[0][0];
    expect(response.data).toBe(mockReq.body.text); // No changes expected
  });

  it('should handle error cases', async () => {
    // Force an error by making req.body.text a non-string
    mockReq.body.text = { invalid: 'data' };
    
    await redactText(mockReq as any, mockRes as any);
    
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Failed to redact text'
      })
    );
  });
});
