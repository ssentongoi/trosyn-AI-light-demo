import { LlamaClient } from '../services/llama/llamaClient.js';

const client = new LlamaClient('http://localhost:8080/completion');

const TEST_TEXT = 'The quick brown fox jumps over the lazy dog. This is a well-known pangram that contains every letter of the English alphabet at least once. It is often used for touch-typing practice, testing typewriters and computer keyboards, and displaying examples of fonts.';

const PROMPT_VARIANTS = [
  // Basic instruction
  {
    name: 'Basic instruction',
    prompt: `Please summarize the following text in 50 words or less:\n\n${TEST_TEXT}`
  },
  // More explicit instruction
  {
    name: 'Explicit instruction',
    prompt: `I need a concise summary of the following text. The summary should be no more than 50 words.\n\nText: ${TEST_TEXT}\n\nSummary:`
  },
  // Few-shot example
  {
    name: 'Few-shot example',
    prompt: `Example 1:
Text: The cat sat on the mat. The mat was red and the cat was black.
Summary: A black cat sat on a red mat.

Example 2:
Text: ${TEST_TEXT}\nSummary:`
  },
  // Question format
  {
    name: 'Question format',
    prompt: `What is a brief summary of the following text? (max 50 words)\n\n${TEST_TEXT}\n\nSummary:`
  },
  // System message style
  {
    name: 'System message style',
    prompt: `[INST] <<SYS>>You are a helpful AI assistant that creates concise summaries.<</SYS>>\n\nSummarize the following text in 50 words or less:\n\n${TEST_TEXT}[/INST]`
  }
];

async function testPromptFormats() {
  for (const variant of PROMPT_VARIANTS) {
    console.log(`\n=== Testing prompt variant: ${variant.name} ===`);
    console.log('Prompt:', JSON.stringify(variant.prompt, null, 2));
    
    try {
      const startTime = Date.now();
      const response = await client.complete({
        prompt: variant.prompt,
        n_predict: 100,
        temperature: 0.3,
      });
      
      console.log('Response:', JSON.stringify(response, null, 2));
      console.log(`Response time: ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Error:', error);
    }
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testPromptFormats().catch(console.error);
