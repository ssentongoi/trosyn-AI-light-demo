import React, { useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Checkbox,
  IconButton,
  Tooltip,
  Box,
  Typography,
  useTheme,
  TablePagination,
  Paper,
} from '@mui/material';
import { Document, DocumentOwner, DocumentTag } from '../../../../types/document';
import { DocumentSort, SortField } from '../types/DocumentList.types';
import { format } from 'date-fns';
import { StarBorder, Star, MoreVert, InsertDriveFile } from '@mui/icons-material';
import { bytesToSize } from '../utils';

export interface DocumentTableProps {
  documents: Document[];
  selectedDocuments: Set<string>;
  onSelectedDocumentsChange: (selected: Set<string>) => void;
  onDocumentClick?: (document: Document) => void;
  onDocumentDoubleClick?: (document: Document) => void;
  onDocumentAction: (action: string, document: Document) => void;
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sort: { field: SortField; order: 'asc' | 'desc' }) => void;
  selectable?: boolean;
  multiSelect?: boolean;
  loading?: boolean;
}

const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  selectedDocuments,
  onSelectedDocumentsChange,
  onDocumentClick,
  onDocumentDoubleClick,
  onDocumentAction,
  sortBy = 'updatedAt',
  sortOrder = 'desc',
  onSortChange,
  selectable = true,
  multiSelect = true,
  loading = false,
}) => {
  const theme = useTheme();

  const handleSelectAll = useCallback(() => {
    if (!selectable || !multiSelect) return;
    
    if (selectedDocuments.size === documents.length) {
      onSelectedDocumentsChange(new Set());
    } else {
      onSelectedDocumentsChange(new Set(documents.map(doc => doc.id)));
    }
  }, [selectable, multiSelect, selectedDocuments, documents, onSelectedDocumentsChange]);

  const handleSelectOne = useCallback((documentId: string) => {
    if (!selectable) return;
    
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(documentId);
    }
    onSelectedDocumentsChange(newSelected);
  }, [selectable, multiSelect, selectedDocuments, onSelectedDocumentsChange]);

  const handleSort = useCallback((field: SortField) => {
    if (!onSortChange) return;
    
    const isAsc = sortBy === field && sortOrder === 'asc';
    onSortChange({
      field,
      order: isAsc ? 'desc' : 'asc',
    });
  }, [sortBy, sortOrder, onSortChange]);

  const handleRowClick = useCallback((document: Document, event: React.MouseEvent) => {
    // Don't trigger row click if clicking on a button or checkbox
    const target = event.target as HTMLElement;
    if (target.closest('button, input[type="checkbox"]')) {
      return;
    }
    
    // Single click
    onDocumentClick?.(document);
    
    // Handle selection on row click if selectable
    if (selectable) {
      handleSelectOne(document.id);
    }
  }, [onDocumentClick, selectable, handleSelectOne]);

  const renderDocumentIcon = (document: Document) => {
    // You can enhance this with more file type icons
    return <InsertDriveFile color="action" />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>Loading documents...</Typography>
      </Box>
    );
  }

  if (documents.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>No documents found</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} data-testid="mock-document-table">
      <Table>
        <TableHead>
          <TableRow>
            {/* Selection checkbox */}
            {selectable && multiSelect && (
              <TableCell padding="checkbox">
                <Checkbox
                  data-testid="select-all-checkbox"
                  indeterminate={selectedDocuments.size > 0 && selectedDocuments.size < documents.length}
                  checked={documents.length > 0 && selectedDocuments.size === documents.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
            )}
            
            {/* Star */}
            <TableCell padding="checkbox">
              <Box width={24} data-testid="star-column" />
            </TableCell>
            
            {/* Name column with sort */}
            <TableCell>
              <TableSortLabel
                data-testid="sort-by-name"
                active={sortBy === 'name'}
                direction={sortOrder}
                onClick={() => handleSort('name')}
              >
                Name
              </TableSortLabel>
            </TableCell>
            
            {/* Modified date with sort */}
            <TableCell>
              <TableSortLabel
                data-testid="sort-by-modified"
                active={sortBy === 'updatedAt'}
                direction={sortOrder}
                onClick={() => handleSort('updatedAt')}
              >
                Modified
              </TableSortLabel>
            </TableCell>
            
            {/* Size */}
            <TableCell>Size</TableCell>
            
            {/* Actions */}
            <TableCell padding="checkbox" />
          </TableRow>
        </TableHead>
        
        <TableBody>
          {documents.map((document) => (
            <TableRow
              key={document.id}
              data-testid={`document-row-${document.id}`}
              hover
              selected={selectedDocuments.has(document.id)}
              onClick={(e) => handleRowClick(document, e)}
              onDoubleClick={() => onDocumentDoubleClick?.(document)}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              {/* Selection checkbox */}
              {selectable && multiSelect && (
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedDocuments.has(document.id)}
                    onChange={() => handleSelectOne(document.id)}
                  />
                </TableCell>
              )}
              
              {/* Star */}
              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentAction('star', document);
                  }}
                  aria-label={document.isStarred ? 'Unstar document' : 'Star document'}
                  data-testid={`star-button-${document.id}`}
                >
                  {document.isStarred ? (
                    <Star color="warning" data-testid="StarIcon" />
                  ) : (
                    <StarBorder data-testid="StarBorderIcon" />
                  )}
                </IconButton>
              </TableCell>
              
              {/* Name */}
              <TableCell>
                <Box display="flex" alignItems="center">
                  <Box mr={1}>
                    {renderDocumentIcon(document)}
                  </Box>
                  <Typography 
                    variant="body2" 
                    noWrap
                    data-testid={`document-name-${document.id}`}
                    sx={{ cursor: 'pointer' }}
                  >
                    {document.name}
                  </Typography>
                </Box>
              </TableCell>
              
              {/* Modified date */}
              <TableCell>
                <Typography variant="body2" color="textSecondary">
                  {document.updatedAt ? format(new Date(document.updatedAt), 'MMM d, yyyy') : 'N/A'}
                </Typography>
              </TableCell>
              
              {/* Size */}
              <TableCell>
                <Typography variant="body2" color="textSecondary">
                  {bytesToSize(document.size || 0)}
                </Typography>
              </TableCell>
              
              {/* Actions */}
              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentAction('menu', document);
                  }}
                >
                  <MoreVert />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default React.memo(DocumentTable);
