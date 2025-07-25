import { Request, Response } from 'express';
import { formatSpellcheckOutput } from '@utils/ai/formatOutput.js';
import { llamaClient } from '@services/llama/llamaClient.js';
import { join } from 'path';
import { readFileSync } from 'fs';

// Define the correction type for the response
interface SpellcheckCorrection {
  original: string;
  corrected: string;
  suggestions: string[];
}

// Define the issue type for the response
interface SpellcheckIssue {
  type: string;
  word: string;
  offset: number;
  length: number;
  message: string;
  suggestions: string[];
}

// Load config synchronously to avoid top-level await
const configPath = join(process.cwd(), 'config/aiConfig.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

export const spellcheckText = async (req: Request, res: Response) => {
  try {
    const { text, language = 'en-US' } = req.body || {};

    // 1. Check if text is missing (undefined or null)
    if (text === undefined || text === null) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for spellchecking',
      });
    }

    // 2. Check if text is not a string
    if (typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text must be a string',
      });
    }

    // 3. Check if text is empty after trimming
    if (!text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for spellchecking',
      });
    }

    // Perform spellcheck using llama.cpp server
    const { corrected, corrections } = await llamaClient.spellcheck(text);

    // Format the successful response
    const issues = corrections.map((corr) => ({
      type: 'spelling' as const,
      word: corr.original,
      offset: text.indexOf(corr.original),
      length: corr.original.length,
      message: `Did you mean ${corr.corrected}?`,
      suggestions: [corr.corrected],
    }));

    const formattedOutput = formatSpellcheckOutput(corrected, issues, {
      language,
      includeTypoCount: true,
    });

    const response = {
      success: true,
      data: {
        original: text,
        corrected,
        corrections: corrections.map((correction) => ({
          word: correction.original,
          suggestion: correction.corrected,
          original: correction.original,
        })),
        language,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Spellcheck error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    // In a test environment, include the full error message for easier debugging
    if (process.env.NODE_ENV === 'test') {
      return res.status(500).json({
        success: false,
        error: `Error in spellcheck endpoint: ${errorMessage}`,
      });
    }

    // In other environments, return a generic error message
    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request',
    });
  }
};
