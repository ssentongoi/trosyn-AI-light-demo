import axios from 'axios';

const API_BASE_URL = '/api/ai';

interface AITaskResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    model: string;
    [key: string]: any;
  };
}

interface SummaryOptions {
  maxLength?: number;
  includeBullets?: boolean;
  language?: string;
}

interface RedactionOptions {
  redactionTypes?: string[];
  replacement?: string;
}

interface SpellcheckOptions {
  language?: string;
  includeTypoCount?: boolean;
}

/**
 * Generate a summary of the provided text
 */
export const summarizeText = async (
  text: string, 
  options: SummaryOptions = {}
): Promise<AITaskResponse<string>> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/summarize`, {
      text,
      options
    });
    return response.data;
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      success: false,
      data: '',
      error: 'Failed to generate summary',
      meta: { model: 'error' }
    };
  }
};

/**
 * Redact sensitive information from the provided text
 */
export const redactText = async (
  text: string,
  options: RedactionOptions = {}
): Promise<AITaskResponse<string>> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/redact`, {
      text,
      ...options
    });
    return response.data;
  } catch (error) {
    console.error('Error redacting text:', error);
    return {
      success: false,
      data: text, // Return original text on error
      error: 'Failed to redact text',
      meta: { model: 'error' }
    };
  }
};

/**
 * Check and correct spelling in the provided text
 */
export const spellcheckText = async (
  text: string,
  options: SpellcheckOptions = {}
): Promise<AITaskResponse<{
  original: string;
  corrected: string;
  issues: Array<{
    offset: number;
    length: number;
    type: string;
    word: string;
    suggestions: string[];
  }>;
  issueCount: number;
}>> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/spellcheck`, {
      text,
      ...options
    });
    return response.data;
  } catch (error) {
    console.error('Error checking spelling:', error);
    return {
      success: false,
      data: {
        original: text,
        corrected: text,
        issues: [],
        issueCount: 0
      },
      error: 'Failed to check spelling',
      meta: { model: 'error' }
    };
  }
};

/**
 * Generic AI task execution
 */
export const executeAITask = async <T>(
  task: 'summarize' | 'redact' | 'spellcheck',
  text: string,
  options: any = {}
): Promise<AITaskResponse<T>> => {
  const taskMap = {
    summarize: summarizeText,
    redact: redactText,
    spellcheck: spellcheckText
  };
  
  const taskFn = taskMap[task];
  if (!taskFn) {
    throw new Error(`Unknown AI task: ${task}`);
  }
  
  return taskFn(text, options) as Promise<AITaskResponse<T>>;
};
