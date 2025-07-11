import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ExportDialog from '@/components/document/ExportDialog';
import { mockDocument } from '../utils/testUtils';

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock Tauri API
vi.mock('@tauri-apps/api/dialog', () => ({
  save: vi.fn().mockResolvedValue('/path/to/exported/file'),
}));

vi.mock('@tauri-apps/api/fs', () => ({
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

describe('ExportDialog', () => {
  const mockOnClose = vi.fn();
  
  const renderComponent = (props = {}) => {
    return render(
      <ExportDialog
        open={true}
        onClose={mockOnClose}
        document={mockDocument}
        {...props}
      />
    );
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the export dialog', () => {
    renderComponent();
    expect(screen.getByText('Export Document')).toBeInTheDocument();
  });
  
  it('shows export format options', () => {
    renderComponent();
    
    expect(screen.getByLabelText('Format')).toBeInTheDocument();
    expect(screen.getByText('HTML')).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.getByText('Plain Text')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });
  
  it('allows changing the file name', async () => {
    renderComponent();
    
    const fileNameInput = screen.getByLabelText('File Name') as HTMLInputElement;
    expect(fileNameInput.value).toBe(mockDocument.title);
    
    await userEvent.clear(fileNameInput);
    await userEvent.type(fileNameInput, 'New File Name');
    
    expect(fileNameInput.value).toBe('New File Name');
  });
  
  it('allows toggling metadata inclusion', async () => {
    renderComponent();
    
    const metadataCheckbox = screen.getByLabelText('Include document metadata');
    expect(metadataCheckbox).toBeChecked();
    
    await userEvent.click(metadataCheckbox);
    expect(metadataCheckbox).not.toBeChecked();
  });
  
  it('shows the correct file extension based on format', async () => {
    renderComponent();
    
    // Default is HTML
    expect(screen.getByText(/File will be saved as:.*\.html/i)).toBeInTheDocument();
    
    // Change to Markdown
    const formatSelect = screen.getByLabelText('Format');
    await userEvent.click(formatSelect);
    await userEvent.click(screen.getByText('Markdown'));
    
    expect(screen.getByText(/File will be saved as:.*\.md/i)).toBeInTheDocument();
  });
  
  it('calls onClose when cancel button is clicked', async () => {
    renderComponent();
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  it('disables export button when file name is empty', async () => {
    renderComponent();
    
    const fileNameInput = screen.getByLabelText('File Name');
    await userEvent.clear(fileNameInput);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });
  
  it('shows loading state during export', async () => {
    // Mock a slow export
    const { saveAs } = await import('file-saver');
    (saveAs as any).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    renderComponent();
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    await userEvent.click(exportButton);
    
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    expect(exportButton).toBeDisabled();
  });
  
  it('shows error message when export fails', async () => {
    // Mock a failed export
    const { saveAs } = await import('file-saver');
    (saveAs as any).mockRejectedValueOnce(new Error('Export failed'));
    
    renderComponent();
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    await userEvent.click(exportButton);
    
    // Wait for the error message
    await waitFor(() => {
      expect(screen.getByText(/export failed/i)).toBeInTheDocument();
    });
  });
  
  it('uses Tauri file dialog when running in Tauri', async () => {
    // Mock Tauri environment
    const originalTauri = window.__TAURI__;
    window.__TAURI__ = {
      invoke: vi.fn(),
    };
    
    renderComponent();
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    await userEvent.click(exportButton);
    
    // Should have used Tauri's save dialog
    const { save } = await import('@tauri-apps/api/dialog');
    expect(save).toHaveBeenCalled();
    
    // Cleanup
    window.__TAURI__ = originalTauri;
  });
});
