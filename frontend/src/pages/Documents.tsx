import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Container, 
  Button, 
  Paper, 
  Alert,
  AlertTitle,
  useTheme,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { useDocumentApi } from '../contexts/DocumentApiContext';
import { DocumentList } from '../components/documents/DocumentList/index';
import type { DocumentFilter, DocumentSort } from '../components/documents/DocumentList/types';
import type { Document } from '../types/document';

const Documents: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const documentApi = useDocumentApi();
  
  // State management
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [filters, setFilters] = useState<DocumentFilter>({});
  const [sort, setSort] = useState<DocumentSort>({ 
    field: 'updatedAt', 
    order: 'desc' 
  });
  const [page, setPage] = useState<number>(0); // 0-based for MUI pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  // Show snackbar notification
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Close snackbar
  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(null);
  }, []);

  // Load documents when filters, sort, or pagination changes
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Call the API to get documents (API uses 1-based page, but our state is 0-based)
        const { documents: fetchedDocuments, total } = await documentApi.listDocuments(
          page + 1, // Convert to 1-based for API
          pageSize,
          { 
            sort_by: sort.field, 
            sort_order: sort.order,
            ...filters
          }
        );
        
        setDocuments(fetchedDocuments);
        setTotalCount(total);
      } catch (err) {
        console.error('Failed to load documents:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load documents. Please try again later.';
        setError(errorMessage);
        showSnackbar(errorMessage, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [documentApi, filters, sort, page, pageSize, showSnackbar]);

  // Handle document selection
  const handleDocumentSelect = useCallback((selectedIds: string[]) => {
    setSelectedDocuments(selectedIds);
  }, []);

  // Handle document double click to open in editor
  const handleDocumentDoubleClick = useCallback((document: Document) => {
    navigate(`/editor/${document.id}`);
  }, [navigate]);

  // Handle edit button click
  const handleEditDocument = useCallback((document: Document) => {
    navigate(`/editor/${document.id}`);
  }, [navigate]);

  // Handle new document creation
  const handleNewDocument = useCallback(() => {
    navigate('/editor');
  }, [navigate]);

  // Handle document click
  const handleDocumentClick = useCallback((document: Document) => {
    // Single click action (preview or select)
    // Optionally select or preview the document
    // Example: navigate(`/documents/${document.id}`);
  }, []);

  // Handle document actions
  const handleDocumentAction = useCallback(async (action: string, document: Document) => {
    try {
      switch (action) {
        case 'view':
          navigate(`/documents/${document.id}`);
          break;
        case 'edit':
          navigate(`/editor/${document.id}`);
          break;
        case 'delete':
          if (window.confirm(`Are you sure you want to delete "${document.name}"?`)) {
            await documentApi.deleteDocument(document.id);
            showSnackbar('Document deleted successfully', 'success');
            // Refresh the documents list
            setPage(0); // Reset to first page
          }
          break;
        case 'download':
          // Implement download functionality
          console.log('Download document:', document.id);
          showSnackbar('Download started', 'info');
          break;
        case 'share':
          // Implement share functionality
          console.log('Share document:', document.id);
          showSnackbar('Share dialog opened', 'info');
          break;
        case 'star':
          const isStarred = !document.isStarred;
          await documentApi.updateDocument(document.id, { isStarred });
          showSnackbar(
            isStarred ? 'Document starred' : 'Document unstarred', 
            'success'
          );
          // Refresh the documents list to show updated star status
          setPage(0);
          break;
        case 'menu':
          // Menu button clicked - no action needed here as other actions are handled separately
          break;
        default:
          console.warn(`Unknown action: ${action}`);
      }
    } catch (err) {
      console.error(`Failed to ${action} document:`, err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      showSnackbar(`Failed to ${action} document: ${errorMessage}`, 'error');
    }
  }, [documentApi, navigate, showSnackbar]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedDocuments.length === 0) return;

    try {
      const selectedIds = selectedDocuments;
      
      switch (action) {
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected documents?`)) {
            await Promise.all(selectedIds.map(id => documentApi.deleteDocument(id)));
            setSelectedDocuments([]);
            showSnackbar(`${selectedIds.length} documents deleted`, 'success');
            setPage(0); // Reset to first page
          }
          break;
        case 'download':
          // Implement bulk download
          console.log('Bulk download:', selectedIds);
          showSnackbar(`Preparing ${selectedIds.length} documents for download...`, 'info');
          break;
        default:
          console.warn(`Unknown bulk action: ${action}`);
      }
    } catch (err) {
      console.error(`Failed to perform bulk ${action}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      showSnackbar(`Failed to perform bulk ${action}: ${errorMessage}`, 'error');
    }
  }, [documentApi, selectedDocuments, showSnackbar]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: DocumentFilter) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page when filters change
  }, []);

  // Handle sort changes
  const handleSortChange = useCallback((newSort: { field: string; order: 'asc' | 'desc' }) => {
    setSort({
      field: newSort.field,
      order: newSort.order
    });
  }, []);

  // Handle page change (0-based for MUI pagination)
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0); // Reset to first page when page size changes
  }, []);

  // Handle upload
  const handleUpload = useCallback(async (files: File[]) => {
    try {
      setIsLoading(true);
      
      // Upload each file
      for (const file of files) {
        await documentApi.uploadDocument(file);
      }
      
      showSnackbar(`${files.length} file(s) uploaded successfully`, 'success');
      // Refresh the documents list
      setPage(0);
    } catch (err) {
      console.error('Failed to upload files:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
      showSnackbar(`Upload failed: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [documentApi, showSnackbar]);

  // Available bulk actions
  const bulkActions = [
    {
      id: 'download',
      label: 'Download',
      icon: 'download',
      onClick: () => handleBulkAction('download'),
      disabled: selectedDocuments.length === 0,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      onClick: () => handleBulkAction('delete'),
      disabled: selectedDocuments.length === 0,
      color: 'error' as const,
    },
  ];

  // Available view modes
  const viewModes = [
    { id: 'list', label: 'List View', icon: 'list' },
    { id: 'grid', label: 'Grid View', icon: 'grid_view' },
  ];

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Documents
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewDocument}
        >
          New Document
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Main Document List */}
      <Paper 
        elevation={0} 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <DocumentList
          documents={documents}
          loading={isLoading}
          error={error ? new Error(typeof error === 'string' ? error : 'Failed to load documents') : null}
          selectedDocuments={selectedDocuments}
          onSelectedDocumentsChange={handleDocumentSelect}
          onDocumentClick={(doc) => {}}
          onDocumentDoubleClick={handleDocumentDoubleClick}
          onDocumentEdit={handleEditDocument}
          onDocumentDelete={(documentId) => handleDocumentAction('delete', { id: documentId } as Document)}
          onDocumentDownload={(document) => handleDocumentAction('download', document)}
          onDocumentShare={(document) => handleDocumentAction('share', document)}
          onDocumentStar={(document, isStarred) => document && handleDocumentAction('star', document)}
          showUploadButton={true}
          showNewFolderButton={false}
          showToolbar={true}
          showSearch={true}
          showFilters={true}
          showSort={true}
          showViewToggle={true}
          showMoreActionsButton={true}
          page={page}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          sortBy={sort.field}
          sortOrder={sort.order}
          onSortChange={handleSortChange}
          filters={filters}
          onFilterChange={handleFiltersChange}
          rowActions={[
            {
              label: 'Edit',
              icon: <EditIcon />,
              onClick: (document) => document && handleDocumentAction('edit', document)
            },
            {
              label: 'Download',
              icon: <DownloadIcon />,
              onClick: (document) => document && handleDocumentAction('download', document)
            },
            {
              label: 'Share',
              icon: <ShareIcon />,
              onClick: (document) => document && handleDocumentAction('share', document)
            },
            {
              label: 'Delete',
              icon: <DeleteIcon />,
              onClick: (document) => document && handleDocumentAction('delete', document)
            }
          ]}
          emptyState={
            <Box textAlign="center" py={4}>
              <Typography variant="h6" gutterBottom>No documents found</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload your first document to get started
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={() => navigate('/editor')}
              >
                Create Document
              </Button>
            </Box>
          }
        />
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar?.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Documents;
