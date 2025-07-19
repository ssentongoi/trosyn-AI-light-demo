import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { vi, expect, describe, test, beforeEach, afterEach, beforeAll } from 'vitest';
import { DocumentProvider } from '@/contexts/DocumentContext';
import EditorPage from '../pages/EditorPage';
import React from 'react';
import { EnhancedDocument } from '@/types/document';

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

// Mock the Tauri FS API with comprehensive mocks
vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn().mockResolvedValue('Test content'),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(true),
  createDir: vi.fn().mockResolvedValue(undefined),
  BaseDirectory: { AppData: 'appData' },
  readDir: vi.fn().mockResolvedValue([]),
  removeFile: vi.fn().mockResolvedValue(undefined),
  removeDir: vi.fn().mockResolvedValue(undefined),
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

// Mock document data
const mockDocument: EnhancedDocument = {
  id: 'doc-123',
  name: 'Test Document',
  title: 'Test Document',
  content: 'Test content',
  path: '/test/path',
  mimeType: 'text/plain',
  size: 1024,
  url: 'http://example.com/test-document',
  versions: [{
    id: 'v1',
    content: 'Test content',
    createdAt: new Date().toISOString(),
    version: 1,
    isCurrentVersion: true,
    downloadCount: 0,
    viewCount: 0,
    shareCount: 0,
    commentsCount: 0,
    tasksCount: 0,
    completedTasksCount: 0,
    isTemplate: false,
  }],
  tags: [],
  sharedWith: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com'
  },
  isPermanent: false,
  workflow: {
    status: 'draft',
    step: 'editing'
  },
  permissions: {
    canEdit: true,
    canDelete: true,
    canShare: true
  }
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

  test('renders editor page', async () => {
    renderEditor();
    // Check for the editor container or any element that confirms the editor is rendered
    const editorContainer = await screen.findByRole('textbox');
    expect(editorContainer).toBeInTheDocument();
  });

  test('renders document editor with toolbar', async () => {
    renderEditor();
    
    // Check for toolbar buttons
    const saveButton = await screen.findByRole('button', { name: /save/i });
    const exportButton = screen.getByRole('button', { name: /export/i });
    
    expect(saveButton).toBeInTheDocument();
    expect(exportButton).toBeInTheDocument();
    
    // Check for the editor container
    const editorContainer = await screen.findByRole('textbox');
    expect(editorContainer).toBeInTheDocument();
  });

  test('initializes editor instance', async () => {
    renderEditor();
    const editorContainer = await screen.findByRole('textbox');
    expect(editorContainer).toBeInTheDocument();
  });

  test('handles document save', async () => {
    const user = userEvent.setup();
    renderEditor();
    
    // Mock the save function
    const saveButton = await screen.findByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    // Verify save was called through the Tauri invoke mock
    expect(mockInvoke).toHaveBeenCalledWith('save_document', expect.any(Object));
  });
  
  test('handles document export', async () => {
    const user = userEvent.setup();
    renderEditor();
    
    // Click the export button
    const exportButton = await screen.findByRole('button', { name: /export/i });
    await user.click(exportButton);
    
    // Verify export options are shown
    // Note: This assumes your export functionality shows a dialog with these options
    // You might need to adjust these selectors based on your actual UI
    const exportDialog = await screen.findByRole('dialog');
    expect(exportDialog).toBeInTheDocument();
    expect(screen.getByText(/export as/i)).toBeInTheDocument();
  });
  
  test('handles document save', async () => {
    const user = userEvent.setup();
    renderEditor();
    
    // Mock the editor save function
    const EditorJS = (await import('@editorjs/editorjs')).default;
    const mockInstance = new EditorJS();
    mockInstance.save = vi.fn().mockResolvedValue({
      blocks: [
        { type: 'header', data: { text: 'Test Header', level: 1 } },
        { type: 'paragraph', data: { text: 'Test paragraph' } }
      ]
    });
    
    // Click the save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    // Verify save was called
    expect(mockInstance.save).toHaveBeenCalled();
  });
  
  test('handles document export', async () => {
    const user = userEvent.setup();
    renderEditor();
    
    // Click the export button
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);
    
    // Verify export options are shown
    expect(screen.getByText('Export As')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('DOCX')).toBeInTheDocument();
  });
});