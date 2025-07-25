import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['js', 'ts'],
  moduleNameMapper: {
    // Mock configuration files
    '../../config/aiConfig.json': '<rootDir>/tests/__mocks__/config.ts',
    '../config/aiConfig.json': '<rootDir>/tests/__mocks__/config.ts',
    
    // Manual mocks for services
    '../../services/llama/llamaService': '<rootDir>/tests/__mocks__/services/llama/llamaService.ts',
    '../../services/llama/llamaClient': '<rootDir>/tests/__mocks__/services/llama/llamaClient.ts',
    '../../utils/ai/formatOutput': '<rootDir>/tests/__mocks__/utils/ai/formatOutput.ts',
    '../../utils/ai/formatOutput.js': '<rootDir>/tests/__mocks__/utils/ai/formatOutput.ts',
    
    // Relative imports with .js extension
    '../llama/llamaClient.js': '<rootDir>/tests/__mocks__/services/llama/llamaClient.ts',
    './llamaClient.js': '<rootDir>/tests/__mocks__/services/llama/llamaClient.ts',
    '../gemma/gemma3n.js': '<rootDir>/services/gemma/gemma3n.ts',
    
    // Path aliases - handle both with and without .js extension
    '^@routes/(.+)\.js$': '<rootDir>/routes/$1.ts',
    '^@services/(.+)\.js$': '<rootDir>/services/$1.ts',
    '^@utils/(.+)\.js$': '<rootDir>/utils/$1.ts',
    '^@tests/(.+)\.js$': '<rootDir>/tests/$1.ts',
    '^@config/(.+)\.js$': '<rootDir>/config/$1.ts',
    '^@routes/(.+)\.ts$': '<rootDir>/routes/$1.ts',
    '^@services/(.+)\.ts$': '<rootDir>/services/$1.ts',
    '^@utils/(.+)\.ts$': '<rootDir>/utils/$1.ts',
    '^@tests/(.+)\.ts$': '<rootDir>/tests/$1.ts',
    '^@config/(.+)\.ts$': '<rootDir>/config/$1.ts',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: false,
            decorators: true
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true
          }
        },
        module: {
          type: 'es6'
        }
      }
    ],
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|fetch-blob|formdata-polyfill|data-uri-to-buffer|fetch-blob/from|formdata-polyfill/esm\\.min\\.js))'
  ],
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
};

export default config;
