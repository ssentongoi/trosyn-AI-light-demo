/**
 * Environment detection utilities
 */

declare global {
  interface Window {
    __TAURI__?: any;
  }
}

// Check if running in Tauri desktop environment
export const isTauri = () => {
  try {
    return typeof window !== 'undefined' && 
           window.__TAURI__ !== undefined &&
           typeof window.__TAURI__.invoke === 'function';
  } catch (e) {
    return false;
  }
};

// Check if running in a browser
export const isBrowser = () => {
  return typeof window !== 'undefined' && !isTauri();
};

// Get environment name for display purposes
export const getEnvironment = () => {
  return isTauri() ? 'desktop' : 'browser';
};

// Safe Tauri API access
export const getTauriApi = async () => {
  if (!isTauri()) return null;
  
  try {
    const { appWindow } = await import('@tauri-apps/api/window');
    return { appWindow };
  } catch (error) {
    console.warn('Tauri API not available:', error);
    return null;
  }
};
