import { Request, Response } from 'express';
import { formatSummaryOutput } from '../../utils/ai/formatOutput.js';
import { llamaService } from '../../services/llama/llamaService.js';
import config from '../../config/aiConfig.json' with { type: 'json' };

export const summarizeText = async (req: Request, res: Response) => {
  try {
    // Check if request body exists
    if (!req.body) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: 'Request body is missing or invalid.'
      });
    }

    const { text, maxLength } = req.body;
    
    // Check if text is provided
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text input is required',
        details: 'No text was provided for summarization.'
      });
    }

    // Initialize llama service if not already initialized
    await llamaService.initialize();
    
    // Use llama.cpp for summarization with default maxLength of 300 if not specified
    const summary = await llamaService.summarize(text, maxLength || 300);
    
    // Return the summary directly as expected by tests
    return res.status(200).json({
      success: true,
      summary: summary
    });
  } catch (error) {
    console.error('Summarization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate summary',
      details: errorMessage
    });
  }
};
