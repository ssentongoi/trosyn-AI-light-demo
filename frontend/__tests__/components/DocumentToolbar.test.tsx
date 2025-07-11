import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import DocumentToolbar from '@/components/document/DocumentToolbar';
import { Document } from '@/types/tauri';

// Mock the dialogs
vi.mock('@/components/document/VersionHistory', () => ({
  __esModule: true,
  default: ({ onClose, onRestore }: { onClose: () => void; onRestore: (version: any) => void }) => (
    <div data-testid="version-history">
      <button onClick={onClose}>Close History</button>
      <button onClick={() => onRestore({ id: 'version-1', content: {}, timestamp: '2023-01-01', isAutoSave: false })}>
        Restore Version
      </button>
    </div>
  ),
}));

vi.mock('@/components/document/ExportDialog', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="export-dialog">
      <button onClick={onClose}>Close Export</button>
    </div>
  ),
}));

vi.mock('@/components/document/ShareDialog', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="share-dialog">
      <button onClick={onClose}>Close Share</button>
    </div>
  ),
}));

describe('DocumentToolbar', () => {
  const mockDocument: Document = {
    id: 'doc-1',
    title: 'Test Document',
    content: { blocks: [] },
    versions: [
      {
        id: 'version-1',
        timestamp: '2023-01-01T00:00:00Z',
        content: { blocks: [] },
        isAutoSave: false,
      },
    ],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    isDirty: false,
  };

  const mockOnSave = vi.fn().mockResolvedValue(undefined);
  const mockOnOpen = vi.fn().mockResolvedValue(undefined);
  const mockOnNew = vi.fn();
  const mockOnDocumentUpdate = vi.fn();

  const renderToolbar = (props = {}) => {
    return render(
      <DocumentToolbar
        document={mockDocument}
        onSave={mockOnSave}
        onOpen={mockOnOpen}
        onNew={mockOnNew}
        isSaving={false}
        hasUnsavedChanges={false}
        onDocumentUpdate={mockOnDocumentUpdate}
        {...props}
      />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the document title', () => {
    renderToolbar();
    expect(screen.getByText('Test Document')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    renderToolbar({ hasUnsavedChanges: true });
    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('shows version history when history button is clicked', async () => {
    renderToolbar();
    const historyButton = screen.getByLabelText(/version history/i);
    await userEvent.click(historyButton);
    expect(screen.getByTestId('version-history')).toBeInTheDocument();
  });

  it('shows export dialog when export is selected from menu', async () => {
    renderToolbar();
    const menuButton = screen.getByLabelText(/more options/i);
    await userEvent.click(menuButton);
    
    const exportButton = screen.getByText(/export/i);
    await userEvent.click(exportButton);
    
    expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
  });

  it('shows share dialog when share button is clicked', async () => {
    renderToolbar();
    const shareButton = screen.getByLabelText(/share/i);
    await userEvent.click(shareButton);
    expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
  });

  it('disables save button when no unsaved changes', () => {
    renderToolbar({ hasUnsavedChanges: false });
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when there are unsaved changes', () => {
    renderToolbar({ hasUnsavedChanges: true });
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('shows loading state when saving', () => {
    renderToolbar({ isSaving: true, hasUnsavedChanges: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('calls onNew when New Document is selected from menu', async () => {
    renderToolbar();
    const menuButton = screen.getByLabelText(/more options/i);
    await userEvent.click(menuButton);
    
    const newButton = screen.getByText(/new document/i);
    await userEvent.click(newButton);
    
    expect(mockOnNew).toHaveBeenCalledTimes(1);
  });

  it('calls onOpen when Open is selected from menu', async () => {
    renderToolbar();
    const menuButton = screen.getByLabelText(/more options/i);
    await userEvent.click(menuButton);
    
    const openButton = screen.getByText(/open/i);
    await userEvent.click(openButton);
    
    expect(mockOnOpen).toHaveBeenCalledTimes(1);
  });

  it('disables compare versions when only one version exists', async () => {
    renderToolbar({
      document: {
        ...mockDocument,
        versions: [mockDocument.versions[0]],
      },
    });
    
    const menuButton = screen.getByLabelText(/more options/i);
    await userEvent.click(menuButton);
    
    const compareButton = screen.getByText(/compare versions/i);
    expect(compareButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('enables compare versions when multiple versions exist', async () => {
    renderToolbar({
      document: {
        ...mockDocument,
        versions: [
          ...mockDocument.versions,
          {
            id: 'version-2',
            timestamp: '2023-01-02T00:00:00Z',
            content: { blocks: [] },
            isAutoSave: false,
          },
        ],
      },
    });
    
    const menuButton = screen.getByLabelText(/more options/i);
    await userEvent.click(menuButton);
    
    const compareButton = screen.getByText(/compare versions/i);
    expect(compareButton).not.toHaveAttribute('aria-disabled', 'true');
  });
});
