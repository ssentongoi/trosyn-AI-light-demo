// Use dynamic import for ESM compatibility
const fetch = (await import('node-fetch')).default;

const LLAMA_SERVER_URL = process.env.LLAMA_SERVER_URL || 'http://localhost:8080/completion';
const DEFAULT_TIMEOUT = 120000; // 120 seconds (2 minutes) - increased for model loading

interface LlamaCompletionParams {
  prompt: string;
  n_predict?: number;
  temperature?: number;
  stop?: string[];
  top_k?: number;
  top_p?: number;
  repeat_penalty?: number;
}

interface LlamaServerResponse {
  content: string;
  model?: string;
  stop?: string;
  stopping_word?: string;
  timings?: {
    predicted_ms: number;
    predicted_n: number;
    prompt_ms: number;
  };
  [key: string]: unknown; // Allow for additional properties
}

interface LlamaCompletionResponse {
  content: string;
  model: string;
  prompt: string;
  stopped_eos: boolean;
  stopped_limit: boolean;
  stopped_word: boolean;
  stopping_word: string;
  timings: {
    predicted_ms: number;
    predicted_n: number;
    prompt_ms: number;
    sample_ms: number;
  };
}

export class LlamaClient {
  private serverUrl: string;
  private timeout: number;

  constructor(serverUrl: string = LLAMA_SERVER_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.serverUrl = serverUrl;
    this.timeout = timeout;
  }

  async complete(params: LlamaCompletionParams): Promise<LlamaCompletionResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    console.log(`\n--- Starting LLM completion at ${new Date().toISOString()} ---`);
    console.log('Params:', JSON.stringify({
      ...params,
      prompt: params.prompt.length > 100 ? 
        `${params.prompt.substring(0, 100)}...` : params.prompt
    }, null, 2));

    try {
      const requestBody = {
        n_predict: 256,
        ...params
      };

      console.log('Sending request to LLM server:', this.serverUrl);
      console.log('Request body:', JSON.stringify({
        ...requestBody,
        prompt: requestBody.prompt.length > 100 ? 
          `${requestBody.prompt.substring(0, 100)}...` : requestBody.prompt
      }, null, 2));

      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM server error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData: LlamaServerResponse = await response.json() as LlamaServerResponse;
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`\n--- Received LLM response (${duration}ms) ---`);
      console.log('Response status:', response.status, response.statusText);
      // Log response data safely
      const loggableResponse = {
        content: responseData.content ? 
          `${responseData.content.substring(0, 200)}${responseData.content.length > 200 ? '...' : ''}` : 
          'EMPTY RESPONSE',
        model: responseData.model || 'unknown',
        stop: responseData.stop,
        stopping_word: responseData.stopping_word,
        timings: responseData.timings
      };
      console.log('Response data:', JSON.stringify(loggableResponse, null, 2));
      
      // Extract content flexibly (support variations)
      const extractedContent = (responseData as any).content ?? (responseData as any).text ?? (responseData as any).response ?? (responseData as any).choices?.[0]?.text ?? "";
      
      // Always return a valid response, even if content is empty
      return {
        content: extractedContent,
        model: responseData.model || 'unknown',
        prompt: params.prompt,
        stopped_eos: responseData.stop === 'eos',
        stopped_limit: false, // Not directly available in response
        stopped_word: responseData.stop === 'stop',
        stopping_word: responseData.stopping_word || '',
        timings: {
          predicted_ms: responseData.timings?.predicted_ms || 0,
          predicted_n: responseData.timings?.predicted_n || 0,
          prompt_ms: responseData.timings?.prompt_ms || 0,
          sample_ms: 0 // Not directly available in response
        }
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error('LLM request timed out');
      }
      throw error;
    }
  }

  async spellcheck(text: string): Promise<{
    original: string;
    corrected: string;
    corrections: Array<{ original: string; corrected: string }>;
  }> {
    console.log('\n--- Starting spellcheck ---');
    console.log('Input text:', text);
    
    // Minimal one-line prompt (LLM-compatible)
    const prompt = `Correct: ${text}`;

    try {
      console.log('Sending request to LLM...');
      const response = await this.complete({
        prompt,
        n_predict: 64
      });

      console.log('Raw LLM response content:', response.content);
      
      // Clean up the response
      let correctedText = response.content.trim();
      
      // If the response is empty or just whitespace, use the original text
      if (!correctedText) {
        console.warn('Empty response from LLM, using original text');
        correctedText = text;
      }
      
      // Remove any surrounding quotes if present
      if ((correctedText.startsWith('"') && correctedText.endsWith('"')) || 
          (correctedText.startsWith("'") && correctedText.endsWith("'"))) {
        correctedText = correctedText.slice(1, -1);
      }
      
      console.log('Cleaned corrected text:', correctedText);
      
      // Simple diff to find corrections
      const corrections: Array<{ original: string, corrected: string }> = [];
      const originalWords = text.split(/\s+/);
      const correctedWords = correctedText.split(/\s+/);
      
      // Word-by-word comparison to find corrections
      for (let i = 0; i < Math.min(originalWords.length, correctedWords.length); i++) {
        if (originalWords[i] !== correctedWords[i]) {
          corrections.push({
            original: originalWords[i],
            corrected: correctedWords[i]
          });
        }
      }
      
      // Handle case where the corrected text has different number of words
      if (originalWords.length !== correctedWords.length) {
        console.log('Note: Original and corrected text have different word counts');
      }
      
      console.log('Detected corrections:', corrections);
      
      const result = {
        original: text,
        corrected: correctedText || text, // Fallback to original if empty
        corrections: corrections,
        // Aliases for legacy/test compatibility
        text: correctedText || text,
        issues: corrections
      };
      
      console.log('Final result:', JSON.stringify(result, null, 2));
      return result;
      
    } catch (error) {
      console.error('Error in spellcheck:', error);
      // Fallback to returning the original text if there's an error
      return {
        original: text,
        corrected: text,
        corrections: []
      };
    }
  }
}

export const llamaClient = new LlamaClient();
