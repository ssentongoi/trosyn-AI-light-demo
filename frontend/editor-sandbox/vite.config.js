import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Extend the main Vite config
import mainViteConfig from '../vite.config';

export default defineConfig({
  ...mainViteConfig,
  root: __dirname,
  base: './',  // Use relative paths for assets
  plugins: [
    react(),
    ...(mainViteConfig.plugins || []).filter(p => p && p.name !== 'vite:react-babel'),
  ],
  resolve: {
    ...mainViteConfig.resolve,
    alias: {
      ...(mainViteConfig.resolve?.alias || {}),
      // Add any additional aliases needed for the sandbox
    },
  },
  server: {
    port: 3001,  // Different port from main app
    open: true,   // Open browser automatically
  },
  define: {
    'process.env': process.env,
    // Define environment variables
    __IS_BROWSER__: JSON.stringify(true),
    __IS_TAURI__: JSON.stringify(false),
  },
});
