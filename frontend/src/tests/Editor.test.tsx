import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import Editor, { EditorInstance } from '../components/editor/Editor';
import type { OutputData } from '@editorjs/editorjs';
import '@testing-library/jest-dom/vitest';

// Mock UUID to return consistent IDs in tests
vi.mock('uuid', () => ({
  v4: () => 'test-editor-id',
}));

// Mock EditorJS with proper Promise-based isReady
const mockSave = vi.fn().mockResolvedValue({ 
  blocks: [{ type: 'paragraph', data: { text: 'Test content' } }],
  time: Date.now()
} as OutputData);

const mockDestroy = vi.fn().mockResolvedValue(undefined);
const mockRender = vi.fn().mockResolvedValue(undefined);
const mockFocus = vi.fn();

// Define the EditorJS config interface
interface EditorJSConfig {
  holder: string;
  onReady?: () => void;
  onChange?: (api: { saver: { save: () => Promise<OutputData> } }) => void;
  readOnly?: boolean;
  autofocus?: boolean;
  placeholder?: string;
  tools?: Record<string, any>;
}

// Mock the EditorJS instance
class MockEditorJS {
  static instances: MockEditorJS[] = [];
  
  public isReady: Promise<void>;
  public save = mockSave;
  public destroy = mockDestroy;
  public render = mockRender;
  public focus = mockFocus;
  public config: EditorJSConfig;
  private onChangeCallback?: (api: { saver: { save: () => Promise<OutputData> } }) => void;
  
  constructor(config: EditorJSConfig) {
    this.config = { ...config };
    MockEditorJS.instances.push(this);
    
    // Store the onReady callback
    this.isReady = new Promise((resolve) => {
      // Simulate async initialization with tools loading
      setTimeout(() => {
        if (this.config.onReady) {
          this.config.onReady();
        }
        if (this.config.onChange) {
          this.onChangeCallback = this.config.onChange;
        }
        resolve();
      }, 0);
    });
  }
}

// Mock EditorJS and its plugins
vi.mock('@editorjs/editorjs', () => ({
  default: vi.fn().mockImplementation((config: any) => new MockEditorJS(config)),
}));

// Mock the tools that will be dynamically imported
vi.mock('@editorjs/header', () => ({
  default: class MockHeader {}
}));

vi.mock('@editorjs/list', () => ({
  default: class MockList {}
}));

vi.mock('@editorjs/paragraph', () => ({
  default: class MockParagraph {}
}));

// Helper to get the latest EditorJS instance
const getLatestEditorInstance = (): MockEditorJS => {
  const instances = MockEditorJS.instances;
  return instances[instances.length - 1];
};

// Reset mock instances and clear all mocks between tests
beforeEach(() => {
  MockEditorJS.instances = [];
  vi.clearAllMocks();
  cleanup();
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe('Editor', () => {
  beforeAll(() => {
    // Use fake timers for all tests
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('renders loading state initially', async () => {
    render(<Editor />);
    expect(screen.getByText('Loading editor…')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Loading editor…')).not.toBeInTheDocument();
    });
  });

  it('initializes EditorJS with correct config', async () => {
    const onChange = vi.fn();
    render(
      <Editor 
        autofocus={true}
        readOnly={false}
        placeholder="Test placeholder"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(MockEditorJS.instances).toHaveLength(1);
      const editor = MockEditorJS.instances[0];
      expect(editor.config.autofocus).toBe(true);
      expect(editor.config.readOnly).toBe(false);
      expect(editor.config.placeholder).toBe('Test placeholder');
    });
  });

  it('handles onChange events', async () => {
    const onChange = vi.fn();
    render(<Editor onChange={onChange} />);

    await waitFor(() => {
      expect(MockEditorJS.instances).toHaveLength(1);
    });

    const editor = MockEditorJS.instances[0];
    const mockApi = { saver: { save: mockSave } };
    
    // Trigger the onChange callback
    if (editor.config.onChange) {
      editor.config.onChange(mockApi);
    }

    // Fast-forward timers to trigger the debounced onChange
    await vi.runAllTimersAsync();
    
    expect(onChange).toHaveBeenCalled();
  });

  it('shows error state when initialization fails', async () => {
    // Mock a failing tools load
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    // Mock the loadTools function to reject
    const mockLoadTools = vi.fn().mockRejectedValue(new Error('Failed to load tools'));
    vi.mock('../components/editor/Editor', async () => {
      const actual = await vi.importActual<typeof import('../components/editor/Editor')>('../components/editor/Editor');
      return {
        ...actual,
        loadTools: mockLoadTools,
      };
    });

    render(<Editor />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to initialise editor')).toBeInTheDocument();
    });

    // Cleanup
    vi.unmock('../components/editor/Editor');
    console.error = originalConsoleError;
  });

  it('calls onSave when save button is clicked', async () => {
    const onSave = vi.fn();
    render(<Editor onSave={onSave} showSaveButton={true} />);

    await waitFor(() => {
      expect(MockEditorJS.instances).toHaveLength(1);
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('does not show save button when onSave is not provided', async () => {
    render(<Editor />);
    await waitFor(() => {
      expect(MockEditorJS.instances).toHaveLength(1);
    });
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('cleans up on unmount', async () => {
    const { unmount } = render(<Editor />);
    
    await waitFor(() => {
      expect(MockEditorJS.instances).toHaveLength(1);
    });

    unmount();
    
    expect(mockDestroy).toHaveBeenCalled();
  });

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Reset the mock save function
    mockSave.mockResolvedValue({ 
      blocks: [{ type: 'paragraph', data: { text: 'Test content' } }],
      time: Date.now()
    });
  })

  afterEach(() => {
    // Run any pending timers and clean up
    vi.runAllTimers();
    cleanup();
  });

  afterAll(() => {
    // Restore real timers after all tests
    vi.useRealTimers();
  });

  it('renders without crashing', async () => {
    render(<Editor data-testid="editor" />);
    
    // The editor container should be in the document immediately
    expect(screen.getByTestId('editor')).toBeInTheDocument();
    
    // Fast-forward any pending timers
    await vi.runAllTimersAsync();
    
    // The editor should be ready now
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  it('shows loading state when initializing', async () => {
    render(<Editor />);
    
    // Should show loading state initially
    expect(screen.getByText(/loading editor/i)).toBeInTheDocument();
    
    // Fast-forward timers to complete initialization
    await vi.runAllTimersAsync();
    
    // Loading state should be gone
    await waitFor(() => {
      expect(screen.queryByText(/loading editor/i)).not.toBeInTheDocument();
    });
  });

  it('handles read-only mode', async () => {
    render(<Editor readOnly />);
    
    await vi.runAllTimersAsync();
    
    // In read-only mode, the save button should not be present
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  it('applies custom className', async () => {
    const customClass = 'my-custom-editor'
    render(<Editor className={customClass} />)
    
    await vi.runAllTimersAsync()
    
    const container = await screen.findByTestId('editor-container')
    expect(container).toHaveClass(customClass)
  })

  it('calls onSave when save button is clicked', async () => {
    const onSaveMock = vi.fn();
    render(<Editor onSave={onSaveMock} />);
    
    await vi.runAllTimersAsync();
    
    // Wait for save button to be present
    const saveButton = await screen.findByRole('button', { name: /save/i });
    
    // Click the save button
    fireEvent.click(saveButton);
    
    // Wait for save to complete
    await vi.runAllTimersAsync();
    
    // Verify onSave was called with the expected data
    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledWith({
        time: expect.any(Number),
        blocks: [{ type: 'paragraph', data: { text: 'Test content' } }]
      });
    });
  });

  it('calls onChange when content changes', async () => {
    const onChangeMock = vi.fn();
    render(<Editor onChange={onChangeMock} />);
    
    await vi.runAllTimersAsync();
    
    // Get the editor instance and trigger its onChange handler
    const editor = getLatestEditorInstance();
    
    // Simulate a change event from EditorJS
    const mockData = { 
      time: Date.now(),
      blocks: [{ type: 'paragraph', data: { text: 'New content' } }] 
    };
    
    // Call the onChange handler directly with mock data
    if (editor.config.onChange) {
      await editor.config.onChange({
        saver: {
          save: vi.fn().mockResolvedValue(mockData)
        }
      });
    }
    
    // Fast-forward the debounce timer
    await vi.runAllTimersAsync();
    
    // Verify onChange was called with the expected data
    await waitFor(() => {
      expect(onChangeMock).toHaveBeenCalledWith(mockData);
    });
  });

  it('handles cleanup on unmount', async () => {
    const { unmount } = render(<Editor />);
    
    await vi.runAllTimersAsync();
    
    // Get the editor instance
    const editor = getLatestEditorInstance();
    
    // Unmount the component
    unmount();
    
    // Fast-forward any pending timers
    await vi.runAllTimersAsync();
    
    // Verify destroy was called
    expect(editor.destroy).toHaveBeenCalled();
  });

  it('displays error state when initialization fails', async () => {
    // Mock a failing tools load
    vi.doMock('../components/editor/Editor', async () => {
      const actual = await vi.importActual('../components/editor/Editor');
      return {
        ...actual,
        loadTools: vi.fn().mockRejectedValue(new Error('Failed to load tools')),
      };
    });
    
    // Re-import after setting up the mock
    const { default: EditorWithError } = await import('../components/editor/Editor');
    
    render(<EditorWithError />);
    
    // Fast-forward timers to complete initialization
    await vi.runAllTimersAsync();
    
    // Check if error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to load editor tools/i)).toBeInTheDocument();
    });
    
    // Clean up the mock
    vi.resetModules();
  });
  
  it('does not show save button when onSave is not provided', async () => {
    render(<Editor />);
    
    await vi.runAllTimersAsync();
    
    // The save button should not be present when onSave is not provided
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });
  
  it('shows save button when onSave is provided', async () => {
    const onSave = vi.fn();
    render(<Editor onSave={onSave} />);
    
    await vi.runAllTimersAsync();
    
    // The save button should be present when onSave is provided
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
})
