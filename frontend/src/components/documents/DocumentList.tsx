import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useDocumentApi } from '../../contexts/DocumentApiContext';
import type { 
  Document, 
  DocumentFilter, 
  DocumentSort, 
  DocumentOwner,
  DocumentTag,
  DocumentVersion,
  DocumentListProps
} from './types/DocumentList.types';
import { 
  Box, 
  Button, 
  Checkbox, 
  Chip, 
  CircularProgress, 
  IconButton, 
  Menu, 
  MenuItem, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TablePagination, 
  TableRow, 
  TableSortLabel, 
  TextField, 
  Toolbar, 
  Tooltip, 
  Typography,
  useTheme,
  useMediaQuery,
  Alert
} from '@mui/material';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DescriptionIcon from '@mui/icons-material/Description';

export const DocumentList: React.FC<DocumentListProps> = ({
  documents = [],
  loading = false,
  error = null,
  selectedDocuments = [],
  onSelectedDocumentsChange,
  onDocumentClick,
  onDocumentDoubleClick,
  onDocumentEdit,
  onDocumentDelete,
  onDocumentDownload,
  onDocumentShare,
  onDocumentStar,
  filters = {},
  sort = { field: 'updatedAt', order: 'desc' },
  onFiltersChange,
  onSortChange,
  page = 0,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  showUploadButton = true,
  showNewFolderButton = false,
  showToolbar = true,
  showSearch = true,
  showFilters = true,
  showSort = true,
  showViewToggle = true,
  showMoreActionsButton = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<EnhancedDocument | null>(null);

  // Handle document selection
  const handleSelectDocument = useCallback((documentId: string) => {
    const newSelection = selectedDocuments.includes(documentId)
      ? selectedDocuments.filter(id => id !== documentId)
      : [...selectedDocuments, documentId];
    onSelectedDocumentsChange?.(newSelection);
  }, [selectedDocuments, onSelectedDocumentsChange]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allSelected = selectedDocuments.length === documents.length;
    onSelectedDocumentsChange?.(allSelected ? [] : documents.map(doc => doc.id));
  }, [selectedDocuments, documents, onSelectedDocumentsChange]);

  // Handle menu actions
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, document: EnhancedDocument) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedDocument(null);
  }, []);

  // Handle document actions
  const handleEdit = useCallback(() => {
    if (selectedDocument) {
      onDocumentEdit?.(selectedDocument);
    }
    handleMenuClose();
  }, [selectedDocument, onDocumentEdit, handleMenuClose]);

  const handleDelete = useCallback(() => {
    if (selectedDocument) {
      onDocumentDelete?.(selectedDocument.id);
    }
    handleMenuClose();
  }, [selectedDocument, onDocumentDelete, handleMenuClose]);

  const handleDownload = useCallback(() => {
    if (selectedDocument) {
      onDocumentDownload?.(selectedDocument);
    }
    handleMenuClose();
  }, [selectedDocument, onDocumentDownload, handleMenuClose]);

  const handleShare = useCallback(() => {
    if (selectedDocument) {
      onDocumentShare?.(selectedDocument);
    }
    handleMenuClose();
  }, [selectedDocument, onDocumentShare, handleMenuClose]);

  const handleStar = useCallback((document: EnhancedDocument) => {
    onDocumentStar?.(document, !document.isStarred);
  }, [onDocumentStar]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc => {
    const title = doc.title || '';
    const content = doc.content || '';
    const query = searchQuery.toLowerCase();
    
    return title.toLowerCase().includes(query) ||
           content.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error loading documents: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Toolbar */}
      {showToolbar && (
        <Toolbar sx={{ px: { sm: 2 }, py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {showSearch && (
              <TextField
                size="small"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ minWidth: 200 }}
              />
            )}
            
            {showFilters && (
              <IconButton size="small">
                <FilterListIcon />
              </IconButton>
            )}
            
            <IconButton size="small">
              <RefreshIcon />
            </IconButton>
          </Box>
          
          {selectedDocuments.length > 0 && (
            <Typography variant="body2" sx={{ mr: 2 }}>
              {selectedDocuments.length} selected
            </Typography>
          )}
        </Toolbar>
      )}

      {/* Document Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedDocuments.length > 0 && selectedDocuments.length < documents.length}
                  checked={documents.length > 0 && selectedDocuments.length === documents.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sort.field === 'name' || sort.field === 'title'}
                  direction={sort.field === 'name' || sort.field === 'title' ? sort.order : 'asc'}
                  onClick={() => {
                    const newField: SortableField = 'name';
                    onSortChange?.({
                      field: newField,
                      order: sort.order === 'asc' ? 'desc' : 'asc',
                    });
                  }}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sort.field === 'updatedAt'}
                  direction={sort.field === 'updatedAt' ? sort.order : 'asc'}
                  onClick={() => onSortChange?.({ field: 'updatedAt', order: sort.order === 'asc' ? 'desc' : 'asc' })}
                >
                  Modified
                </TableSortLabel>
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDocuments.map((document) => (
              <TableRow
                key={document.id}
                hover
                selected={selectedDocuments.includes(document.id)}
                onClick={() => onDocumentClick?.(document)}
                onDoubleClick={() => onDocumentDoubleClick?.(document)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedDocuments.includes(document.id)}
                    onChange={() => handleSelectDocument(document.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon color="primary" />
                    <Typography variant="body2" fontWeight="medium">
                      {document.title}
                    </Typography>
                    {document.isStarred && (
                      <StarIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={document.type || 'Document'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(document.size || 0)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {document.updatedAt ? formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true }) : 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStar(document);
                      }}
                    >
                      {document.isStarred ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, document)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalItems}
        page={page}
        onPageChange={(_, newPage) => onPageChange?.(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download
        </MenuItem>
        <MenuItem onClick={handleShare}>
          <ShareIcon sx={{ mr: 1 }} />
          Share
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DocumentList;
