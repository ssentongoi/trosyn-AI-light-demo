import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory path
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react({
    // Use the new JSX runtime
    jsxRuntime: 'automatic',
    jsxImportSource: '@emotion/react',
    // Disable Fast Refresh in test environment
    fastRefresh: false,
  })],
  test: {
    // Use our custom test environment
    environment: './test/custom-test-environment.js',
    // Disable test isolation for React 18+ compatibility
    testIsolation: false,
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{js,jsx,ts,tsx}'],
    deps: {
      // Inline MUI and other problematic packages
      inline: [
        '@mui/material',
        '@emotion/react',
        '@emotion/styled',
        'resize-observer-polyfill'
      ],
    },
    // Enable test coverage
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/**',
        '**/*.d.ts',
        '**/types.ts',
      ],
    },
    // Handle TypeScript paths
    resolve: {
      alias: [
        {
          find: /^@\/(.*)/,
          replacement: path.resolve(__dirname, 'src/frontend/src/$1'),
        },
      ],
    },
    // Environment variables
    env: {
      NODE_ENV: 'test',
    },
    // Watch mode options
    watch: false,
    // Threads can cause issues with some test setups
    threads: false,
    // Isolate environment for each test file
    isolate: true,
  },
  // Project root
  root: __dirname,
  // Base public path
  base: '/',
  // Development server configuration
  server: {
    port: 3001,
    strictPort: true,
    open: false,
  },
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['@emotion/react', '@emotion/styled'],
  },
});
