import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock the bytesToSize utility
vi.mock('../utils', () => ({
  bytesToSize: (bytes: number) => {
    if (bytes === 1024) return '1 KB';
    if (bytes === 2048) return '2 KB';
    return '0 KB';
  },
}));
import DocumentTable from './DocumentTable';
import { Document } from '../../../../types/document';

// Mock the date-fns format function
vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('2023-05-15'),
}));

// Mock the bytesToSize utility

describe('DocumentTable', () => {
  const mockDocuments: Document[] = [
    {
      id: '1',
      name: 'Document 1',
      size: 1024,
      type: 'document',
      mimeType: 'application/pdf',
      extension: 'pdf',
      createdAt: '2023-05-15T10:00:00Z',
      updatedAt: '2023-05-15T10:00:00Z',
      isStarred: false,
      isShared: false,
      isDeleted: false,
      tags: ['test', 'document'],
      permissions: {
        canEdit: true,
        canDelete: true,
        canShare: true
      }
    },
    {
      id: '2',
      name: 'Document 2',
      size: 2048,
      type: 'spreadsheet',
      mimeType: 'application/vnd.ms-excel',
      extension: 'xlsx',
      createdAt: '2023-05-16T11:00:00Z',
      updatedAt: '2023-05-16T11:30:00Z',
      isStarred: true,
      isShared: true,
      isDeleted: false,
      tags: ['spreadsheet', 'finance'],
      permissions: {
        canEdit: true,
        canDelete: false,
        canShare: true
      }
    },
  ];

  const defaultProps = {
    documents: mockDocuments,
    selectedDocuments: new Set<string>(),
    onSelectedDocumentsChange: vi.fn(),
    onDocumentClick: vi.fn(),
    onDocumentDoubleClick: vi.fn(),
    onDocumentAction: vi.fn(),
    sortBy: 'name',
    sortOrder: 'asc' as const,
    onSortChange: vi.fn(),
    selectable: true,
    multiSelect: true,
    loading: false,
  };

  const renderComponent = (props = {}) => {
    const theme = createTheme();
    return render(
      <ThemeProvider theme={theme}>
        <DocumentTable {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    renderComponent({ loading: true });
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    renderComponent({ documents: [] });
    expect(screen.getByText('No documents found')).toBeInTheDocument();
  });

  it('renders documents with correct data', () => {
    renderComponent();
    
    // Check if document names are rendered
    expect(screen.getByText('Document 1')).toBeInTheDocument();
    expect(screen.getByText('Document 2')).toBeInTheDocument();
    
    // Check if the document sizes are rendered (using the mocked bytesToSize utility)
    const sizeCells = screen.getAllByText(/\d+ KB/);
    expect(sizeCells.length).toBeGreaterThanOrEqual(2);
  });

  it('handles document selection', () => {
    renderComponent();
    
    // Click on the first document's checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First checkbox is the select-all checkbox
    
    expect(defaultProps.onSelectedDocumentsChange).toHaveBeenCalledWith(new Set(['1']));
  });

  it('handles select all', () => {
    renderComponent();
    
    // Click on the select-all checkbox (the first checkbox in the table)
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    expect(defaultProps.onSelectedDocumentsChange).toHaveBeenCalledWith(new Set(['1', '2']));
  });

  it('handles document click', () => {
    renderComponent();
    
    // Click on the first document row text
    const documentName = screen.getByText('Document 1');
    fireEvent.click(documentName);
    
    expect(defaultProps.onDocumentClick).toHaveBeenCalledWith(mockDocuments[0]);
  });

  it('calls onDocumentDoubleClick when a document row is double-clicked', () => {
    // Arrange
    const mockHandleDoubleClick = vi.fn();
    const testDocument = mockDocuments[0];
    
    render(
      <ThemeProvider theme={createTheme()}>
        <DocumentTable
          {...defaultProps}
          documents={[testDocument]}
          onDocumentDoubleClick={mockHandleDoubleClick}
        />
      </ThemeProvider>
    );
    
    // Act - fire the double-click event on the TableRow
    const row = screen.getByTestId('document-row-1');
    expect(row).toBeInTheDocument();
    fireEvent.dblClick(row);
    
    // Assert - verify our handler was called with the correct document
    expect(mockHandleDoubleClick).toHaveBeenCalledTimes(1);
    expect(mockHandleDoubleClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        name: 'Document 1',
        size: 1024,
        type: 'document',
        mimeType: 'application/pdf'
      })
    );
  });
  
  // Add a test to verify the component renders with the correct props
  it('renders with the correct props', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <DocumentTable
          documents={mockDocuments}
          selectedDocuments={new Set()}
          onSelectedDocumentsChange={() => {}}
          onDocumentClick={() => {}}
          onDocumentDoubleClick={() => {}}
          onDocumentAction={() => {}}
        />
      </ThemeProvider>
    );
    
    // Verify the document names are rendered
    expect(screen.getByText('Document 1')).toBeInTheDocument();
    expect(screen.getByText('Document 2')).toBeInTheDocument();
  });

  it('handles sort change', () => {
    renderComponent();
    
    // Click on the name column header to sort
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    expect(defaultProps.onSortChange).toHaveBeenCalledWith({
      field: 'name',
      order: 'desc', // Toggles from default 'asc' to 'desc'
    });
  });

  it('does not trigger row click when clicking on checkboxes', () => {
    renderComponent();
    
    // Find and click on the first document's checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First checkbox is the select-all checkbox
    
    // Should not trigger row click handler
    expect(defaultProps.onDocumentClick).not.toHaveBeenCalled();
    
    // Should trigger the selection change
    expect(defaultProps.onSelectedDocumentsChange).toHaveBeenCalled();
  });
});
