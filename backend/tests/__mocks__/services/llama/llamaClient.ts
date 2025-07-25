import { jest } from '@jest/globals';

// Mock implementation of the LlamaClient
export class LlamaClient {
  baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Mock methods
  async summarize(text: string, maxLength?: number): Promise<string> {
    return 'This is a mock summary from LlamaClient';
  }

  async redact(text: string, redactionTypes?: string[]): Promise<string> {
    return 'This is a mock redacted text with [REDACTED] placeholders';
  }

  async spellcheck(text: string): Promise<{
    original: string;
    corrected: string;
    corrections: Array<{ original: string; corrected: string; start: number; end: number }>;
  }> {
    // Check for common typos
    const corrections = [];
    let corrected = text;
    
    // Replace 'quik' with 'quick'
    if (text.toLowerCase().includes('quik')) {
      const start = text.toLowerCase().indexOf('quik');
      corrections.push({
        original: text.substring(start, start + 4),
        corrected: 'quick',
        start,
        end: start + 4
      });
      corrected = corrected.replace(/quik/i, 'quick');
    }
    
    // Replace 'jumpped' with 'jumped'
    if (text.toLowerCase().includes('jumpped')) {
      const start = text.toLowerCase().indexOf('jumpped');
      corrections.push({
        original: text.substring(start, start + 7),
        corrected: 'jumped',
        start,
        end: start + 7
      });
      corrected = corrected.replace(/jumpped/i, 'jumped');
    }
    
    // Replace 'lazi' with 'lazy'
    if (text.toLowerCase().includes('lazi')) {
      const start = text.toLowerCase().indexOf('lazi');
      corrections.push({
        original: text.substring(start, start + 4),
        corrected: 'lazy',
        start,
        end: start + 4
      });
      corrected = corrected.replace(/lazi/i, 'lazy');
    }
    
    return {
      original: text,
      corrected: corrected,
      corrections: corrections
    };
  }

  async generateText(prompt: string): Promise<string> {
    return 'This is mock generated text from LlamaClient';
  }
}

// Export an instance of the LlamaClient class to match the real implementation
export const llamaClient = new LlamaClient('http://mock-llama-server');

export default { LlamaClient, llamaClient };
