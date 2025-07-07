import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

// Configuration for Vite
const config = {
  plugins: [vue()],
  base: './', // Required for proper loading of assets in production
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/renderer', import.meta.url)),
      // Add any other aliases here
    },
    // Ensure Node.js built-in modules are properly resolved
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      // Handle Node.js built-in modules and globals
      external: ['electron', 'fs', 'path', 'os', 'crypto'],
    },
    // Ensure CSS is properly extracted and processed
    cssCodeSplit: true,
    // Target ES2020 for better compatibility with modern JavaScript features
    target: 'es2020',
    // Enable source maps for better debugging
    sourcemap: true,
  },
  server: {
    port: 3001,
    strictPort: true,
    // Enable CORS for development
    cors: true,
    // Configure HMR for Electron
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3001,
    },
  },
  // Configure the development server to proxy API requests
  define: {
    'process.env': {},
    // Add any other global variables here
  },
  // Optimize dependencies for better performance
  optimizeDeps: {
    include: ['vue', 'pinia'], // Add any other dependencies that need to be optimized
    exclude: ['@electron-toolkit/utils'], // Exclude any problematic dependencies
  },
};

export default defineConfig(({ command, mode }) => {
  // Customize the configuration based on the command and mode
  if (command === 'serve') {
    // Development-specific configuration
    return {
      ...config,
      // Add any development-specific overrides here
    };
  } else {
    // Production-specific configuration
    return {
      ...config,
      // Add any production-specific overrides here
      base: './',
      build: {
        ...config.build,
        // Minify the output for production
        minify: 'terser',
        // Generate source maps for production (optional)
        sourcemap: false,
      },
    };
  }
});
