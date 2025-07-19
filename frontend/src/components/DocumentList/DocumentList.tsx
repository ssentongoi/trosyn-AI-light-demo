import React, { useState, useCallback, useMemo, memo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDocumentSelection } from './hooks/useDocumentSelection';
import { useDocumentFilters } from './hooks/useDocumentFilters';
import { useDocumentSorting } from './hooks/useDocumentSorting';
import { useDocuments } from './hooks/useDocuments';
import { DocumentListHeader } from './components/DocumentListHeader';
import { DocumentListTable } from './components/DocumentListTable';
import { DocumentListEmptyState } from './components/DocumentListEmptyState';
import { DocumentListLoadingState } from './components/DocumentListLoadingState';
import type { 
  Document, 
  DocumentListProps,
  DocumentSort,
  DocumentFilter
} from './types/DocumentList.types';

const DocumentListComponent: React.FC<DocumentListProps> = ({
  documents = [],
  selectedDocuments: externalSelectedDocuments,
  defaultSelectedDocuments = [],
  onSelectedDocumentsChange,
  filters: externalFilters,
  defaultFilters = {},
  onFiltersChange,
  sort: externalSort,
  defaultSort = { field: 'updatedAt', direction: 'desc' as const },
  onSortChange,
  loading = false,
  error,
  viewMode: externalViewMode = 'table',
  onViewModeChange: externalOnViewModeChange,
  onDocumentClick,
  onDocumentDoubleClick,
  onDocumentStar,
  onDocumentDelete,
  onDocumentDownload,
  onDocumentShare,
  onDocumentEdit,
  onUpload,
  onNewFolder,
  onRefresh,
  showThumbnails = true,
  showFileIcons = true,
  showFileSizes = true,
  showLastModified = true,
  showOwners = true,
  showSharingStatus = true,
  showTags = true,
  showStarToggle = true,
  showSelectionCheckbox = true,
  showToolbar = true,
  showSearch = true,
  showFilters = true,
  showSort = true,
  showViewToggle = true,
  showUploadButton = true,
  showNewFolderButton = true,
  showRefreshButton = true,
  showMoreActionsButton = true,
  showPagination = true,
  showStatusBar = false,
  showEmptyState = true,
  showLoadingState = true,
  showErrorState = true,
  showNoResultsState = true,
  enableDragAndDrop = false,
  className,
  style,
  onContextMenu,
  i18n = {},
  ...props
}) => {
  const theme = useTheme();
  const [internalViewMode, setInternalViewMode] = useState(externalViewMode);
  
  // Handle new folder
  const handleNewFolder = useCallback(() => {
    onNewFolder?.();
  }, [onNewFolder]);

  // Handle upload
  const handleUpload = useCallback(() => {
    onUpload?.();
  }, [onUpload]);
  
  // Use controlled or internal state for view mode
  const viewMode = externalOnViewModeChange ? externalViewMode : internalViewMode;
  const setViewMode = externalOnViewModeChange || setInternalViewMode;

  // Document selection
  const {
    selectedDocuments,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount
  } = useDocumentSelection(
    externalSelectedDocuments,
    defaultSelectedDocuments,
    onSelectedDocumentsChange
  );

  // Document filters
  const {
    filters,
    updateFilter,
    resetFilters,
    setFilters: setInternalFilters
  } = useDocumentFilters(defaultFilters);

  // Sync external filters if provided
  React.useEffect(() => {
    if (externalFilters) {
      setInternalFilters(externalFilters);
    }
  }, [externalFilters, setInternalFilters]);

  // Document sorting
  const {
    sort,
    toggleSort,
    resetSort,
    setSort: setInternalSort
  } = useDocumentSorting(defaultSort);

  // Sync external sort if provided
  React.useEffect(() => {
    if (externalSort) {
      setInternalSort(externalSort);
    }
  }, [externalSort, setInternalSort]);

  // Memoize the documents array to prevent unnecessary recalculations
  const memoizedDocuments = useMemo(() => documents, [documents]);
  
  // Process documents with filters and sorting
  const { filteredDocuments, filterOptions } = useDocuments(
    memoizedDocuments,
    filters,
    sort
  );
  
  // Memoize filtered documents to prevent unnecessary re-renders
  const memoizedFilteredDocuments = useMemo(() => filteredDocuments, [filteredDocuments]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleDocumentClick = useCallback((doc: Document) => {
    onDocumentClick?.(doc);
  }, [onDocumentClick]);

  const handleDocumentDoubleClick = useCallback((doc: Document) => {
    onDocumentDoubleClick?.(doc);
  }, [onDocumentDoubleClick]);

  const handleStarToggle = useCallback((id: string, isStarred: boolean) => {
    const doc = documents.find(doc => doc.id === id);
    if (doc) {
      onDocumentStar?.(doc, isStarred);
    }
  }, [documents, onDocumentStar]);

  const handleSearch = useCallback((query: string) => {
    updateFilter('search', query || undefined);
  }, [updateFilter]);
  
  // Memoize the toolbar component to prevent unnecessary re-renders
  const toolbar = useMemo(() => {
    if (!showToolbar) return null;
    
    return (
      <DocumentListHeader
        searchQuery={filters.search || ''}
        onSearchChange={handleSearch}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onUploadClick={onUpload ? handleUpload : undefined}
        onNewFolderClick={onNewFolder ? handleNewFolder : undefined}
        onRefresh={handleRefresh}
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        filters={filters}
        onFilterChange={onFiltersChange || updateFilter}
        filterOptions={filterOptions}
        i18n={i18n}
      />
    );
  }, [
    showToolbar,
    filters.search,
    filters,
    viewMode,
    selectedCount,
    filterOptions,
    handleSearch,
    handleViewModeChange,
    handleUpload,
    handleNewFolder,
    handleRefresh,
    onUpload,
    onNewFolder,
    onFiltersChange,
    updateFilter,
    clearSelection,
    i18n
  ]);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list' | 'table') => {
    setViewMode(mode);
  }, [setViewMode]);
  
  // Memoize the empty state component
  const emptyStateComponent = useMemo(() => {
    if (!showEmptyState) return null;
    
    return (
      <DocumentListEmptyState 
        onUploadClick={onUpload ? handleUpload : undefined}
        onNewFolderClick={onNewFolder ? handleNewFolder : undefined}
        searchQuery={filters.search}
        i18n={i18n}
      />
    );
  }, [
    shouldShowEmptyState,
    onUpload,
    onNewFolder,
    filters.search,
    handleUpload,
    handleNewFolder,
    i18n
  ]);

  // Memoize the table view
  const tableView = useMemo(() => {
    if (viewMode !== 'table') return null;
    
    return (
      <DocumentListTable
        documents={memoizedFilteredDocuments}
        selectedDocuments={selectedDocuments}
        sort={sort}
        onSortChange={onSortChange || toggleSort}
        onSelect={toggleSelection}
        onSelectAll={selectAll}
        onDocumentClick={handleDocumentClick}
        onDocumentDoubleClick={handleDocumentDoubleClick}
        onDocumentStar={onDocumentStar || handleStarToggle}
        onDocumentEdit={onDocumentEdit}
        onDocumentDelete={onDocumentDelete}
        onDocumentDownload={onDocumentDownload}
        onDocumentShare={onDocumentShare}
        showSelectionCheckbox={showSelectionCheckbox}
        showStarToggle={showStarToggle}
        getDocumentUrl={getDocumentUrl}
        i18n={i18n}
      />
    );
  }, [
    viewMode,
    memoizedFilteredDocuments,
    selectedDocuments,
    sort,
    onSortChange,
    toggleSort,
    toggleSelection,
    selectAll,
    onDocumentStar,
    handleStarToggle,
    handleDocumentClick,
    handleDocumentDoubleClick,
    onDocumentEdit,
    onDocumentDelete,
    onDocumentDownload,
    onDocumentShare,
    showSelectionCheckbox,
    showStarToggle,
    getDocumentUrl,
    i18n
  ]);
  
  // Memoize the empty state component (already defined above)
  
  // Memoize the status bar
  const statusBar = useMemo(() => {
    if (!showStatusBar) return null;
    
    return (
      <Box 
        px={2} 
        py={1} 
        borderTop={`1px solid ${theme.palette.divider}`}
        bgcolor={theme.palette.background.default}
      >
        <Typography variant="body2" color="textSecondary">
          {selectedCount > 0 
            ? `${selectedCount} ${i18n.selected || 'selected'}`
            : `${filteredDocuments.length} ${i18n.items || 'items'}`}
        </Typography>
      </Box>
    );
  }, [
    showStatusBar,
    selectedCount,
    filteredDocuments.length,
    i18n.selected,
    i18n.items,
    theme.palette.divider,
    theme.palette.background.default
  ]);

  // Handle new folder
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else if (onSelectedDocumentsChange) {
      clearSelection();
    }
  }, [onRefresh, onSelectedDocumentsChange, clearSelection]); 

  const handleContextMenu = useCallback((event: React.MouseEvent, doc: Document) => {
    event.preventDefault();
    onContextMenu?.(event, doc);
  }, [onContextMenu]);

  // Get document URL
  const getDocumentUrl = useCallback((doc: Document) => {
    // This is a placeholder - implement actual URL generation based on your app's routing
    return `/documents/${doc.id}`;
  }, []);

  // Render loading state
  if (loading && showLoadingState) {
    return <DocumentListLoadingState viewMode={viewMode} />;
  }

  // Render error state
  if (error && showErrorState) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="error">
          {error instanceof Error ? error.message : String(error)}
        </Typography>
        {onRefresh && (
          <Box mt={2}>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
            >
              {i18n.retry || 'Retry'}
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  // Check if we should show empty state
  const shouldShowEmptyState = filteredDocuments.length === 0 && 
    (showEmptyState || showNoResultsState);

  return (
    <Box 
      className={className}
      style={style}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 1,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Toolbar */}
      {toolbar}

      {/* Document List */}
      <Box flex={1} overflow="auto" position="relative">
        {showEmptyState ? (
          emptyStateComponent
        ) : viewMode === 'table' ? (
          tableView
        ) : (
          // TODO: Implement grid and list views
          <Box p={2}>
            <Typography>Grid/List view not implemented yet</Typography>
          </Box>
        )}
      </Box>

      {/* Status Bar */}
      {statusBar}
    </Box>
  );
};

// Memoize the main component to prevent unnecessary re-renders
export const DocumentList = memo(DocumentListComponent);

// Set display name for better debugging
DocumentList.displayName = 'DocumentList';

export default DocumentList;
