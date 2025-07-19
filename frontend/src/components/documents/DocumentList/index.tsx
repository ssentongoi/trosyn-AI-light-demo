import React, { useCallback, useMemo, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Document } from '../../../types/document';
import { DocumentFilter, DocumentListProps, DocumentSort, SortField } from './types';
import DocumentToolbar from './components/DocumentToolbar';
import DocumentTable from './components/DocumentTable';
import DocumentPagination from './components/DocumentPagination';
import { useDocumentApi } from '../../../contexts/DocumentApiContext';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT: DocumentSort = { field: 'updatedAt', order: 'desc' };

export const DocumentList: React.FC<DocumentListProps> = ({
  // Data
  documents: externalDocuments = [],
  selectedDocuments: externalSelectedDocuments = [],
  loading: externalLoading = false,
  error: externalError = null,
  
  // Pagination
  totalItems: externalTotalItems,
  page: externalPage = 0,
  pageSize: externalPageSize = DEFAULT_PAGE_SIZE,
  onPageChange: externalOnPageChange,
  onPageSizeChange: externalOnPageSizeChange,
  
  // Selection
  selectable = true,
  multiSelect = true,
  onSelectedDocumentsChange: externalOnSelectedDocumentsChange,
  
  // Sorting
  sortBy: externalSortBy = DEFAULT_SORT.field as SortField,
  sortOrder: externalSortOrder = DEFAULT_SORT.order,
  onSortChange: externalOnSortChange,
  
  // Filtering
  filters: externalFilters = {},
  onFilterChange: externalOnFilterChange,
  
  // Actions
  onDocumentClick,
  onDocumentDoubleClick,
  onDocumentDelete: externalOnDocumentDelete,
  onDocumentDownload: externalOnDocumentDownload,
  onDocumentShare: externalOnDocumentShare,
  onDocumentEdit,
  onDocumentStar,
  
  // UI Customization
  emptyState,
  rowActions = [],
  
  // Styling
  className = '',
  style = {},
}) => {
  // Use context for document operations if not provided via props
  const context = useDocumentApi();
  
  // Local state for controlled/uncontrolled behavior
  const [localPage, setLocalPage] = useState(0);
  const [localPageSize, setLocalPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [localSort, setLocalSort] = useState<DocumentSort>(DEFAULT_SORT);
  const [localFilters, setLocalFilters] = useState<DocumentFilter>({});
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  
  // Determine if component is controlled or uncontrolled for pagination
  const isPageControlled = externalOnPageChange !== undefined;
  const isPageSizeControlled = externalOnPageSizeChange !== undefined;
  const isSortControlled = externalOnSortChange !== undefined;
  const isFilterControlled = externalOnFilterChange !== undefined;
  const isSelectionControlled = externalOnSelectedDocumentsChange !== undefined;
  
  // Use controlled or uncontrolled values
  const page = isPageControlled ? externalPage : localPage;
  const pageSize = isPageSizeControlled ? externalPageSize : localPageSize;
  const sortBy = isSortControlled ? externalSortBy : localSort.field;
  const sortOrder = isSortControlled ? externalSortOrder : localSort.order;
  const filters = isFilterControlled ? externalFilters : localFilters;
  
  // Calculate total items (use external if provided, otherwise use documents length)
  const totalItems = externalTotalItems !== undefined ? externalTotalItems : externalDocuments.length;
  
  // Handle pagination changes
  const handlePageChange = useCallback((newPage: number) => {
    if (isPageControlled) {
      externalOnPageChange?.(newPage);
    } else {
      setLocalPage(newPage);
    }
  }, [isPageControlled, externalOnPageChange]);
  
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    if (isPageSizeControlled) {
      externalOnPageSizeChange?.(newPageSize);
    } else {
      setLocalPageSize(newPageSize);
      setLocalPage(0); // Reset to first page when page size changes
    }
  }, [isPageSizeControlled, externalOnPageSizeChange]);
  
  // Handle sort change
  const handleSortChange = useCallback((sort: { field: SortField; order: 'asc' | 'desc' }) => {
    if (isSortControlled) {
      externalOnSortChange?.(sort);
    } else {
      setLocalSort(sort);
    }
  }, [isSortControlled, externalOnSortChange]);
  
  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: DocumentFilter) => {
    if (isFilterControlled) {
      externalOnFilterChange?.(newFilters);
    } else {
      setLocalFilters(newFilters);
    }
    // Reset to first page when filters change
    handlePageChange(0);
  }, [isFilterControlled, externalOnFilterChange, handlePageChange]);
  
  // Handle selection changes
  const handleSelectedDocumentsChange = useCallback((newSelected: Set<string>) => {
    if (isSelectionControlled) {
      externalOnSelectedDocumentsChange?.(Array.from(newSelected));
    } else {
      setSelectedDocuments(newSelected);
    }
  }, [isSelectionControlled, externalOnSelectedDocumentsChange]);
  
  // Document action handlers
  const handleDocumentSelect = useCallback((document: Document) => {
    onDocumentClick?.(document);
  }, [onDocumentClick]);
  
  const handleDocumentAction = useCallback((action: string, document: Document) => {
    switch (action) {
      case 'view':
        onDocumentClick?.(document);
        break;
      case 'edit':
        onDocumentEdit?.(document);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete "${document.name}"?`)) {
          externalOnDocumentDelete?.(document.id);
        }
        break;
      case 'download':
        externalOnDocumentDownload?.(document);
        break;
      case 'share':
        externalOnDocumentShare?.(document);
        break;
      case 'star':
        onDocumentStar?.(document, !document.isStarred);
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  }, [onDocumentClick, onDocumentEdit, externalOnDocumentDelete, externalOnDocumentDownload, externalOnDocumentShare, onDocumentStar]);
  
  // Calculate paginated documents
  const paginatedDocuments = useMemo(() => {
    if (isPageControlled || externalTotalItems !== undefined) {
      return externalDocuments; // Server-side pagination
    }
    
    // Client-side pagination
    const startIndex = page * pageSize;
    return externalDocuments.slice(startIndex, startIndex + pageSize);
  }, [externalDocuments, page, pageSize, isPageControlled, externalTotalItems]);
  
  // Render loading state
  if (externalLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Render error state
  if (externalError) {
    return (
      <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">
          {typeof externalError === 'string' ? externalError : 'An error occurred while loading documents.'}
        </Typography>
      </Paper>
    );
  }
  
  // Render empty state
  if (externalDocuments.length === 0) {
    return emptyState || (
      <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No documents found.
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Box className={`document-list ${className}`} style={style}>
      <DocumentToolbar
        selectedCount={selectedDocuments.size}
        onFilterChange={handleFilterChange}
        filters={filters}
        rowActions={rowActions}
      />
      
      <DocumentTable
        documents={paginatedDocuments}
        selectedDocuments={selectedDocuments}
        onSelectedDocumentsChange={handleSelectedDocumentsChange}
        onDocumentClick={handleDocumentSelect}
        onDocumentDoubleClick={onDocumentDoubleClick}
        onDocumentAction={handleDocumentAction}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        selectable={selectable}
        multiSelect={multiSelect}
      />
      
      <DocumentPagination
        count={totalItems}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handlePageSizeChange}
      />
    </Box>
  );
};

// Set display name for debugging
DocumentList.displayName = 'DocumentList';
