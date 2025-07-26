import { LlamaClient } from '../services/llama/llamaClient.js';

async function testLlamaClient() {
  const client = new LlamaClient('http://localhost:8080/completion');
  
  console.log('Testing simple completion...');
  try {
    const response = await client.complete({
      prompt: 'Hello, how are you?',
      n_predict: 20,
      temperature: 0.7,
    });
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error testing completion:', error);
  }

  console.log('\nTesting summarization prompt...');
  try {
    const text = 'The quick brown fox jumps over the lazy dog. This is a well-known pangram that contains every letter of the English alphabet at least once. It is often used for touch-typing practice, testing typewriters and computer keyboards, and displaying examples of fonts.';
    const prompt = `Please summarize the following text in 50 words or less:\n\n${text}`;
    
    const response = await client.complete({
      prompt,
      n_predict: 50,
      temperature: 0.3,
    });
    console.log('Summarization response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error testing summarization:', error);
  }
}

testLlamaClient().catch(console.error);
