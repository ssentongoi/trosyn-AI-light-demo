import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'path';

// Base configuration
const baseConfig = {
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
  // Common build configuration
  const buildConfig = {
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
  };

  if (command === 'serve') {
    // Development-specific configuration
    return {
      ...baseConfig,
      server: {
        port: parseInt(process.env.PORT || '3001'),
        strictPort: false, // Allow fallback to next available port
        cors: true,
        hmr: {
          protocol: 'ws',
          host: 'localhost',
          port: parseInt(process.env.PORT || '3001'),
        },
        watch: {
          ignored: ['**/port-manager-debug.log'],
        },
      },
      build: {
        ...buildConfig,
        // Enable source maps for better debugging in development
        sourcemap: true,
      },
    };
  } else {
    // Production-specific configuration
    return {
      ...baseConfig,
      base: './',
      build: {
        ...buildConfig,
        // Minify the output for production
        minify: 'terser',
        // Disable source maps for production (or set to 'hidden')
        sourcemap: false,
      },
    };
  }
});
