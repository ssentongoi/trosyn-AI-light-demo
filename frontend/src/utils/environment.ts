/**
 * Environment detection utilities
 */

// Check if running in Tauri desktop environment
export const isTauri = () => {
  return window && window.__TAURI__ !== undefined;
};

// Check if running in a browser
export const isBrowser = () => !isTauri();

// Get environment name for display purposes
export const getEnvironment = () => {
  return isTauri() ? 'desktop' : 'browser';
};
