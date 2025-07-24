import { Request, Response } from 'express';
import { formatSpellcheckOutput } from '../../utils/ai/formatOutput.js';
import { llamaService } from '../../services/llama/llamaService.js';
import config from '../../config/aiConfig.json' with { type: 'json' };

export const spellcheckText = async (req: Request, res: Response) => {
  try {
    const { text, language = 'en-US' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text input is required' });
    }

    // Initialize llama service if not already initialized
    await llamaService.initialize();
    
    // Use llama.cpp for spellchecking
    const { corrected, corrections } = await llamaService.spellcheck(text);
    const issues = corrections.map(corr => {
      const offset = text.indexOf(corr.original);
      return {
        type: 'spelling',
        word: corr.original,
        offset,
        length: corr.original.length,
        suggestions: [corr.corrected],
        context: text.substring(
          Math.max(0, offset - 10), 
          Math.min(text.length, offset + corr.original.length + 10)
        )
      };
    });
    const correctedText = corrected;
    
    const formattedOutput = formatSpellcheckOutput(correctedText, issues, {
      language,
      includeTypoCount: true
    });
    
    res.json({
      success: true,
      data: formattedOutput,
      meta: {
        model: config.models.default,
        language,
        issuesFound: issues.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Spellcheck error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check spelling',
      details: errorMessage
    });
  }
};
