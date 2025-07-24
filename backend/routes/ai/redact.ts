import { Request, Response } from 'express';
import { formatRedactionOutput } from '../../utils/ai/formatOutput.js';
import { llamaService } from '../../services/llama/llamaService.js';
import config from '../../config/aiConfig.json' with { type: 'json' };

export const redactText = async (req: Request, res: Response) => {
  try {
    const { text, redactionTypes = ['pii', 'sensitive'] } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text input is required' });
    }

    // Initialize llama service if not already initialized
    await llamaService.initialize();
    
    // Use llama.cpp for redaction
    const redacted = await llamaService.redact(text);
    
    const formattedOutput = formatRedactionOutput(redacted, {
      redactionTypes,
      replacement: '[REDACTED]'
    });
    
    res.json({
      success: true,
      data: formattedOutput,
      meta: {
        model: config.models.default,
        redactionTypes,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Redaction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ 
      success: false, 
      error: 'Failed to redact text',
      details: errorMessage
    });
  }
};
