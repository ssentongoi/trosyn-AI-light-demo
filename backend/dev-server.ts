// Register the TypeScript module loader
import { register } from 'module';
import { pathToFileURL } from 'url';

// Enable ES module support
register('ts-node/esm', pathToFileURL('./'));

// Import the main app after setting up the loader
import('./index.js').catch(console.error);
