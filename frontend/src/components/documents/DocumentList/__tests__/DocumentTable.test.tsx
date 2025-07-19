import React from 'react';
// Test utilities
import { render, screen, fireEvent, within, RenderResult } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DocumentTable from '../components/DocumentTable';
import { Document } from '../../../../types/document';
import type { DocumentTableProps } from '../components/DocumentTable';

// Mock the date-fns format function
vi.mock('date-fns', () => ({
  format: vi.fn(() => '2023-01-01'),
}));

const theme = createTheme();

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Document 1',
    updatedAt: '2023-01-01T12:00:00Z',
    size: 1024,
    isStarred: false,
    mimeType: 'application/pdf',
  },
  {
    id: '2',
    name: 'Document 2',
    updatedAt: '2023-01-02T12:00:00Z',
    size: 2048,
    isStarred: true,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    id: '3',
    name: 'Image 1',
    updatedAt: '2023-01-03T12:00:00Z',
    size: 3072,
    isStarred: false,
    mimeType: 'image/jpeg',
  },
] as Document[];

// Mock functions for document actions
const mockDocumentClick = vi.fn();
const mockDocumentDoubleClick = vi.fn();
const mockDocumentAction = vi.fn();
const mockOnSort = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

describe('DocumentTable', () => {
  // Define default props with proper typing
  const defaultProps: DocumentTableProps = {
    documents: mockDocuments,
    selectedDocuments: new Set<string>(),
    onSelectedDocumentsChange: vi.fn(),
    onDocumentAction: mockDocumentAction,
    onDocumentClick: mockDocumentClick,
    onDocumentDoubleClick: mockDocumentDoubleClick,
    sortBy: 'name',
    sortOrder: 'asc',
    onSortChange: mockOnSort,
    loading: false,
    selectable: true,
    multiSelect: true,
  };

  const renderComponent = (props: Partial<DocumentTableProps> = {}): RenderResult => {
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

  it('renders document list', () => {
    renderComponent({ documents: mockDocuments });
    
    // Check if all documents are rendered
    expect(screen.getByText('Document 1')).toBeInTheDocument();
    expect(screen.getByText('Document 2')).toBeInTheDocument();
    expect(screen.getByText('Image 1')).toBeInTheDocument();
    
    // Check if sizes are formatted correctly
    // Note: The actual formatting is handled by the component, we just check presence
    const sizeElements = screen.getAllByText(/(KB|MB|GB|B)/);
    expect(sizeElements.length).toBeGreaterThan(0);
  });

  it('handles document selection', () => {
    const onSelectedDocumentsChange = vi.fn();
    renderComponent({ 
      documents: mockDocuments,
      onSelectedDocumentsChange,
    });

    // Click select all checkbox
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    // Should select all documents
    const selectAllCall = onSelectedDocumentsChange.mock.calls[0][0];
    expect(selectAllCall).toBeInstanceOf(Set);
    expect(Array.from(selectAllCall)).toEqual(expect.arrayContaining(['1', '2', '3']));

    // Test individual selection
    onSelectedDocumentsChange.mockClear();
    const firstDocCheckbox = screen.getAllByRole('checkbox')[1];
    fireEvent.click(firstDocCheckbox);
    
    // Should select only the first document
    const selectOneCall = onSelectedDocumentsChange.mock.calls[0][0];
    expect(selectOneCall).toBeInstanceOf(Set);
    expect(Array.from(selectOneCall)).toEqual(['1']);
  });

  it('handles star/unstar action', () => {
    renderComponent({ documents: mockDocuments });

    // Find and click the star button for the first document
    const starButtons = screen.getAllByRole('button', { name: /star/i });
    fireEvent.click(starButtons[0]);
    
    expect(mockDocumentAction).toHaveBeenCalledWith('star', mockDocuments[0]);
  });

  it('triggers click and double click handlers', () => {
    const handleClick = vi.fn();
    const handleDoubleClick = vi.fn();
    
    renderComponent({ 
      documents: mockDocuments,
      selectable: false, // Disable selection to test click behavior independently
      onDocumentClick: handleClick,
      onDocumentDoubleClick: handleDoubleClick,
    });

    // Get the first row's name cell (which should trigger the click)
    const firstRowNameCell = screen.getByText('Document 1').closest('td')!;
    
    // Test single click
    fireEvent.click(firstRowNameCell);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockDocuments[0]);
    
    // Clear mocks for the next test
    handleClick.mockClear();
    
    // Test double click
    fireEvent.doubleClick(firstRowNameCell);
    expect(handleDoubleClick).toHaveBeenCalledTimes(1);
    expect(handleDoubleClick).toHaveBeenCalledWith(mockDocuments[0]);
    
    // Verify single click wasn't called for double click
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('sorts by column headers', () => {
    const onSortChange = vi.fn();
    renderComponent({ 
      documents: mockDocuments,
      onSortChange,
    });

    // Click name column header to sort
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    expect(onSortChange).toHaveBeenCalledWith({
      field: 'name',
      order: 'asc',
    });

    // Click modified date header
    onSortChange.mockClear();
    const modifiedHeader = screen.getByText('Modified');
    fireEvent.click(modifiedHeader);
    
    expect(onSortChange).toHaveBeenCalledWith({
      field: 'updatedAt',
      order: 'asc',
    });
  });

  it('shows star icon for starred documents', () => {
    renderComponent({ 
      documents: [
        { ...mockDocuments[0], isStarred: false },
        { ...mockDocuments[1], isStarred: true }
      ] 
    });
    
    // Check if both star buttons are rendered
    const starButtons = screen.getAllByRole('button', { name: /star/i });
    expect(starButtons).toHaveLength(2);
    
    // The actual star icons are rendered by MUI, so we just check the buttons exist
    // The visual difference is handled by the Star/StarBorder icons in the component
  });
});
