import React from 'react';
import { render, screen, waitFor } from '../test-utils';
import { Editor } from '../../src/frontend/src/components/editor';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Editor.js
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

describe('Editor Component - Simple Test', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any DOM elements created by the tests
    const root = document.getElementById('root');
    if (root) {
      document.body.removeChild(root);
    }
  });

  it('renders the editor container', async () => {
    // Render the component with test ID
    const { container } = render(
      <div data-testid="editor-wrapper">
        <Editor {...defaultProps} />
      </div>
    );
    
    // Check if the editor wrapper is rendered
    const editorWrapper = screen.getByTestId('editor-wrapper');
    expect(editorWrapper).toBeInTheDocument();
    
    // Check if the editor container is present
    const editorContainer = container.querySelector('[data-testid="editorjs-container"]');
    expect(editorContainer).toBeInTheDocument();
  });

  it('calls onChange when content changes', async () => {
    // Mock the Editor.js instance
    const mockEditor = {
      isReady: true,
      destroy: vi.fn(),
      save: vi.fn().mockResolvedValue({
        time: 1616161616161,
        blocks: [
          {
            type: 'paragraph',
            data: {
              text: 'Updated content'
            }
          }
        ]
      })
    };
    
    // Mock the Editor.js constructor
    vi.mocked(require('@editorjs/editorjs')).mockImplementation(() => mockEditor);
    
    // Render the component
    render(
      <div data-testid="editor-wrapper">
        <Editor {...defaultProps} />
      </div>
    );
    
    // Simulate a content change
    await waitFor(() => {
      // Trigger a save
      mockEditor.save();
      
      // Check if onChange was called
      expect(mockOnChange).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});
