// Simplified Jest configuration for ESM + TypeScript
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],

  // Transform TypeScript (ESM) and JS via babel-jest for node-fetch
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
    '^.+\\.m?jsx?$': 'babel-jest',
  },

  // Do not ignore specific ESM-only packages
  transformIgnorePatterns: [
    '/node_modules/(?!(node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill)/)'
  ],

  // Map .js imports in source/tests to .ts files
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@routes/(.*)\\.js$': '<rootDir>/routes/$1.ts',
    '^@services/(.*)\\.js$': '<rootDir>/services/$1.ts',
    '^@utils/(.*)\\.js$': '<rootDir>/utils/$1.ts',
    '^@tests/(.*)\\.js$': '<rootDir>/tests/$1.ts',
    '^@config/(.*)\\.js$': '<rootDir>/config/$1.ts',
  },

  // Setup (optional, keep empty array if not used)
  setupFilesAfterEnv: [],
};
// Duplicate configuration block removed
  // Tell Jest this is an ESM project
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  
  // Handle TypeScript files with ESM support
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      isolatedModules: true,
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // Module resolution with path aliases
  moduleNameMapper: {
    // Map path aliases with .js extension to .ts files for ESM
    '^@routes/(.*)\.js$': '<rootDir>/routes/$1.ts',
    '^@services/(.*)\.js$': '<rootDir>/services/$1.ts',
    '^@utils/(.*)\.js$': '<rootDir>/utils/$1.ts',
    '^@tests/(.*)\.js$': '<rootDir>/tests/$1.ts',
    '^@config/(.*)\.js$': '<rootDir>/config/$1.ts',
    
    // Handle relative imports with .js extension
    '^(\.{1,2}/.*)\.js$': '$1',

    // Fallback rules for non-extension imports
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',

    // Mock configuration files
    '../../config/aiConfig.json': '<rootDir>/tests/__mocks__/config.ts',
    '../config/aiConfig.json': '<rootDir>/tests/__mocks__/config.ts',
  },
  // Ignore transforming all node_modules except specific ESM-only packages
  transformIgnorePatterns: ['/node_modules/(?!node-fetch|fetch-blob|formdata-polyfill|data-uri-to-buffer)/'],
  /* Removing duplicate transform block below */
  _DUPLICATE_REMOVED_MARKER_
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          baseUrl: '.',
          paths: {
            '@routes/*': ['routes/*'],
            '@services/*': ['services/*'],
            '@utils/*': ['utils/*'],
            '@tests/*': ['tests/*']
          },
          types: ['node', 'jest']
        },
      },
    ],
    // Transform node-fetch to use CommonJS
    '^.+\\.m?jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill)/'
  ],
  // Enable ESM support
  extensionsToTreatAsEsm: ['.ts'],
  // Handle ESM modules in node_modules
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
};
