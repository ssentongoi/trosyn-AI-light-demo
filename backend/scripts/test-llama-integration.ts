import { llamaClient } from '../services/llama/llamaClient.js';

async function testSpellcheck() {
  const testCases = [
    'Helo world, how are you todai?',
    'I hav a drem that one day this nation will rise up',
    'The qick brown fox jmps over the lzy dog',
    'This is a test of the emergncy broadcast system',
    'Pleas excuss any typos in this messge'
  ];

  for (const text of testCases) {
    console.log('\n--- Testing spellcheck ---');
    console.log('🔤 Input:', text);
    
    try {
      const startTime = Date.now();
      const result = await llamaClient.spellcheck(text);
      const endTime = Date.now();
      
      console.log('✅ Success!');
      console.log('📝 Original:', result.original);
      console.log('✨ Corrected:', result.corrected);
      console.log('🔍 Corrections:', result.corrections);
      console.log(`⏱️  Time taken: ${endTime - startTime}ms`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Run the test
console.log('🚀 Starting llama.cpp integration test...');
testSpellcheck()
  .then(() => console.log('\n🎉 All tests completed!'))
  .catch(console.error);
