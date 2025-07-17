/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tauri-apps/api/tauri': path.resolve(__dirname, './src/__mocks__/@tauri-apps/api/tauri.ts'),
      '@tauri-apps/api/fs': path.resolve(__dirname, './src/__mocks__/@tauri-apps/api/fs.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/types/**',
        '**/mocks/**',
        '**/test-utils/**',
        '**/test-setup.ts',
      ],
    },
    testTimeout: 30000,
  },
});
