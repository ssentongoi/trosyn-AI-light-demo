import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import DocumentComparison from '@/components/document/DocumentComparison';
import { mockDocumentWithMultipleVersions } from '../utils/testUtils';

// Mock Monaco Editor since it's not needed for unit tests
vi.mock('@monaco-editor/react', () => ({
  DiffEditor: ({ original, modified }: { original: string; modified: string }) => (
    <div data-testid="diff-editor">
      <div data-testid="original">{original}</div>
      <div data-testid="modified">{modified}</div>
    </div>
  ),
}));

describe('DocumentComparison', () => {
  const mockDocument = mockDocumentWithMultipleVersions;
  const mockOnClose = vi.fn();
  const mockOnRestore = vi.fn().mockResolvedValue(undefined);
  
  const renderComponent = (props = {}) => {
    return render(
      <DocumentComparison
        open={true}
        onClose={mockOnClose}
        document={mockDocument}
        onRestore={mockOnRestore}
        {...props}
      />
    );
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the comparison dialog', () => {
    renderComponent();
    expect(screen.getByText('Compare Document Versions')).toBeInTheDocument();
  });
  
  it('allows selecting versions to compare', async () => {
    renderComponent();
    
    // Should show version selection UI by default
    expect(screen.getByText('Original Version')).toBeInTheDocument();
    expect(screen.getByText('Compare With')).toBeInTheDocument();
    
    // Should show version content when selected
    const versionSelects = screen.getAllByRole('combobox');
    expect(versionSelects).toHaveLength(2);
    
    // The first version should be selected by default for "Compare With"
    const compareButton = screen.getByRole('button', { name: /compare versions/i });
    expect(compareButton).toBeInTheDocument();
  });
  
  it('shows diff view when versions are compared', async () => {
    renderComponent();
    
    // Click the compare button
    const compareButton = screen.getByRole('button', { name: /compare versions/i });
    await userEvent.click(compareButton);
    
    // Should show the diff editor
    expect(screen.getByTestId('diff-editor')).toBeInTheDocument();
    
    // Should show the change versions button
    expect(screen.getByText('Change Versions')).toBeInTheDocument();
  });
  
  it('allows restoring a version', async () => {
    renderComponent();
    
    // Go to compare view
    const compareButton = screen.getByRole('button', { name: /compare versions/i });
    await userEvent.click(compareButton);
    
    // Click restore button
    const restoreButton = screen.getByRole('button', { name: /restore left version/i });
    await userEvent.click(restoreButton);
    
    // Should call onRestore with the selected version
    expect(mockOnRestore).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.any(String),
      content: expect.any(Object),
    }));
  });
  
  it('shows a message when no versions are available', () => {
    renderComponent({
      document: {
        ...mockDocument,
        versions: [],
      },
    });
    
    expect(screen.getByText(/no versions available/i)).toBeInTheDocument();
  });
  
  it('calls onClose when close button is clicked', async () => {
    renderComponent();
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  it('shows version timestamps in the UI', () => {
    renderComponent();
    
    // Should show timestamps for all versions in the dropdowns
    mockDocument.versions.forEach(version => {
      expect(screen.getByText(new Date(version.timestamp).toLocaleString())).toBeInTheDocument();
    });
  });
  
  it('disables the compare button when the same version is selected', async () => {
    renderComponent();
    
    // Select the same version for both dropdowns
    const [leftSelect, rightSelect] = screen.getAllByRole('combobox');
    
    // Select the first version for both dropdowns
    await userEvent.click(leftSelect);
    const options = await screen.findAllByRole('option');
    await userEvent.click(options[0]); // Select first version
    
    await userEvent.click(rightSelect);
    await userEvent.click(options[0]); // Select same version
    
    // Compare button should be disabled
    const compareButton = screen.getByRole('button', { name: /compare versions/i });
    expect(compareButton).toBeDisabled();
  });
});
