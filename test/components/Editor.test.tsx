import React from 'react';
import { screen, waitFor, cleanup, render } from '../test-utils';
import { Editor } from '../../src/frontend/src/components/editor';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom';

// Mock the Editor.js module
vi.mock('@editorjs/editorjs', () => {
  return class {
    static isReady = true;
    constructor() {
      this.destroy = vi.fn();
      this.isReady = true;
      this.render = vi.fn().mockResolvedValue(undefined);
    }
    destroy() {}
    render() { return Promise.resolve(); }
  };
});

describe('Editor Component', () => {
  const mockOnChange = vi.fn();
  
  const defaultProps = {
    value: {
      time: 1616161616161,
      blocks: [
        {
          type: 'header',
          data: {
            text: 'Test Document',
            level: 1
          }
        }
      ]
    },
    onChange: mockOnChange,
    placeholder: 'Start writing...'
  };

  beforeAll(() => {
    // Mock any global objects needed for Editor.js
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    // Clean up any DOM elements created by the tests
    const root = document.getElementById('root');
    if (root) {
      document.body.removeChild(root);
    }
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('renders without crashing', async () => {
    // Mock the Editor.js instance
    const mockEditor = {
      isReady: true,
      destroy: vi.fn(),
      render: vi.fn().mockResolvedValue(undefined)
    };
    
    // Render the component
    const { container } = render(<Editor {...defaultProps} />);
    
    // Wait for the editor to initialize
    await waitFor(() => {
      // Check if the editor container is in the document
      const editorContainer = container.querySelector('[data-testid="editorjs-container"]');
      expect(editorContainer).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays the initial content', async () => {
    // Mock the Editor.js instance with initial data
    const mockEditor = {
      isReady: true,
      destroy: vi.fn(),
      render: vi.fn().mockImplementation(() => {
        // Simulate the editor being rendered with initial content
        const editorContainer = document.createElement('div');
        editorContainer.innerHTML = `
          <div class="codex-editor">
            <div class="ce-block">
              <div class="ce-header">Test Document</div>
            </div>
          </div>
        `;
        document.body.appendChild(editorContainer);
        return Promise.resolve();
      })
    };

    // Render the component
    const { container } = render(<Editor {...defaultProps} />);
    
    // Wait for the editor to initialize and content to be rendered
    await waitFor(() => {
      // Check if the header content is displayed
      const headerElement = container.querySelector('.ce-header');
      expect(headerElement).toHaveTextContent('Test Document');
    }, { timeout: 5000 });
  });
});
