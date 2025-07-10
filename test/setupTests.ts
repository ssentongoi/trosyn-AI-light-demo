import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

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

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  
  constructor(
    public callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {}
  
  observe(target: Element): void {}
  unobserve(target: Element): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// Assign the mock to the global window
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Set up mocks before tests
beforeAll(() => {
  // Start the mock service worker
  server.listen({ onUnhandledRequest: 'error' });
  
  // Mock browser APIs
  window.ResizeObserver = ResizeObserver;
  window.IntersectionObserver = IntersectionObserver;
});

// Clean up after each test
afterEach(() => {
  // Reset any runtime handlers tests may use during the test
  server.resetHandlers();
  // Clean up the DOM
  cleanup();
});

// Clean up after all tests are done
afterAll(() => {
  // Clean up the mock service worker
  server.close();
});

// Configure test-id attribute
configure({ testIdAttribute: 'data-testid' });
