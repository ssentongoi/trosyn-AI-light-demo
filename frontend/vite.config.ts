import { defineConfig, loadEnv, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tauriPlugin from './plugins/vite-plugin-tauri';

// Environment variables to expose to the client
const clientEnvVars = [
  'APP_NAME',
  'APP_VERSION',
  'API_URL',
  'NODE_ENV',
  'TAURI_DEBUG',
  'TAURI_PLATFORM',
  'TAURI_ARCH',
  'TAURI_FAMILY',
  'TAURI_PLATFORM_VERSION',
  'TAURI_PLATFORM_TYPE',
  'TAURI_CPU_ARCH',
];

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Process environment variables to expose to the client
  const processEnv: Record<string, string> = {};
  clientEnvVars.forEach(key => {
    if (process.env[key] !== undefined) {
      processEnv[`import.meta.env.${key}`] = JSON.stringify(process.env[key]);
    }
  });

  // Add __TAURI__ to the global scope
  processEnv['globalThis.__TAURI__'] = 'window.__TAURI__';

  // Base configuration
  const config: UserConfig = {
    // Define global constants
    define: {
      ...processEnv,
      // Ensure window.__TAURI__ is defined for browser environment
      'window.__TAURI__': 'false',
      // Add other global variables here
      'process.env.NODE_ENV': `'${process.env.NODE_ENV}'`,
    },
    
    // Plugins
    plugins: [
      react({
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['@emotion/babel-plugin'],
        },
      }),
      tauriPlugin(),
    ],
    
    // Module resolution
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    
    // Development server configuration
    server: {
      port: 3000,
      open: false, // Disable automatic browser opening
      strictPort: true,
      cors: true,
      fs: {
        strict: true,
      },
    },
    
    // Build configuration
    build: {
      outDir: 'build',
      sourcemap: true,
      minify: mode === 'production' ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor chunks
            react: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            // Keep editor-related code together
            editor: [
              '@editorjs/editorjs',
              '@editorjs/header',
              '@editorjs/list',
              '@editorjs/checklist',
              '@editorjs/quote',
              '@editorjs/code',
              '@editorjs/embed',
              '@editorjs/table',
              '@editorjs/warning',
              '@editorjs/marker',
              '@editorjs/inline-code',
              '@editorjs/underline',
            ],
          },
        },
      },
    },
    
    // Base URL for the application
    base: '/',
    
    // Public directory for static assets
    publicDir: 'public',
    
    // Optimize deps for faster development
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
  };

  return config;
});
