import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import VersionHistory from '@/components/document/VersionHistory';
import { mockDocumentWithMultipleVersions } from '../utils/testUtils';

describe('VersionHistory', () => {
  const mockOnVersionSelect = vi.fn();
  const mockOnRestore = vi.fn().mockResolvedValue(undefined);
  const mockOnClose = vi.fn();
  
  const renderComponent = (props = {}) => {
    return render(
      <VersionHistory
        document={mockDocumentWithMultipleVersions}
        onVersionSelect={mockOnVersionSelect}
        onRestore={mockOnRestore}
        currentVersionId={mockDocumentWithMultipleVersions.versions[0].id}
        onClose={mockOnClose}
        {...props}
      />
    );
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the version history dialog', () => {
    renderComponent();
    expect(screen.getByText('Version History')).toBeInTheDocument();
  });
  
  it('displays all document versions', () => {
    renderComponent();
    
    // Should show all versions
    const versionItems = screen.getAllByRole('listitem');
    expect(versionItems).toHaveLength(mockDocumentWithMultipleVersions.versions.length);
    
    // Should show timestamps for all versions
    mockDocumentWithMultipleVersions.versions.forEach(version => {
      expect(screen.getByText(new Date(version.timestamp).toLocaleString())).toBeInTheDocument();
    });
  });
  
  it('marks the current version', () => {
    renderComponent();
    
    // The first version should be marked as current
    const currentVersion = screen.getAllByText(/current/i);
    expect(currentVersion).toHaveLength(1);
    
    // Should show the current version indicator
    expect(screen.getByText('Current')).toBeInTheDocument();
  });
  
  it('calls onVersionSelect when a version is clicked', async () => {
    renderComponent();
    
    // Click on the second version (index 1)
    const versionItems = screen.getAllByRole('listitem');
    await userEvent.click(versionItems[1]);
    
    expect(mockOnVersionSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockDocumentWithMultipleVersions.versions[1].id,
      })
    );
  });
  
  it('calls onRestore when restore button is clicked', async () => {
    renderComponent();
    
    // Find and click the restore button for the second version
    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await userEvent.click(restoreButtons[1]);
    
    expect(mockOnRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockDocumentWithMultipleVersions.versions[1].id,
      })
    );
  });
  
  it('disables restore button for the current version', () => {
    renderComponent();
    
    // The first version is the current version, so its restore button should be disabled
    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    expect(restoreButtons[0]).toBeDisabled();
    
    // Other versions should have enabled restore buttons
    for (let i = 1; i < restoreButtons.length; i++) {
      expect(restoreButtons[i]).not.toBeDisabled();
    }
  });
  
  it('shows auto-save indicator for auto-saved versions', () => {
    renderComponent();
    
    // Should show auto-save indicators for auto-saved versions
    const autoSaveChips = screen.getAllByText('Auto-saved');
    const autoSaveVersions = mockDocumentWithMultipleVersions.versions.filter(v => v.isAutoSave);
    
    expect(autoSaveChips).toHaveLength(autoSaveVersions.length);
  });
  
  it('shows a message when no versions are available', () => {
    renderComponent({
      document: {
        ...mockDocumentWithMultipleVersions,
        versions: [],
      },
    });
    
    expect(screen.getByText(/no version history available/i)).toBeInTheDocument();
  });
  
  it('calls onClose when close button is clicked', async () => {
    renderComponent();
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  it('formats dates correctly', () => {
    renderComponent();
    
    mockDocumentWithMultipleVersions.versions.forEach(version => {
      const formattedDate = new Date(version.timestamp).toLocaleString();
      expect(screen.getByText(formattedDate)).toBeInTheDocument();
    });
  });
  
  it('handles keyboard navigation', async () => {
    renderComponent();
    
    // Focus the first version
    const versionItems = screen.getAllByRole('listitem');
    versionItems[0].focus();
    
    // Navigate down to the next version
    fireEvent.keyDown(versionItems[0], { key: 'ArrowDown' });
    expect(versionItems[1]).toHaveFocus();
    
    // Navigate back up
    fireEvent.keyDown(versionItems[1], { key: 'ArrowUp' });
    expect(versionItems[0]).toHaveFocus();
    
    // Test Enter key to select
    fireEvent.keyDown(versionItems[0], { key: 'Enter' });
    expect(mockOnVersionSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockDocumentWithMultipleVersions.versions[0].id,
      })
    );
  });
});
