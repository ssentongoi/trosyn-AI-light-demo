import * as React from 'react';
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
  Chip, 
  Paper,
  useTheme
} from '@mui/material';
import { 
  Star as StarIcon, 
  StarBorder as StarBorderIcon, 
  Share as ShareIcon, 
  MoreVert as MoreVertIcon 
} from '@mui/icons-material';
import { format } from 'date-fns';
import { bytesToSize } from '../../../utils/format';
import { getFileIcon } from '../../../utils/fileIcon';
import type { 
  Document, 
  DocumentSort, 
  SortDirection, 
  SortField, 
  OnSortChange, 
  OnSelectAll 
} from '../types/DocumentList.types';

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
    noDocuments?: string;
    name?: string;
    type?: string;
    modified?: string;
    size?: string;
    actions?: string;
    selectAll?: string;
    starDocument?: string;
    unstarDocument?: string;
    moreOptions?: string;
    shared?: string;
  };
}

const DEFAULT_I18N = {
  noDocuments: 'No documents found',
  name: 'Name',
  type: 'Type',
  modified: 'Modified',
  size: 'Size',
  actions: 'Actions',
  selectAll: 'Select all',
  starDocument: 'Star document',
  unstarDocument: 'Unstar document',
  moreOptions: 'More options',
  shared: 'Shared'
};

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
  getDocumentUrl = (doc) => doc.url || '#',
  showCheckbox = true,
  showStarToggle = true,
  className,
  style,
  i18n = {}
}) => {
  const theme = useTheme();
  const mergedI18n = { ...DEFAULT_I18N, ...i18n };

  const handleSort = (field: SortField) => {
    if (!onSortChange || !sort) return;
    
    const isCurrentField = sort.field === field;
    const direction: SortDirection = isCurrentField && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange(field, direction);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectAll) {
      onSelectAll(event.target.checked);
    }
  };

  const handleSelect = (id: string) => {
    if (onSelect) {
      onSelect(id);
    }
  };

  const handleStarToggle = (id: string, isStarred: boolean) => {
    if (onStarToggle) {
      onStarToggle(id, isStarred);
    }
  };

  const handleRowClick = (doc: Document) => {
    onDocumentClick(doc);
  };

  const handleRowDoubleClick = (doc: Document) => {
    if (onDocumentDoubleClick) {
      onDocumentDoubleClick(doc);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, doc: Document) => {
    e.preventDefault();
    if (onDocumentContextMenu) {
      onDocumentContextMenu(e, doc);
    }
  };

  const isSelected = (id: string) => selectedDocuments.includes(id);
  const allSelected = documents.length > 0 && selectedDocuments.length === documents.length;
  const someSelected = selectedDocuments.length > 0 && selectedDocuments.length < documents.length;

  return (
    <TableContainer component={Paper} className={className} style={style}>
      <Table size="small" aria-label="document list">
        <TableHead>
          <TableRow>
            {showCheckbox && (
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': mergedI18n.selectAll }}
                />
              </TableCell>
            )}
            <TableCell>
              <TableSortLabel
                active={sort?.field === 'name'}
                direction={sort?.field === 'name' ? sort.direction : 'asc'}
                onClick={() => handleSort('name')}
              >
                {mergedI18n.name}
              </TableSortLabel>
            </TableCell>
            <TableCell>{mergedI18n.type}</TableCell>
            <TableCell>
              <TableSortLabel
                active={sort?.field === 'updatedAt'}
                direction={sort?.field === 'updatedAt' ? sort.direction : 'desc'}
                onClick={() => handleSort('updatedAt')}
              >
                {mergedI18n.modified}
              </TableSortLabel>
            </TableCell>
            <TableCell>{mergedI18n.size}</TableCell>
            <TableCell>{mergedI18n.actions}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" style={{ padding: theme.spacing(3) }}>
                <Typography variant="body2" color="textSecondary">
                  {mergedI18n.noDocuments}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => {
              const isItemSelected = isSelected(doc.id);
              const labelId = `document-${doc.id}`;

              return (
                <TableRow
                  hover
                  key={doc.id}
                  selected={isItemSelected}
                  onClick={() => handleRowClick(doc)}
                  onDoubleClick={() => handleRowDoubleClick(doc)}
                  onContextMenu={(e) => handleContextMenu(e, doc)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isItemSelected ? theme.palette.action.selected : 'inherit',
                  }}
                >
                  {showCheckbox && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleSelect(doc.id)}
                        inputProps={{ 'aria-labelledby': labelId }}
                      />
                    </TableCell>
                  )}
                  <TableCell component="th" id={labelId} scope="row" padding="none">
                    <Box display="flex" alignItems="center">
                      {getFileIcon(doc.mimeType || '')}
                      <Box ml={1}>
                        <Typography variant="body2" noWrap>
                          {doc.name}
                        </Typography>
                        {doc.isShared && (
                          <Chip 
                            size="small" 
                            label={mergedI18n.shared} 
                            color="primary" 
                            variant="outlined"
                            style={{ marginTop: 4, height: 20 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {doc.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {doc.updatedAt ? format(new Date(doc.updatedAt), 'PPpp') : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {doc.size ? bytesToSize(doc.size) : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {showStarToggle && (
                        <Tooltip title={doc.isStarred ? mergedI18n.unstarDocument : mergedI18n.starDocument}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStarToggle(doc.id, !doc.isStarred);
                            }}
                          >
                            {doc.isStarred ? <StarIcon color="primary" /> : <StarBorderIcon />}
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={mergedI18n.moreOptions}>
                        <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DocumentListTable;
