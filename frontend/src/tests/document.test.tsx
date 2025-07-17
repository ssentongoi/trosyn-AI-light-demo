import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { vi, expect, describe, test, beforeEach, afterEach, beforeAll } from 'vitest';
import { DocumentProvider } from '@/contexts/DocumentContext';
import EditorPage from '../pages/EditorPage';
import React from 'react';

// Mock the Tauri API first to avoid hoisting issues
vi.mock('@tauri-apps/api/tauri', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as object,
    invoke: vi.fn()
  };
});

// Import the mocked module after setting up the mock
import { invoke as mockInvoke } from '@tauri-apps/api/tauri';

// Mock the Tauri filesystem API
vi.mock('@tauri-apps/api/fs', () => ({
  readTextFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock the Editor.js component with a lightweight implementation
vi.mock('@editorjs/editorjs', () => {
  const mockEditor = {
    isReady: Promise.resolve(true),
    render: vi.fn(),
    save: vi.fn().mockResolvedValue({}),
    destroy: vi.fn(),
    blocks: { getBlockByIndex: vi.fn() },
  };
  
  return {
    default: vi.fn(() => mockEditor),
    __esModule: true
  };
});

// Mock the FileReader
class MockFileReader {
  static EMPTY = 0;
  static LOADING = 1;
  static DONE = 2;
  
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  
  readyState = 0;
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  
  readAsText() {
    this.readyState = FileReader.LOADING;
    if (this.onload) {
      this.result = 'test content';
      this.onload({ target: this } as ProgressEvent<FileReader>);
    }
    this.readyState = FileReader.DONE;
  }
  
  // Implement other required methods
  abort() {}
  readAsArrayBuffer() {}
  readAsBinaryString() {}
  readAsDataURL() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
}

// Mock the global FileReader
beforeAll(() => {
  global.FileReader = MockFileReader as any;
});

// Create a mock implementation for the Tauri API
// Mock the Tauri API before any imports that might use it
// Mock the Tauri FS API
vi.mock('@tauri-apps/api/fs', () => ({
  readTextFile: vi.fn().mockResolvedValue('Test content'),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(true),
  createDir: vi.fn().mockResolvedValue(undefined),
  BaseDirectory: { AppData: 'appData' },
}));

// Mock document data
const mockDocument = {
  id: 'doc-123',
  title: 'Test Document',
  content: 'Test content',
  filePath: '/test/path',
  lastModified: new Date().toISOString(),
  versions: [{
    id: 'v1',
    content: 'Test content',
    createdAt: new Date().toISOString(),
  }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('EditorPage', () => {
  let originalFileReader: typeof global.FileReader;
  
  beforeAll(() => {
    // Store the original FileReader
    originalFileReader = global.FileReader;
    // @ts-ignore - Mocking global FileReader
    global.FileReader = vi.fn().mockImplementation(() => new MockFileReader());
  });
  
  afterAll(() => {
    // Restore the original FileReader
    global.FileReader = originalFileReader;
  });
  
  const renderEditor = () => {
    return render(
      <DocumentProvider>
        <EditorPage />
      </DocumentProvider>
    );
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up default mock implementation for invoke
    (mockInvoke as any).mockImplementation((command: string, args?: any) => {
      if (command === 'upload_document') {
        return Promise.resolve({
          status: 'success',
          data: {
            id: 'doc-123',
            title: args?.title || 'test.txt',
            content: args?.content || '',
            filePath: `/uploads/${args?.title || 'test.txt'}`,
            lastModified: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            folder: 'default'
          },
        });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('renders editor page', () => {
    renderEditor();
    expect(screen.getByText('Document Editor')).toBeInTheDocument();
  });

  test('renders document editor with toolbar', () => {
    renderEditor();
    
    // Check for the main editor title
    expect(screen.getByText('Document Editor')).toBeInTheDocument();
    
    // Check for the editor container
    const editorContainer = document.querySelector('[style*="min-height: 350px"]');
    expect(editorContainer).toBeInTheDocument();
  });

  test('initializes editor instance', () => {
    renderEditor();
    const editorContainer = document.querySelector('[style*="min-height: 350px"]');
    expect(editorContainer).toBeInTheDocument();
  });

  // TODO: Add tests for document upload functionality when implemented
  // The current implementation doesn't have a direct file upload in the DocumentToolbar
  // The file upload should be tested at the component level where it's implemented

  test('switches between editor and AI tools views', async () => {
    const user = userEvent.setup();
    renderEditor();
    
    // Find the buttons by their text content
    const editorButton = screen.getByRole('button', { name: /editor/i });
    const aiToolsButton = screen.getByRole('button', { name: /ai tools/i });
    
    // Verify initial state - Editor button should be in contained (primary) variant
    expect(editorButton).toHaveClass('MuiButton-contained');
    expect(aiToolsButton).toHaveClass('MuiButton-text');
    
    // Click AI Tools button
    await user.click(aiToolsButton);
    
    // After clicking, AI Tools button should be in contained (primary) variant
    expect(aiToolsButton).toHaveClass('MuiButton-contained');
    expect(editorButton).toHaveClass('MuiButton-text');
    
    // Click back to Editor button
    await user.click(editorButton);
    
    // After clicking, Editor button should be in contained (primary) variant again
    expect(editorButton).toHaveClass('MuiButton-contained');
    expect(aiToolsButton).toHaveClass('MuiButton-text');
  });
});
