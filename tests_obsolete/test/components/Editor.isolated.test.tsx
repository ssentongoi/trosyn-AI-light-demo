import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
// Import our wrapper instead of the direct component
import EditorWrapper from './EditorWrapper';
import { setupTestEnvironment } from '../utils/test-setup';
import tokens from '../__mocks__/theme-tokens';

// Set up the test environment with our token mocks
setupTestEnvironment();

// Define the Editor.js mock class with proper TypeScript types
class MockEditorJS {
  static isReady = true;
  config: any;
  destroy: () => void;
  isReady: boolean;
  render: () => Promise<void>;
  save: () => Promise<{ time: number; blocks: Array<{ type: string; data: any }> }>;

  constructor(config: any) {
    this.config = config;
    this.destroy = vi.fn();
    this.isReady = true;
    this.render = vi.fn().mockResolvedValue(undefined);
    this.save = vi.fn().mockResolvedValue({
      time: Date.now(),
      blocks: [
        {
          type: 'paragraph',
          data: { text: 'Test content' }
        }
      ]
    });
  }
}

// Mock the Editor.js module
vi.mock('@editorjs/editorjs', () => ({
  __esModule: true,
  default: MockEditorJS
}));

// Create a test theme that uses our token values
const testTheme = createTheme({
  palette: {
    primary: {
      main: tokens.blue[700],
    },
    secondary: {
      main: tokens.green[500],
    },
    grey: tokens.grey,
  },
});

describe('Editor Component - Isolated Test', () => {
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
    placeholder: 'Start writing...',
    'data-testid': 'test-editor'
  };

  const renderEditor = (props = {}) => {
    return render(
      <ThemeProvider theme={testTheme}>
        <EditorWrapper {...defaultProps} {...props} />
      </ThemeProvider>
    );
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

  it('renders the editor container', () => {
    renderEditor();
    const editorElement = screen.getByTestId('test-editor');
    expect(editorElement).toBeInTheDocument();
  });

  it('initializes Editor.js with correct configuration', async () => {
    const EditorJS = (await import('@editorjs/editorjs')).default;
    
    renderEditor();
    
    // Check if EditorJS was instantiated with the correct config
    expect(EditorJS).toHaveBeenCalledWith(
      expect.objectContaining({
        holder: 'editorjs',
        placeholder: 'Start writing...',
        readOnly: false,
        data: defaultProps.value,
      })
    );
  });
});
