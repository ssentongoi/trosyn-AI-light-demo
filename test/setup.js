// Global vitest setup file
import { vi } from 'vitest';
import '@testing-library/jest-dom';

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

// Set up custom DOM element for Editor.js to mount to
beforeEach(() => {
  // Create a container element for Editor.js
  const editorElement = document.createElement('div');
  editorElement.id = 'editorjs';
  document.body.appendChild(editorElement);
});

afterEach(() => {
  // Clean up the editor element
  const editorElement = document.getElementById('editorjs');
  if (editorElement) {
    editorElement.remove();
  }
});
