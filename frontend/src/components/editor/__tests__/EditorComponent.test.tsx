import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import '@testing-library/jest-dom';
import EditorComponent from '../EditorComponent';

// Mock EditorJS
let mockEditor: any;
let mockOnChangeCallback: ((api: any) => void) | null = null;

// Create a fresh mock editor instance
const createMockEditor = () => {
  const editor = {
    isReady: Promise.resolve(),
    destroy: vi.fn().mockResolvedValue(undefined),
    render: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue({ blocks: [] }),
    readOnly: {
      toggle: vi.fn(),
    },
  };

  // Set up the Promise chain for isReady
  editor.isReady = Promise.resolve(editor);
  editor.isReady.then = vi.fn().mockImplementation(function(this: any) {
    return Promise.resolve(editor);
  });

  return editor;
};

// Mock the EditorJS constructor to capture the onChange callback
const MockEditorJS = vi.fn().mockImplementation((config: any) => {
  mockEditor = createMockEditor();
  
  // Capture the onChange callback from the config
  if (config && config.onChange) {
    mockOnChangeCallback = config.onChange;
  }
  
  return mockEditor;
});

// Mock the EditorJS module
vi.mock('@editorjs/editorjs', () => ({
  default: MockEditorJS
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  mockEditor = null;
  mockOnChangeCallback = null;
});

describe('EditorComponent', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the editor container', () => {
    render(<EditorComponent />);
    const editorElement = screen.getByTestId('editor-container');
    expect(editorElement).toBeInTheDocument();
  });

  it('initializes with default props', async () => {
    render(<EditorComponent />);
    
    // Import the mocked module
    const EditorJSModule = await import('@editorjs/editorjs');
    const EditorJS = vi.mocked(EditorJSModule.default);
    
    // Check if EditorJS was initialized with default props
    expect(EditorJS).toHaveBeenCalledWith(
      expect.objectContaining({
        placeholder: 'Start writing here...',
        readOnly: false,
        minHeight: '200px',
      })
    );
  });

  it('initializes with provided props', async () => {
    const mockData = {
      blocks: [
        {
          type: 'paragraph',
          data: {
            text: 'Test content'
          }
        }
      ]
    };

    render(
      <EditorComponent 
        data={mockData}
        placeholder="Custom placeholder"
        readOnly={true}
        minHeight="500px"
      />
    );

    const EditorJS = vi.mocked(await import('@editorjs/editorjs')).default;
    expect(EditorJS).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockData,
        placeholder: 'Custom placeholder',
        readOnly: true,
        minHeight: '500px',
      })
    );
  });

  it('calls onChange when content changes', async () => {
    const mockOnChange = vi.fn();
    const testData = { blocks: [{ type: 'paragraph', data: { text: 'Test content' } }] };
    
    // Render the component
    render(<EditorComponent onChange={mockOnChange} />);
    
    // Wait for the EditorJS constructor to be called
    await vi.waitFor(() => {
      expect(MockEditorJS).toHaveBeenCalledTimes(1);
    });
    
    // Verify that the onChange callback was captured
    expect(mockOnChangeCallback).toBeDefined();
    
    if (!mockOnChangeCallback) {
      throw new Error('onChange callback was not captured');
    }
    
    // Setup mock to return test data when save is called
    mockEditor.save.mockResolvedValue(testData);
    
    // Create a mock API object with saver
    const mockApi = {
      saver: {
        save: vi.fn().mockResolvedValue(testData)
      }
    };
    
    // Trigger the onChange callback
    await mockOnChangeCallback(mockApi);
    
    // Verify the onChange prop was called with the test data
    expect(mockOnChange).toHaveBeenCalledWith(testData);
  });

  it('cleans up on unmount', async () => {
    // Render the component
    const { unmount } = render(<EditorComponent />);
    
    // Wait for the EditorJS constructor to be called
    await vi.waitFor(() => {
      expect(MockEditorJS).toHaveBeenCalledTimes(1);
    });
    
    // Verify that the editor instance was created
    expect(mockEditor).toBeDefined();
    
    // Unmount the component
    unmount();
    
    // Wait for cleanup to complete
    await vi.waitFor(() => {
      expect(mockEditor.destroy).toHaveBeenCalledTimes(1);
    });
  });

  it('updates readOnly state when prop changes', async () => {
    const { rerender } = render(<EditorComponent readOnly={false} />);
    
    // Wait for the EditorJS constructor to be called
    await vi.waitFor(() => {
      expect(MockEditorJS).toHaveBeenCalledTimes(1);
    });
    
    // Verify that the editor instance was created
    expect(mockEditor).toBeDefined();
    
    // Spy on the toggle method after the editor is created
    const toggleSpy = vi.spyOn(mockEditor.readOnly, 'toggle');
    
    // Change the readOnly prop
    rerender(<EditorComponent readOnly={true} />);
    
    // Wait for the effect to run
    await vi.waitFor(() => {
      expect(toggleSpy).toHaveBeenCalledWith(true);
    });
  });
});
