/** @jsxImportSource @emotion/react */
import * as React from 'react';
import { useCallback, useMemo } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { 
  Document, 
  DocumentSort, 
  SortDirection, 
  SortField,
  OnSortChange,
  OnSelectAll,
  DocumentFilter
} from '../types/DocumentList.types';
import { format } from 'date-fns';
import { bytesToSize } from '../../../utils/format';
import Paper from '@mui/material/Paper';
import { getFileIcon } from '../../../utils/fileIcon';

interface DocumentListTableProps {
  documents: Document[];
  selectedDocuments: string[];
  sort?: DocumentSort;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
  onSelect?: (id: string) => void;
  onSelectAll?: (selected: boolean) => void;
  onStarToggle?: (id: string, isStarred: boolean) => void;
  onDocumentClick?: (doc: Document) => void;
  onDocumentDoubleClick?: (doc: Document) => void;
  onDocumentContextMenu?: (e: React.MouseEvent, doc: Document) => void;
  getDocumentUrl?: (doc: Document) => string;
  showCheckbox?: boolean;
  showStarToggle?: boolean;
  className?: string;
  style?: React.CSSProperties;
  i18n?: {
    name?: string;
    modified?: string;
    size?: string;
    type?: string;
    owner?: string;
    actions?: string;
    noDocuments?: string;
    selectAll?: string;
    selectedCount?: string;
    sortBy?: string;
    ascending?: string;
    descending?: string;
    starDocument?: string;
    unstarDocument?: string;
    downloadDocument?: string;
    shareDocument?: string;
    deleteDocument?: string;
    editDocument?: string;
    viewDocument?: string;
    openInNewTab?: string;
    [key: string]: string | undefined;
  };
}

export const DocumentListTable: React.FC<DocumentListTableProps> = ({
  documents = [],
  selectedDocuments = [],
  sort,
  onSortChange,
  onSelect,
  onSelectAll,
  onStarToggle,
  onDocumentClick = () => {},
  onDocumentDoubleClick,
  onDocumentContextMenu,
  getDocumentUrl = (doc) => doc.url,
  showCheckbox = true,
  showStarToggle = true,
  className,
  style,
  i18n,
}) => {
  const theme = useTheme();
  const allSelected = documents.length > 0 && selectedDocuments.length === documents.length;
  const indeterminate = selectedDocuments.length > 0 && selectedDocuments.length < documents.length;

  const i18nValues = useMemo(() => ({
    selectAll: 'Select all',
    name: 'Name',
    type: 'Type',
    modified: 'Modified',
    size: 'Size',
    actions: 'Actions',
    noDocuments: 'No documents found',
    starDocument: 'Star document',
    unstarDocument: 'Unstar document',
    moreOptions: 'More options',
    sortByName: 'Sort by name',
    sortByDate: 'Sort by date',
    shared: 'Shared',
    documentList: 'Document list',
    ...(i18n || {}),
  }), [i18n]);

  const handleSort = useCallback((field: SortField) => {
    if (!onSortChange || !sort) return;
    
    const direction = sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange(field, direction);
  }, [onSortChange, sort]);

  const handleStarToggle = useCallback((e: React.MouseEvent, id: string, isStarred: boolean = false) => {
    e.stopPropagation();
    if (onStarToggle) {
      onStarToggle(id, !isStarred);
    }
  }, [onStarToggle]);

  const handleRowClick = useCallback((doc: Document) => {
    if (onDocumentClick) {
      onDocumentClick(doc);
    }
  }, [onDocumentClick]);

  const handleRowDoubleClick = useCallback((doc: Document) => {
    if (onDocumentDoubleClick) {
      onDocumentDoubleClick(doc);
    }
  }, [onDocumentDoubleClick]);

  const handleRowContextMenu = useCallback((e: React.MouseEvent, doc: Document) => {
    e.preventDefault();
    if (onDocumentContextMenu) {
      onDocumentContextMenu(e, doc);
    }
  }, [onDocumentContextMenu]);

  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectAll) return;
    onSelectAll(event.target.checked);
  }, [onSelectAll]);



  // Memoize the table header to prevent unnecessary re-renders
  const TableHeader = useMemo(() => (
    <TableHead>
      <TableRow>
        {showCheckbox && (
          <TableCell padding="checkbox">
            <Checkbox
              indeterminate={indeterminate}
              checked={allSelected}
              onChange={handleSelectAll}
              inputProps={{
                'aria-label': i18nValues.selectAll,
              }}
            />
          </TableCell>
        )}
        <TableCell>
          <TableSortLabel
            active={sort?.field === 'name'}
            direction={sort?.direction || 'asc'}
            onClick={() => handleSort('name' as SortField)}
            aria-label={i18nValues.sortByName || 'Sort by name'}
          >
            {i18nValues.name}
          </TableSortLabel>
        </TableCell>
        <TableCell>{i18nValues.type}</TableCell>
        <TableCell>
          <TableSortLabel
            active={sort?.field === 'updatedAt'}
            direction={sort?.direction || 'asc'}
            onClick={() => handleSort('updatedAt' as SortField)}
            aria-label={i18nValues.sortByDate || 'Sort by date'}
          >
            {i18nValues.modified}
          </TableSortLabel>
        </TableCell>
        <TableCell>{i18nValues.size}</TableCell>
        <TableCell>{i18nValues.actions}</TableCell>
      </TableRow>
    </TableHead>
  ), [sort, allSelected, indeterminate, handleSort, handleSelectAll, i18n, showCheckbox]);

  // Memoize the table rows to prevent unnecessary re-renders
  const tableRows = useMemo(() => {
    if (documents.length === 0) {
      return [
        <TableRow key="no-documents">
          <TableCell 
            colSpan={6} 
            align="center" 
            sx={{ py: 4 }}
            role="row"
            aria-colspan={6}
          >
            <Typography variant="body2" color="textSecondary">
              {i18nValues.noDocuments}
            </Typography>
          </TableCell>
        </TableRow>
      ];
    }

    return documents.map((doc, index) => {
          const isSelected = selectedDocuments.includes(doc.id);
          const rowId = `document-row-${doc.id}`;
      
      return (
        <TableRow
          key={doc.id}
          hover
          selected={isSelected}
          onClick={() => onDocumentClick?.(doc)}
          onDoubleClick={() => onDocumentDoubleClick?.(doc)}
          onContextMenu={(e) => onDocumentContextMenu?.(e, doc)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onDocumentClick?.(doc);
            }
          }}
          tabIndex={0}
          role="row"
          aria-rowindex={index + 2}
          aria-selected={isSelected}
          id={rowId}
          aria-labelledby={`${rowId}-name ${rowId}-type ${rowId}-modified ${rowId}-size`}
          sx={{
            cursor: 'pointer',
            '&:focus': {
              outline: '2px solid',
              outlineOffset: '-2px',
              outlineColor: theme.palette.primary.main,
            },
            '&[aria-selected="true"]': {
              backgroundColor: theme.palette.action.selected,
            },
          }}
        >
          {showCheckbox && (
            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onChange={() => onSelect?.(doc.id)}
                inputProps={{
                  'aria-labelledby': `${rowId}-name`,
                  'aria-label': `Select ${doc.name}`,
                }}
              />
            </TableCell>
          )}
          
          <TableCell id={`${rowId}-name`}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box aria-hidden="true">
                {getFileIcon(doc.mimeType)}
              </Box>
              <Typography 
                variant="body2"
                component="span"
                sx={{ 
                  fontWeight: 'medium',
                  color: 'text.primary'
                }}
              >
                {doc.name}
              </Typography>
              {doc.isShared && (
                <Tooltip title={i18nValues.shared}>
                  <ShareIcon fontSize="small" color="action" />
                </Tooltip>
              )}
            </Box>
          </TableCell>
          
          <TableCell id={`${rowId}-type`}>
            <Chip 
              label={doc.mimeType || 'Document'} 
              size="small"
              variant="outlined"
              aria-label={`Type: ${doc.mimeType || 'Document'}`}
            />
          </TableCell>
          
          <TableCell id={`${rowId}-modified`}>
            <Typography variant="body2" color="textSecondary">
              {doc.updatedAt ? format(new Date(doc.updatedAt), 'MMM d, yyyy') : '-'}
            </Typography>
          </TableCell>
          
          <TableCell id={`${rowId}-size`}>
            <Typography variant="body2" color="textSecondary">
              {bytesToSize(doc.size || 0)}
            </Typography>
          </TableCell>
          
          <TableCell id={`${rowId}-actions`}>
            <Box display="flex" gap={1}>
              {onStarToggle && showStarToggle && (
                <Tooltip title={doc.isStarred ? i18nValues.unstarDocument : i18nValues.starDocument}>
                  <IconButton
                    size="small"
                    onClick={(e) => handleStarToggle(e, doc.id, !doc.isStarred)}
                    aria-label={doc.isStarred ? i18nValues.unstarDocument : i18nValues.starDocument}
                    aria-pressed={doc.isStarred}
                  >
                    {doc.isStarred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={i18nValues.moreOptions}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement menu
                  }}
                  aria-label={i18nValues.moreOptions}
                  aria-haspopup="true"
                >
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </TableCell>
          </TableRow>
        );
      });
  }, [
    documents, 
    selectedDocuments, 
    showCheckbox, 
    showStarToggle, 
    onDocumentClick, 
    onDocumentContextMenu, 
    onDocumentDoubleClick,
    onSelect, 
    onStarToggle, 
    i18n, 
    theme, 
    handleStarToggle, 
    // handleActionClick is not defined
  ]);

  return (
    <TableContainer 
      component={Paper} 
      className={className}
      style={style}
      aria-label={i18nValues.documentList}
      role="region"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={documents.length === 0}
    >
      <Table 
        size="small" 
        aria-label={i18nValues.documentList}
        stickyHeader
      >
        {TableHeader}
        <TableBody>
          {tableRows}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DocumentListTable;
