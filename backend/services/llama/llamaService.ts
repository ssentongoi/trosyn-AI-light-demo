import { LlamaClient } from './llamaClient.js';

// Configuration for the LLM service
const DEFAULT_CONFIG = {
  serverUrl: process.env.LLAMA_SERVER_URL || 'http://localhost:8080/completion',
  timeout: 120000, // 2 minutes
} as const;

export interface SpellcheckResult {
  original: string;
  corrected: string;
  corrections: Array<{ original: string; corrected: string }>;
}

class LlamaService {
  private client: LlamaClient;
  private isInitialized: boolean = false;

  constructor(config: { serverUrl?: string; timeout?: number } = {}) {
    this.client = new LlamaClient(
      config.serverUrl || DEFAULT_CONFIG.serverUrl,
      config.timeout || DEFAULT_CONFIG.timeout
    );
  }

  /**
   * Initialize the Llama service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Test the connection to the LLM server
      await this.client.complete({
        prompt: 'Hello',
        n_predict: 5,
        temperature: 0.7,
      });
      
      this.isInitialized = true;
      console.log('LlamaService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LlamaService:', error);
      throw error;
    }
  }

  /**
   * Generate text using the LLM
   */
  async generateText(
    prompt: string,
    maxTokens: number = 100,
    temperature: number = 0.7
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('LlamaService not initialized. Call initialize() first.');
    }

    try {
      const response = await this.client.complete({
        prompt,
        n_predict: maxTokens,
        temperature,
      });

      return response.content;
    } catch (error) {
      console.error('Error generating text:', error);
      throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Summarize the given text
   */
  async summarize(
    text: string,
    maxLength: number = 100
  ): Promise<string> {
    if (!text || text.trim().length === 0) {
      return '';
    }

    const prompt = `Please summarize the following text in ${maxLength} words or less:\n\n${text}`;
    
    try {
      return await this.generateText(prompt, maxLength, 0.3);
    } catch (error) {
      console.error('Error summarizing text:', error);
      // Fallback to simple truncation
      return text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text;
    }
  }

  /**
   * Redact sensitive information from the text
   */
  async redact(
    text: string,
    sensitiveInfo: string[] = []
  ): Promise<string> {
    if (!text || text.trim().length === 0) {
      return '';
    }

    if (sensitiveInfo.length === 0) {
      return text; // Nothing to redact
    }

    const prompt = `Please redact the following sensitive information from the text: ${sensitiveInfo.join(', ')}. ` +
                  `Replace each occurrence with [REDACTED]. Here's the text:\n\n${text}`;
    
    try {
      return await this.generateText(prompt, text.length * 2, 0.1);
    } catch (error) {
      console.error('Error redacting text:', error);
      // Fallback to simple replacement
      let result = text;
      sensitiveInfo.forEach(info => {
        const regex = new RegExp(escapeRegExp(info), 'gi');
        result = result.replace(regex, '[REDACTED]');
      });
      return result;
    }
  }

  /**
   * Check and correct spelling in the given text
   */
  async spellcheck(
    text: string
  ): Promise<SpellcheckResult> {
    if (!text || text.trim().length === 0) {
      return {
        original: text,
        corrected: text,
        corrections: []
      };
    }

    const prompt = `Please correct any spelling or grammar errors in the following text. ` +
                  `Return a JSON object with the original text, corrected text, ` +
                  `and an array of corrections with original and corrected words.\n\n` +
                  `Text: "${text}"`;

    try {
      const response = await this.generateText(prompt, Math.min(1024, text.length * 2), 0.3);
      
      // Try to parse the response as JSON
      try {
        // Extract JSON from the response (handling potential extra text)
        const jsonMatch = response.match(/\{.*\}/s);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            original: result.original || text,
            corrected: result.corrected || text,
            corrections: Array.isArray(result.corrections) 
              ? result.corrections 
              : []
          };
        }
      } catch (parseError) {
        console.error('Error parsing spellcheck response:', parseError);
      }

      // Fallback if JSON parsing fails
      return {
        original: text,
        corrected: response,
        corrections: []
      };
    } catch (error) {
      console.error('Error in spellcheck:', error);
      return {
        original: text,
        corrected: text,
        corrections: []
      };
    }
  }
}

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export a singleton instance
export const llamaService = new LlamaService();

export default llamaService;
