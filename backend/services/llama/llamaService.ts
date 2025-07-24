import { LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the GGUF model file
const MODEL_PATH = path.join(
  __dirname,
  '../../../shared_data/models/gemma3n/model.gguf'
);

class LlamaService {
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private session: LlamaChatSession | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the Llama model and context
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('Loading Llama model from:', MODEL_PATH);
      
      this.model = new LlamaModel({
        modelPath: MODEL_PATH,
        gpuLayers: 0, // 0 for CPU-only
        contextSize: 2048, // Adjust based on your needs
        batchSize: 512, // Adjust based on your system's capabilities
      });

      this.context = await this.model.createContext();
      this.session = new LlamaChatSession({ context: this.context });
      this.isInitialized = true;
      
      console.log('Llama model loaded successfully');
    } catch (error) {
      console.error('Failed to initialize Llama model:', error);
      throw new Error(`Failed to initialize Llama model: ${error.message}`);
    }
  }

  /**
   * Generate text using the Llama model
   * @param prompt The prompt to generate text from
   * @param maxTokens Maximum number of tokens to generate
   * @param temperature Controls randomness (0.0 to 1.0)
   * @returns Generated text
   */
  async generateText(
    prompt: string,
    maxTokens: number = 500,
    temperature: number = 0.7
  ): Promise<string> {
    if (!this.isInitialized || !this.session) {
      throw new Error('Llama model is not initialized. Call initialize() first.');
    }

    try {
      const response = await this.session.prompt(prompt, {
        maxTokens,
        temperature,
        onToken: (tokens) => {
          // Optional: Handle token streaming
          process.stdout.write(tokens.map(t => t.content).join(''));
        },
      });

      return response;
    } catch (error) {
      console.error('Error generating text:', error);
      throw new Error(`Failed to generate text: ${error.message}`);
    }
  }

  /**
   * Summarize text using the Llama model
   * @param text The text to summarize
   * @param maxLength Maximum length of the summary
   * @returns A summary of the input text
   */
  async summarize(text: string, maxLength: number = 150): Promise<string> {
    const prompt = `Please provide a concise summary of the following text in ${maxLength} words or less. Focus on the main points and key information:\n\n${text}\n\nSummary:`;
    return this.generateText(prompt, 300, 0.5); // Lower temperature for more focused summaries
  }

  /**
   * Redact sensitive information from text
   * @param text The text to redact
   * @returns The redacted text
   */
  async redact(text: string): Promise<string> {
    const prompt = `Please redact or remove any sensitive personal information from the following text, replacing it with [REDACTED]. This includes names, addresses, phone numbers, email addresses, ID numbers, and any other personally identifiable information. Return only the redacted text with no additional commentary.\n\nText to redact:\n${text}\n\nRedacted text:`;
    return this.generateText(prompt, text.length * 2, 0.1); // Very low temperature for precise redaction
  }

  /**
   * Check and correct spelling and grammar in text
   * @param text The text to check
   * @returns The corrected text
   */
  async spellcheck(text: string): Promise<{original: string; corrected: string; corrections: Array<{original: string; corrected: string;}>}> {
    const prompt = `Please analyze the following text for spelling and grammatical errors. Return a JSON object with the following structure:
    {
      "original": "the original text",
      "corrected": "the corrected text with all errors fixed",
      "corrections": [
        {
          "original": "incorrect word or phrase",
          "corrected": "suggested correction"
        }
      ]
    }
    \nText to analyze:\n${text}\n\n`;

    const response = await this.generateText(prompt, 1000, 0.3);
    
    try {
      // Try to parse the response as JSON
      const parsed = JSON.parse(response);
      return {
        original: parsed.original || text,
        corrected: parsed.corrected || text,
        corrections: parsed.corrections || []
      };
    } catch (e) {
      // If JSON parsing fails, return the original text with a note
      console.warn('Failed to parse spellcheck response as JSON, returning original text');
      return {
        original: text,
        corrected: text,
        corrections: []
      };
    }
  }
}

// Export a singleton instance
export const llamaService = new LlamaService();

export default llamaService;
