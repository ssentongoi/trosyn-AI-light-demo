import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './', // Ensure consistent path resolution
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/frontend/__tests__/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/types/**',
        '**/mocks/**',
        '**/stories/**',
        '**/test-utils/**',
      ],
      include: ['src/frontend/src/**/*.{ts,tsx}'],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    watchExclude: ['**/node_modules/**', '**/dist/**'],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, './src/frontend/src'),
      },
    ],
  },
  plugins: [
    react({
      // Add any React-specific configurations here
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
  ],
});
