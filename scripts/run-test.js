// Simple test runner for TypeScript tests using ts-node
import { register } from 'ts-node';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

// Create a require function that works in ES module
const require = createRequire(import.meta.url);

// Register ts-node with ESM support
register({
  transpileOnly: true,
  compilerOptions: {
    module: 'ESNext',
    esModuleInterop: true,
    target: 'es2020',
    moduleResolution: 'node',
    sourceMap: true,
    outDir: './dist',
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*']
    },
    types: ['node', 'mocha', 'chai']
  }
});

// Set test timeout
const timeout = 10000;

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the test file
try {
  // Use dynamic import to load the test file
  const testPath = resolve(__dirname, '../test/main/services/FileWatcherService.test.mts');
  console.log(`Loading test file: ${testPath}`);
  await import(testPath);
  
  // If we get here, the test completed successfully
  console.log('✅ Test completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
}
