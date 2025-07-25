import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';

// Mock the llamaService module
jest.mock('../../services/llama/llamaService.js', () => {
  return {
    llamaService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      summarize: jest.fn().mockResolvedValue('This is a mock summary'),
      redact: jest.fn().mockResolvedValue('mock [REDACTED] text'),
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
import { summarizeText } from '../../routes/ai/summarize';

describe('Summarize Text Endpoint', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  
  // Create a mock response object
  const createMockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res) as any;
    res.json = jest.fn().mockReturnValue(res) as any;
    return res;
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup request with default values
    mockReq = {
      body: {
        text: 'This is a test text that should be summarized.'
      }
    };
    
    // Setup response mock
    mockRes = createMockResponse();
    
    // Setup default mock implementations
    llamaService.summarize.mockResolvedValue('This is a mock summary');
    llamaService.initialize.mockResolvedValue(undefined);
  });

  it('should return a successful response with a summary', async () => {
    // Arrange
    const mockSummary = 'This is a mock summary';
    llamaService.summarize.mockResolvedValue(mockSummary);
    
    // Act
    await summarizeText(mockReq as Request, mockRes as Response);
    
    // Assert
    expect(llamaService.summarize).toHaveBeenCalledWith(
      mockReq.body.text,
      expect.any(Number)
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      summary: mockSummary
    });
  });

  it('should handle missing text input', async () => {
    // Arrange
    mockReq.body.text = '';
    
    // Act
    await summarizeText(mockReq as Request, mockRes as Response);
    
    // Assert
    expect(llamaService.summarize).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Text input is required',
      details: 'No text was provided for summarization.'
    });
  });

  it('should handle missing request body', async () => {
    // Arrange
    mockReq.body = undefined;
    
    // Act
    await summarizeText(mockReq as Request, mockRes as Response);
    
    // Assert
    expect(llamaService.summarize).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid request format',
      details: 'Request body is missing or invalid.'
    });
  });

  it('should handle service errors', async () => {
    // Arrange
    const error = new Error('Failed to generate summary');
    llamaService.summarize.mockRejectedValueOnce(error);
    
    // Act
    await summarizeText(mockReq as Request, mockRes as Response);
    
    // Assert
    expect(llamaService.summarize).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Failed to generate summary',
      details: error.message
    });
  });

  it('should respect maxLength parameter', async () => {
    // Arrange
    const testMaxLength = 50;
    mockReq.body.maxLength = testMaxLength;
    const mockSummary = 'Short summary';
    llamaService.summarize.mockResolvedValue(mockSummary);
    
    // Act
    await summarizeText(mockReq as Request, mockRes as Response);
    
    // Assert
    expect(llamaService.summarize).toHaveBeenCalledWith(
      mockReq.body.text,
      testMaxLength
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      summary: mockSummary
    });
  });
});
