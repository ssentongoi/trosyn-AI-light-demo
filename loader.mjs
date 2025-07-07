// Custom ESM Loader for Electron
// This helps with ESM/CJS interop in Electron

import { pathToFileURL, fileURLToPath } from 'url';
import { createRequire } from 'module';

// Create a require function that works in ESM
const require = createRequire(import.meta.url);

// Store the original resolve function
const originalResolve = async (specifier, context, defaultResolve) => {
  return defaultResolve(specifier, context, defaultResolve);
};

// Handle CJS modules in ESM
export async function resolve(specifier, context, defaultResolve) {
  const { parentURL = null } = context;

  // Handle Node.js built-in modules
  if (specifier.startsWith('node:')) {
    return {
      url: specifier,
      format: 'module',
      shortCircuit: true
    };
  }

  // Handle file URLs
  if (specifier.startsWith('file://')) {
    return {
      url: specifier,
      format: 'module',
      shortCircuit: true
    };
  }

  // Handle relative imports
  if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) {
    if (parentURL) {
      try {
        const resolvedUrl = new URL(specifier, parentURL).href;
        return {
          url: resolvedUrl,
          format: 'module',
          shortCircuit: true
        };
      } catch (e) {
        // If we can't resolve it, let the default resolver handle it
      }
    }
  }

  // Let Node.js handle all other specifiers
  return originalResolve(specifier, context, defaultResolve);
}

// Store the original load function
const originalLoad = async (url, context, defaultLoad) => {
  return defaultLoad(url, context, defaultLoad);
};

// Handle loading modules
export async function load(url, context, defaultLoad) {
  // Get the default result first
  const result = await originalLoad(url, context, defaultLoad);
  
  // Handle CJS modules
  if (result.format === 'commonjs') {
    return {
      format: 'module',
      source: `import { createRequire } from 'module';
              const require = createRequire(import.meta.url);
              const module = require('${url}');
              export default module.default || module;`,
      shortCircuit: true
    };
  }
  
  return result;
}
