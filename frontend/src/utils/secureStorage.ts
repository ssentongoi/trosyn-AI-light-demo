/**
 * Secure Storage Utility
 * 
 * Provides a secure way to store sensitive data like authentication tokens.
 * 
 * @module utils/secureStorage
 * 
 * @description
 * This module provides a secure storage solution that automatically handles different environments:
 * - In a Tauri desktop app: Uses the operating system's secure keychain/keyring
 * - In a browser environment: Falls back to in-memory storage (not persistent)
 * 
 * The storage is designed to be used for sensitive data that should not be stored in localStorage
 * or sessionStorage due to XSS vulnerabilities.
 * 
 * @example
 * // Import the secure storage functions
 * import { secureSetItem, secureGetItem, secureRemoveItem } from './utils/secureStorage';
 * 
 * // Store a value
 * await secureSetItem('authToken', 'your-secure-token');
 * 
 * // Retrieve a value
 * const token = await secureGetItem('authToken');
 * 
 * // Remove a value
 * await secureRemoveItem('authToken');
 */

// Check if running in Tauri
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
};

/**
 * In-memory storage used as a fallback when Tauri is not available.
 * Note: This is not persistent and will be cleared when the page is refreshed.
 * @type {Record<string, string>}
 */
export const memoryStorage: Record<string, string> = {};

/**
 * Securely stores a value
 * @param key - The key to store the value under
 * @param value - The value to store
 */
/**
 * Securely stores a value in the appropriate storage based on the environment.
 * 
 * @param {string} key - The key under which to store the value
 * @param {string} value - The value to store
 * @returns {Promise<void>} A promise that resolves when the value has been stored
 * 
 * @example
 * await secureSetItem('authToken', 'your-secure-token');
 */
export async function secureSetItem(key: string, value: string): Promise<void> {
  try {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/tauri');
        await invoke('secure_set', { key, value });
      } catch (tauriError) {
        // If Tauri fails, fall back to memory storage
        memoryStorage[key] = value;
      }
    } else {
      // Fallback to in-memory storage in development
      memoryStorage[key] = value;
    }
  } catch (error) {
    console.error('Error in secureSetItem:', error);
    // Fallback to memory storage on any error
    memoryStorage[key] = value;
  }
}

/**
 * Retrieves a securely stored value
 * @param key - The key of the value to retrieve
 * @returns The stored value or null if not found
 */
/**
 * Retrieves a value from secure storage.
 * 
 * @param {string} key - The key of the value to retrieve
 * @returns {Promise<string | null>} The stored value, or null if not found
 * 
 * @example
 * const token = await secureGetItem('authToken');
 * if (token) {
 *   // Use the token
 * }
 */
export async function secureGetItem(key: string): Promise<string | null> {
  try {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/tauri');
        return await invoke('secure_get', { key });
      } catch (tauriError) {
        // If Tauri fails, try to get from memory storage
        return memoryStorage[key] || null;
      }
    } else {
      // Fallback to in-memory storage in development
      return memoryStorage[key] || null;
    }
  } catch (error) {
    console.error('Error in secureGetItem:', error);
    return memoryStorage[key] || null;
  }
}

/**
 * Removes a securely stored value
 * @param key - The key of the value to remove
 */
/**
 * Removes a value from secure storage.
 * 
 * @param {string} key - The key of the value to remove
 * @returns {Promise<void>} A promise that resolves when the value has been removed
 * 
 * @example
 * await secureRemoveItem('authToken');
 */
export async function secureRemoveItem(key: string): Promise<void> {
  try {
    if (isTauri()) {
      // Use Tauri's secure storage in production
      const { invoke } = await import('@tauri-apps/api/tauri');
      try {
        await invoke('secure_remove', { key });
      } catch (error) {
        // If Tauri fails, try to remove from memory storage
        delete memoryStorage[key];
      }
    } else {
      // Fallback to in-memory storage in development
      delete memoryStorage[key];
    }
  } catch (error) {
    console.error('Error in secureRemoveItem:', error);
    // Still try to remove from memory storage even if there's an error
    delete memoryStorage[key];
  }
}

/**
 * Default export with the secure storage API methods.
 * 
 * @type {Object}
 * @property {Function} setItem - Alias for secureSetItem
 * @property {Function} getItem - Alias for secureGetItem
 * @property {Function} removeItem - Alias for secureRemoveItem
 */
export default {
  setItem: secureSetItem,
  getItem: secureGetItem,
  removeItem: secureRemoveItem,
};
