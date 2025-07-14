import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

executeCommand({
  command: 'npm install --save-dev @testing-library/user-event @testing-library/dom @testing-library/jest-dom @testing-library/react @testing-library/react-hooks @types/jest @types/node @types/react @types/react-dom @types/testing-library__jest-dom @vitejs/plugin-react jsdom ts-node typescript vite-tsconfig-paths vitest @tanstack/react-query',
  cwd: '/Users/ssentongoivan/CascadeProjects/trosyn-ai/frontend',
  safeToAutoRun: true
});

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/__fixtures__/**',
      '**/__mocks__/**',
      '**/__snapshots__/**',
      '**/coverage/**',
      '**/public/**',
      '**/storybook-static/**',
      '**/templates/**',
      '**/test-results/**',
      '**/tsup.config.*',
      '**/vite.config.*',
      '**/vitest.config.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/types/**',
        '**/mocks/**',
        '**/stories/**',
        '**/test-utils/**',
        '**/test-setup.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    watch: false,
    reporters: ['default'],
    logHeapUsage: true,
    logHeapUsageInterval: 1000,
    isolate: true,
    singleThread: false,
    maxConcurrency: 5,
    maxThreads: 5,
    minThreads: 1,
    threads: true,
    useAtomics: true,
    fileParallelism: true,
    sequence: {
      shuffle: false,
      concurrent: true,
      hooks: 'stack',
      setupFiles: 'list',
      teardownFiles: 'list',
    },
    typecheck: {
      enabled: true,
      include: ['src/**/*.{test,spec}-d.cts'],
    },
    snapshotFormat: {
      printBasicPrototype: true,
    },
    restoreMocks: true,
    forceRerunTriggers: [
      '**/package.json/**',
      '**/vitest.config.*/**',
      '**/vite.config.*/**',
    ],
    update: false,
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
    ],
    clearMocks: true,
    mockReset: true,
    testNamePattern: '',
    retry: 0,
    bail: 0,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
