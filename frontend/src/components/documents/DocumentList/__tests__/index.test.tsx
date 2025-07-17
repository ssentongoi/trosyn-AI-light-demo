import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DocumentList } from '..';
import { Document } from '../../../../types/document';

// Mock the subcomponents
vi.mock('../components/DocumentTable', () => ({
  __esModule: true,
  default: vi.fn(() => <div data-testid="mock-document-table" />)
}));

vi.mock('../components/DocumentToolbar', () => ({
  __esModule: true,
  default: vi.fn(() => <div data-testid="mock-document-toolbar" />)
}));

vi.mock('../components/DocumentPagination', () => ({
  __esModule: true,
  default: vi.fn(() => <div data-testid="mock-document-pagination" />)
}));

const theme = createTheme();

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Document 1',
    updatedAt: '2023-01-01T12:00:00Z',
    size: 1024,
    mimeType: 'application/pdf',
    isStarred: false,
  },
  {
    id: '2',
    name: 'Document 2',
    updatedAt: '2023-01-02T12:00:00Z',
    size: 2048,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    isStarred: true,
  },
] as Document[];

describe('DocumentList', () => {
  const defaultProps = {
    documents: mockDocuments,
    loading: false,
    error: null,
    onDocumentClick: vi.fn(),
    onDocumentDoubleClick: vi.fn(),
    onDocumentAction: vi.fn(),
    onUpload: vi.fn(),
    onDelete: vi.fn(),
    onDownload: vi.fn(),
    onShare: vi.fn(),
    onStar: vi.fn(),
    onFilterChange: vi.fn(),
    onSortChange: vi.fn(),
    onPageChange: vi.fn(),
    onRowsPerPageChange: vi.fn(),
    pagination: {
      page: 0,
      rowsPerPage: 10,
      total: 100,
    },
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <DocumentList {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  it('renders loading state', () => {
    renderComponent({ loading: true });
    expect(screen.getByTestId('mock-document-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('mock-document-table')).toBeInTheDocument();
    // Table should be in loading state
  });

  it('renders error state', () => {
    const errorMessage = 'Failed to load documents';
    renderComponent({ error: new Error(errorMessage) });
    
    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    renderComponent({ 
      documents: [],
      pagination: { ...defaultProps.pagination, total: 0 } 
    });
    
    expect(screen.getByTestId('mock-document-table')).toBeInTheDocument();
    // Table should show empty state
  });

  it('handles document selection', async () => {
    const onDocumentClick = vi.fn();
    const onDocumentDoubleClick = vi.fn();
    
    renderComponent({ onDocumentClick, onDocumentDoubleClick });
    
    // Simulate document click from the table
    const table = screen.getByTestId('mock-document-table');
    fireEvent.click(table);
    
    // In a real test, we would check if the click handler was called with the correct document
    // This is simplified since we're mocking the table component
    expect(onDocumentClick).toHaveBeenCalled();
  });

  it('handles document actions', () => {
    const onDocumentAction = vi.fn();
    renderComponent({ onDocumentAction });
    
    // Simulate document action from the table
    const table = screen.getByTestId('mock-document-table');
    fireEvent.click(table);
    
    // In a real test, we would simulate specific actions like star, delete, etc.
    // This is simplified since we're mocking the table component
    expect(onDocumentAction).toHaveBeenCalled();
  });

  it('handles pagination changes', () => {
    const onPageChange = vi.fn();
    const onRowsPerPageChange = vi.fn();
    
    renderComponent({ onPageChange, onRowsPerPageChange });
    
    // Simulate pagination changes
    const pagination = screen.getByTestId('mock-document-pagination');
    fireEvent.click(pagination);
    
    // In a real test, we would simulate page changes and rows per page changes
    // This is simplified since we're mocking the pagination component
    expect(onPageChange).toHaveBeenCalled();
    expect(onRowsPerPageChange).toHaveBeenCalled();
  });

  it('handles search and filter changes', () => {
    const onFilterChange = vi.fn();
    renderComponent({ onFilterChange });
    
    // Simulate search input change
    const toolbar = screen.getByTestId('mock-document-toolbar');
    fireEvent.change(toolbar, { target: { value: 'test' } });
    
    // In a real test, we would simulate filter changes from the toolbar
    // This is simplified since we're mocking the toolbar component
    expect(onFilterChange).toHaveBeenCalled();
  });

  it('handles document upload', () => {
    const onUpload = vi.fn();
    renderComponent({ onUpload });
    
    // Simulate upload button click
    const toolbar = screen.getByTestId('mock-document-toolbar');
    fireEvent.click(toolbar);
    
    // In a real test, we would simulate file selection and upload
    // This is simplified since we're mocking the toolbar component
    expect(onUpload).toHaveBeenCalled();
  });

  it('handles view mode changes', () => {
    const onViewModeChange = vi.fn();
    renderComponent({ onViewModeChange });
    
    // Simulate view mode change
    const toolbar = screen.getByTestId('mock-document-toolbar');
    fireEvent.click(toolbar);
    
    // In a real test, we would simulate clicking the view mode toggle
    // This is simplified since we're mocking the toolbar component
    expect(onViewModeChange).toHaveBeenCalled();
  });
});
