// Simple Jest configuration for ESM and TypeScript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  // Skip node_modules transformation except for specific ESM packages
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|fetch-blob)/)',
  ],
  moduleFileExtensions: ['js', 'ts', 'json'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
};
