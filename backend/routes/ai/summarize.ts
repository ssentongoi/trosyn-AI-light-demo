import { Request, Response } from 'express';
import { formatSummaryOutput } from '../../utils/ai/formatOutput.js';
import { llamaService } from '../../services/llama/llamaService.js';
import config from '../../config/aiConfig.json' with { type: 'json' };

export const summarizeText = async (req: Request, res: Response) => {
  try {
    const { text, options } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text input is required' });
    }

    // Initialize llama service if not already initialized
    await llamaService.initialize();
    
    // Use llama.cpp for summarization
    const summary = await llamaService.summarize(text, options?.maxLength || 300);
    
    const formattedOutput = formatSummaryOutput(summary, options);
    
    res.json({
      success: true,
      data: formattedOutput,
      meta: {
        model: config.models.default,
        tokens: summary.length / 4, // Rough estimate
        timestamp: new Date().toISOString()
      }
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
