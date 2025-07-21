import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the module with vi.importActual to get the real implementation
const actualSecureStorage = await vi.importActual<typeof import('../utils/secureStorage')>('../utils/secureStorage');

// Mock the module
vi.mock('../utils/secureStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/secureStorage')>();
  return {
    ...actual,
    // Mock any specific functions if needed
  };
});

// Import after setting up the mock
import * as secureStorage from '../utils/secureStorage';

// Mock Tauri API
let mockInvoke = vi.fn().mockImplementation((command: string, args: any) => {
  if (command === 'secure_get' && args.key === 'testKey') {
    return Promise.resolve('tauri-test-value');
  } else if (command === 'secure_set') {
    return Promise.resolve();
  } else if (command === 'secure_remove') {
    return Promise.resolve();
  }
  return Promise.resolve(undefined);
});

// Mock @tauri-apps/api/tauri
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: (command: string, args: any) => {
    // Only use the mock invoke if we're in a Tauri environment
    if ((window as any).__TAURI__) {
      return mockInvoke(command, args);
    }
    throw new Error('Tauri API not available');
  }
}));

// Mock window.__TAURI__
const mockTauri = {
  __esModule: true,
  invoke: mockInvoke
};

// Extend the Window interface
declare global {
  interface Window {
    __TAURI__?: {
      __esModule: boolean;
      invoke: any;
    };
  }
}

// Store the original window object
const originalWindow = { ...window };

// Helper to mock window.__TAURI__
const mockWindowTauri = (tauriMock: any) => {
  Object.defineProperty(window, '__TAURI__', {
    value: tauriMock,
    configurable: true,
    writable: true
  });
};

describe('secureStorage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Reset memory storage
    Object.keys(secureStorage.memoryStorage).forEach(key => {
      delete secureStorage.memoryStorage[key];
    });
  });
  
  afterEach(() => {
    // Restore the original window object after each test
    mockWindowTauri(undefined);
  });
  
  describe('in browser environment', () => {
    let originalTauri: any;
    
    beforeEach(() => {
      // Store original Tauri implementation
      originalTauri = (window as any).__TAURI__;
      
      // Simulate browser environment (no Tauri)
      delete (window as any).__TAURI__;
      
      // Reset mocks and memory storage for each test
      mockInvoke.mockClear();
      Object.keys(secureStorage.memoryStorage).forEach(key => {
        delete secureStorage.memoryStorage[key];
      });
    });
    
    afterEach(() => {
      // Restore original Tauri implementation
      (window as any).__TAURI__ = originalTauri;
    });
    
    it('should store and retrieve values in memory', async () => {
      
      // Test set and get
      await secureStorage.secureSetItem('testKey', 'testValue');
      const value = await secureStorage.secureGetItem('testKey');
      
      expect(value).toBe('testValue');
      expect(mockInvoke).not.toHaveBeenCalled();
    });
    
    it('should remove values from memory', async () => {
      // Browser environment - Tauri is not available
      (window as any).__TAURI__ = undefined;
      
      // Set a value first
      await secureStorage.secureSetItem('testKey', 'testValue');
      
      // Test remove
      await secureStorage.secureRemoveItem('testKey');
      const value = await secureStorage.secureGetItem('testKey');
      
      expect(value).toBeNull();
    });
  });
  
  describe('in Tauri environment', () => {
    let originalTauri: any;
    
    beforeEach(() => {
      // Store original Tauri implementation
      originalTauri = (window as any).__TAURI__;
      
      // Simulate Tauri environment
      (window as any).__TAURI__ = mockTauri;
      
      // Reset mocks and memory storage for each test
      mockInvoke.mockClear();
      Object.keys(secureStorage.memoryStorage).forEach(key => {
        delete secureStorage.memoryStorage[key];
      });
    });
    
    afterEach(() => {
      // Restore original Tauri implementation
      (window as any).__TAURI__ = originalTauri;
    });
    
    it('should use Tauri secure storage when available', async () => {
      await secureStorage.secureSetItem('testKey', 'testValue');
      
      // Should have called the Tauri invoke method
      expect(mockInvoke).toHaveBeenCalledWith('secure_set', {
        key: 'testKey',
        value: 'testValue'
      });
      
      // Test get
      const value = await secureStorage.secureGetItem('testKey');
      expect(mockInvoke).toHaveBeenCalledWith('secure_get', { key: 'testKey' });
      expect(value).toBe('tauri-test-value');
    });
    
    it('should handle Tauri secure storage errors', async () => {
      // Simulate an error in Tauri's secure storage
      mockInvoke.mockRejectedValueOnce(new Error('Storage error'));
      
      // Should not throw, just log the error
      await expect(secureStorage.secureSetItem('testKey', 'testValue')).resolves.not.toThrow();
      
      // Should return null on error
      mockInvoke.mockRejectedValueOnce(new Error('Not found'));
      const value = await secureStorage.secureGetItem('nonExistentKey');
      expect(value).toBeNull();
    });
    
    it('should remove values using Tauri secure storage', async () => {
      await secureStorage.secureRemoveItem('testKey');
      
      // Should have called the Tauri invoke method
      expect(mockInvoke).toHaveBeenCalledWith('secure_remove', { key: 'testKey' });
    });
  });
  
  it('should handle errors during initialization', async () => {
    // Store original implementation
    const originalTauri = (window as any).__TAURI__;
    
    try {
      // Clear any existing values in memory storage
      Object.keys(secureStorage.memoryStorage).forEach(key => {
        delete secureStorage.memoryStorage[key];
      });
      
      // Mock the console.error to prevent test output pollution
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        // Simulate Tauri being completely unavailable (like in a browser)
        delete (window as any).__TAURI__;
        
        // Should not throw, just use memory storage
        await expect(secureStorage.secureSetItem('testKey', 'testValue')).resolves.not.toThrow();
        
        // The value should be in memory storage
        expect(secureStorage.memoryStorage['testKey']).toBe('testValue');
        
        // Should get the value from memory storage
        await expect(secureStorage.secureGetItem('testKey')).resolves.toBe('testValue');
        
        // Should remove from memory storage
        await expect(secureStorage.secureRemoveItem('testKey')).resolves.not.toThrow();
        expect(secureStorage.memoryStorage['testKey']).toBeUndefined();
      } finally {
        // Restore console.error
        consoleErrorSpy.mockRestore();
      }
    } finally {
      // Restore original implementation
      (window as any).__TAURI__ = originalTauri;
    }
  });
});
