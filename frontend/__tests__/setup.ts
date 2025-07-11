import { expect, vi, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock matchMedia
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

// Mock ResizeObserver
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverStub;

// Mock IntersectionObserver
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserverStub;

// Mock requestAnimationFrame
const requestAnimationFrameStub = (callback: FrameRequestCallback) => {
  return window.setTimeout(callback, 0);
};

const cancelAnimationFrameStub = (id: number) => {
  window.clearTimeout(id);
};

window.requestAnimationFrame = requestAnimationFrameStub;
window.cancelAnimationFrame = cancelAnimationFrameStub;

// Mock Tauri API
const mockTauri = {
  invoke: vi.fn(),
  dialog: {
    save: vi.fn(),
    open: vi.fn(),
  },
  fs: {
    writeTextFile: vi.fn(),
    readTextFile: vi.fn(),
  },
  path: {
    documentDir: vi.fn().mockResolvedValue('/documents'),
  },
  event: {
    listen: vi.fn(),
    emit: vi.fn(),
  },
};

// @ts-ignore - mock Tauri API
window.__TAURI__ = mockTauri;

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock console.error to fail tests on React errors
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (message, ...args) => {
    // Ignore React warnings about act()
    if (typeof message === 'string' && message.includes('act')) {
      return;
    }
    originalConsoleError(message, ...args);
  };
});

// Reset mocks after all tests
afterAll(() => {
  console.error = originalConsoleError;
  vi.restoreAllMocks();
});

// Mock the document.elementsFromPoint method
// This is used by some MUI components
Document.prototype.elementsFromPoint = vi.fn(() => []);

// Mock the document.createRange method
// This is used by some MUI components like Tooltip
document.createRange = () => {
  const range = new Range();
  
  range.getBoundingClientRect = vi.fn();
  range.getClientRects = () => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: Array.prototype[Symbol.iterator],
  });
  
  return range;
};

// Mock the scrollIntoView method
// This is used by some MUI components
Element.prototype.scrollIntoView = vi.fn();
