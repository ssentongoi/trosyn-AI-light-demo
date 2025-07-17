import { defineConfig, loadEnv, type ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { UserConfig } from 'vite';
import path from 'path';

// Define the config function with proper return type
const config = ({ mode }: ConfigEnv): UserConfig => {
  // Load env file based on `mode` in the current directory and parent directories
  const env = loadEnv(mode, process.cwd(), '');

  // Configure React with Emotion
  const plugins = [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
  ];
  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    server: {
      port: 3000,
      open: true,
      strictPort: true,
    },
    build: {
      outDir: 'build',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          },
        },
      },
    },
    define: {
      'process.env': {},
      // Support for environment variables in client-side code
      'import.meta.env': JSON.stringify(env),
    },
    optimizeDeps: {
      include: [
        '@mui/material',
        '@mui/icons-material',
        '@emotion/react',
        '@emotion/styled',
        'react',
        'react-dom',
        'react-router-dom',
      ],
      // Force dependency optimization in development
      force: mode === 'development',
    },
  };
};

// Export the config wrapped in defineConfig
export default defineConfig(config);
