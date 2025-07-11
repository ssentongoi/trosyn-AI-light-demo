import { vi } from 'vitest';
import tokens from '../__mocks__/theme-tokens';

/**
 * Sets up theme token mocks for component tests
 * This ensures components that use design tokens will work in test environments
 */
export function setupThemeTokens() {
  // Mock the theme module
  vi.mock('../../src/frontend/theme/theme', () => ({
    tokens,
    default: {
      palette: {
        primary: {
          main: tokens.blue[700],
        },
        secondary: {
          main: tokens.green[500],
        },
        error: {
          main: tokens.red[500],
        },
        grey: tokens.grey,
      },
    },
  }));

  // If your app has a separate tokens module, mock that too
  vi.mock('../../src/frontend/theme/tokens', () => tokens);

  // Add tokens to global scope if components access them directly
  (global as any).tokens = tokens;
}

/**
 * Sets up DOM environment mocks needed for component testing
 * This includes ResizeObserver, IntersectionObserver, etc.
 */
export function setupDomEnvironment() {
  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/**
 * Complete test setup - call this in your test setup file or at the top of test files
 */
export function setupTestEnvironment() {
  setupThemeTokens();
  setupDomEnvironment();
}

export default setupTestEnvironment;
