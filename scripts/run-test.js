// Simple test runner for TypeScript tests using ts-node
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    target: 'es2020',
    module: 'commonjs',
    esModuleInterop: true,
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

const { resolve } = require('path');
const { glob } = require('glob');

// Configure Mocha
const Mocha = require('mocha');
const mocha = new Mocha({
  timeout: 10000,
  reporter: 'spec',
  ui: 'bdd',
  color: true
});

// Find all test files
const testDir = resolve(__dirname, '..', 'test');
const testFiles = glob.sync('**/*.test.{js,ts}', { cwd: testDir });

if (testFiles.length === 0) {
  console.log('No test files found in', testDir);
  process.exit(0);
}

console.log('Found test files:', testFiles);

// Add test files to Mocha
testFiles.forEach((file) => {
  const filePath = resolve(testDir, file);
  console.log('Adding test file:', filePath);
  mocha.addFile(filePath);
});

// Run the tests
console.log('Starting test run...');
mocha.run((failures) => {
  console.log('Test run completed with', failures, 'failures');
  process.exitCode = failures ? 1 : 0;
});
