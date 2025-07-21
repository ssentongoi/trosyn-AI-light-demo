// Vite plugin to handle Tauri imports in browser environment
const tauriPlugin = () => ({
  name: 'vite-plugin-tauri',
  config: () => ({
    define: {
      // Define a global that indicates we're in a browser environment
      'window.__TAURI__': 'false',
    },
  }),
  resolveId(source) {
    // Handle Tauri imports in browser environment
    if (source.startsWith('@tauri-apps/api/')) {
      return {
        id: source,
        external: false,
        moduleSideEffects: true,
        // Return empty module for browser environment
        load: () => 'export default {};',
      };
    }
    return null;
  },
});

export default tauriPlugin;
