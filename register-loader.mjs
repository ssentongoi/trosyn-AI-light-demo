// Register the custom ESM loader
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register the loader
register('./loader.mjs', pathToFileURL('./'));

// Re-export the loader for direct imports
export * from './loader.mjs';
