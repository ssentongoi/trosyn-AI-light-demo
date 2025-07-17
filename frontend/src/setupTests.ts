// This file is automatically included by the test setup.
// You can add global test setup here.
import { vi } from 'vitest';

// Mock ResizeObserver for MUI components
const ResizeObserverMock = function (this: any, callback: ResizeObserverCallback) {
  this.observe = vi.fn((target: Element) => {
    // Create a mock entry with required properties
    const entry: Partial<ResizeObserverEntry> = {
      target,
      contentRect: target.getBoundingClientRect(),
      borderBoxSize: [{ inlineSize: 0, blockSize: 0 }],
      contentBoxSize: [{ inlineSize: 0, blockSize: 0 }],
      devicePixelContentBoxSize: [{ inlineSize: 0, blockSize: 0 }],
    };
    
    // Call the callback with the mock entry
    callback([entry as ResizeObserverEntry], this);
  });
  
  this.unobserve = vi.fn();
  this.disconnect = vi.fn();};

// Add to window and global
window.ResizeObserver = ResizeObserverMock as any;
global.ResizeObserver = ResizeObserverMock as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
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

// Mock IntersectionObserver if needed
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();
}

window.IntersectionObserver = IntersectionObserverMock as any;
global.IntersectionObserver = IntersectionObserverMock as any;

export {};
