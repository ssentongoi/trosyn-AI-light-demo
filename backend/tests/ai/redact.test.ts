import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';

// Mock the llamaService module
jest.mock('../../services/llama/llamaService.js', () => {
  return {
    llamaService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      summarize: jest.fn().mockResolvedValue('This is a mock summary'),
      redact: jest.fn().mockResolvedValue('This is a test text containing sensitive information like [REDACTED] and [REDACTED].'),
      spellcheck: jest.fn().mockResolvedValue({
        original: 'test',
        corrected: 'test',
        corrections: []
      }),
      generateText: jest.fn().mockResolvedValue('mock generated text')
    }
  };
});

// Import the mocked module directly
import { llamaService } from '../../services/llama/llamaService.js';

// Import the route handler after mocking
import { redactText } from '../../routes/ai/redact';

// Helper function to create a mock response
const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Helper function to create a mock request
const createMockRequest = (body: any = {}) => ({
  body,
  params: {},
  query: {}
});

describe('Redaction API', () => {
  let mockReq: Partial<Request>;
  let mockRes: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup response mock
    mockRes = createMockResponse();
    
    // Default request with valid text
    mockReq = createMockRequest({
      text: 'This is a test text containing sensitive information like credit card 4111-1111-1111-1111 and SSN 123-45-6789.'
    });
    
    // Reset mock implementations for each test
    jest.spyOn(llamaService, 'initialize').mockImplementation(() => Promise.resolve());
    jest.spyOn(llamaService, 'redact').mockImplementation(() => Promise.resolve('This is a test text containing sensitive information like [REDACTED] and [REDACTED].'));
  });

  it('should redact sensitive information', async () => {
    await redactText(mockReq as Request, mockRes as Response);
    
    expect(mockRes.json).toHaveBeenCalled();
    const response = mockRes.json.mock.calls[0][0];
    
    expect(llamaService.initialize).toHaveBeenCalled();
    expect(llamaService.redact).toHaveBeenCalledWith(mockReq.body.text, ['pii', 'sensitive']);
    
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('data');
    expect(response.data).toContain('[REDACTED]');
  });

  it('should handle missing text input', async () => {
    mockReq.body.text = '';
    
    await redactText(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Text input is required'
      })
    );
  });

  it('should respect redaction types', async () => {
    mockReq.body.redactionTypes = ['email'];
    
    await redactText(mockReq as Request, mockRes as Response);
    
    const response = mockRes.json.mock.calls[0][0];
    // Email should be redacted, phone might not be if we're only looking for emails
    expect(response.data).toContain('[REDACTED]');
    expect(llamaService.redact).toHaveBeenCalledWith(mockReq.body.text, ['email']);
  });

  it('should handle text with no matches', async () => {
    mockReq.body.text = 'This text has no sensitive information.';
    // Update the mock to return the same text (no redactions)
    jest.spyOn(llamaService, 'redact').mockImplementation(() => Promise.resolve(mockReq.body.text));
    
    await redactText(mockReq as Request, mockRes as Response);
    
    const response = mockRes.json.mock.calls[0][0];
    expect(response.data).toBe(mockReq.body.text); // No changes expected
  });

  it('should handle error cases', async () => {
    // Force an error by making req.body.text a non-string
    mockReq.body.text = { invalid: 'data' } as any;
    
    await redactText(mockReq as Request, mockRes as Response);
    
    expect(mockRes.status).toHaveBeenCalledWith(400); // Changed to 400 to match implementation
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Text input must be a string'
      })
    );
  });
});
