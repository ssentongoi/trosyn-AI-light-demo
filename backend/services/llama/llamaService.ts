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

    // Initialize the underlying client first
    await this.client.initialize();
    
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

    // Use a more structured prompt format that worked well in testing
    const prompt = `[INST] <<SYS>>You are a helpful AI assistant that creates concise summaries.<</SYS>>

Summarize the following text in ${maxLength} words or less. Focus on the main points and key details:

${text}

Summary:[/INST]`;
    
    try {
      const summary = await this.generateText(prompt, maxLength * 2, 0.3);
      // Clean up the response by removing any remaining instructions or artifacts
      return summary
        .replace(/^\s*Summary:\s*/i, '')
        .replace(/\[\/INST\].*$/is, '')
        .trim();
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

    // Use a more structured prompt with clear instructions
    const prompt = `[INST] <<SYS>>You are a security assistant that redacts sensitive information from text.<</SYS>>

Redact all instances of the following sensitive information by replacing them with [REDACTED]:
${sensitiveInfo.map((item, i) => `- ${item}`).join('\n')}

Text to redact:
${text}

Redacted text:[/INST]`;
    
    try {
      const redacted = await this.generateText(prompt, text.length * 2, 0.1);
      // Clean up the response
      const cleaned = redacted
        .replace(/^\s*Redacted text:\s*/i, '')
        .replace(/\[\/INST\].*$/is, '')
        .trim();
      
      // Verify that all sensitive info was actually redacted
      const allRedacted = sensitiveInfo.every(info => 
        !cleaned.toLowerCase().includes(info.toLowerCase())
      );
      
      return allRedacted ? cleaned : text; // Fallback to original if redaction failed
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

    // Use a more structured prompt with examples
    const prompt = `[INST] <<SYS>>You are a helpful assistant that corrects spelling and grammar errors in text. Return a valid JSON object with the following structure:
{
  "original": "original text here",
  "corrected": "corrected text here",
  "corrections": [
    {"original": "incorrect word", "corrected": "corrected word"}
  ]
}
<</SYS>>

Correct any spelling or grammar errors in the following text. Return only the JSON object with no other text.

Text to correct: "${text.replace(/"/g, '\\"')}"

JSON response:[/INST]`;

    try {
      const response = await this.generateText(prompt, Math.min(2048, text.length * 3), 0.2);
      
      // Try to parse the response as JSON
      try {
        // Extract JSON from the response (handling potential extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            original: result.original || text,
            corrected: result.corrected || text,
            corrections: Array.isArray(result.corrections) 
              ? result.corrections.filter((c: any) => c.original && c.corrected)
              : []
          };
        }
      } catch (parseError) {
        console.error('Error parsing spellcheck response:', parseError);
      }

      // Fallback to simple correction without structured data
      return {
        original: text,
        corrected: text, // Don't use raw response as it might be malformed
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
