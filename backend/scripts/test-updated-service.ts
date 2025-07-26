import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Workaround for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import the service
import { llamaService } from '../services/llama/llamaService.js';

// Test text for summarization
const TEST_TEXT = `The quick brown fox jumps over the lazy dog. 
This is a well-known pangram that contains every letter of the English alphabet at least once. 
It is often used for touch-typing practice, testing typewriters and computer keyboards, 
and displaying examples of fonts.`;

// Test text for redaction
const REDACT_TEXT = `John Doe's email is john.doe@example.com and his phone number is (555) 123-4567. 
He lives at 123 Main St, Anytown, USA.`;

// Test text for spellcheck
const SPELLCHECK_TEXT = 'The quik brown fox jumpped over the lazi dog.';

async function testUpdatedService() {
  try {
    console.log('Initializing LlamaService...');
    await llamaService.initialize();
    
    // Test summarization
    console.log('\n=== Testing Summarization ===');
    const summary = await llamaService.summarize(TEST_TEXT, 50);
    console.log('Summary:', summary);
    
    // Test redaction
    console.log('\n=== Testing Redaction ===');
    const sensitiveInfo = ['john.doe@example.com', '(555) 123-4567', '123 Main St, Anytown, USA'];
    const redacted = await llamaService.redact(REDACT_TEXT, sensitiveInfo);
    console.log('Redacted Text:', redacted);
    
    // Test spellcheck
    console.log('\n=== Testing Spellcheck ===');
    const spellcheck = await llamaService.spellcheck(SPELLCHECK_TEXT);
    console.log('Original:', spellcheck.original);
    console.log('Corrected:', spellcheck.corrected);
    console.log('Corrections:', JSON.stringify(spellcheck.corrections, null, 2));
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error in test:', error);
    process.exit(1);
  }
}

testUpdatedService();
