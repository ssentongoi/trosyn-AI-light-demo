import React from 'react';
import { 
  Box, 
  TextField, 
  InputAdornment, 
  IconButton, 
  Tooltip,
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Divider,
  Typography
} from '@mui/material';
import { 
  Search as SearchIcon, 
  FilterList as FilterListIcon, 
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  TableChart as TableViewIcon,
  CloudUpload as UploadIcon,
  CreateNewFolder as NewFolderIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { DocumentListProps, DocumentFilter } from '../types/DocumentList.types';

interface DocumentListHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list' | 'table';
  onViewModeChange: (mode: 'grid' | 'list' | 'table') => void;
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  onRefresh: () => void;
  selectedCount: number;
  onClearSelection: () => void;
  filters: DocumentFilter;
  onFilterChange: (filters: DocumentFilter) => void;
  filterOptions: {
    owners: Array<{ id: string; name: string }>;
    mimeTypes: string[];
    tags: Array<{ id: string; name: string }>;
  };
  i18n?: DocumentListProps['i18n'];
}

export const DocumentListHeader: React.FC<DocumentListHeaderProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onUploadClick,
  onNewFolderClick,
  onRefresh,
  selectedCount,
  onClearSelection,
  filters,
  onFilterChange,
  filterOptions,
  i18n = {}
}) => {
  const [filterAnchorEl, setFilterAnchorEl] = React.useState<null | HTMLElement>(null);
  const [moreAnchorEl, setMoreAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleMoreClick = (event: React.MouseEvent<HTMLElement>) => {
    setMoreAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setFilterAnchorEl(null);
    setMoreAnchorEl(null);
  };

  return (
    <Box 
      display="flex" 
      alignItems="center" 
      gap={2} 
      p={2}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}
    >
      {/* Search */}
      <TextField
        placeholder={i18n.searchPlaceholder || 'Search documents...'}
        variant="outlined"
        size="small"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
        sx={{ flex: 1, maxWidth: 400 }}
      />

      <Box display="flex" alignItems="center" gap={1}>
        {/* View Mode Toggle */}
        <ButtonGroup size="small" variant="outlined">
          <Tooltip title={i18n.gridView || 'Grid view'}>
            <Button
              onClick={() => onViewModeChange('grid')}
              variant={viewMode === 'grid' ? 'contained' : 'outlined'}
            >
              <GridViewIcon />
            </Button>
          </Tooltip>
          <Tooltip title={i18n.listView || 'List view'}>
            <Button
              onClick={() => onViewModeChange('list')}
              variant={viewMode === 'list' ? 'contained' : 'outlined'}
            >
              <ListViewIcon />
            </Button>
          </Tooltip>
          <Tooltip title={i18n.tableView || 'Table view'}>
            <Button
              onClick={() => onViewModeChange('table')}
              variant={viewMode === 'table' ? 'contained' : 'outlined'}
            >
              <TableViewIcon />
            </Button>
          </Tooltip>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        {/* Actions */}
        <Tooltip title={i18n.upload || 'Upload'}>
          <IconButton onClick={onUploadClick} size="large">
            <UploadIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={i18n.newFolder || 'New folder'}>
          <IconButton onClick={onNewFolderClick} size="large">
            <NewFolderIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={i18n.refresh || 'Refresh'}>
          <IconButton onClick={onRefresh} size="large">
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={i18n.filter || 'Filter'}>
          <IconButton 
            onClick={handleFilterClick}
            color={Object.keys(filters).length > 0 ? 'primary' : 'default'}
            size="large"
          >
            <FilterListIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={i18n.moreActions || 'More actions'}>
          <IconButton onClick={handleMoreClick} size="large">
            <MoreIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem>
          <Typography variant="subtitle2">Filter by Owner</Typography>
        </MenuItem>
        {/* Add filter options here */}
      </Menu>

      {/* More Actions Menu */}
      <Menu
        anchorEl={moreAnchorEl}
        open={Boolean(moreAnchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem>Export</MenuItem>
        <MenuItem>Print</MenuItem>
        <Divider />
        <MenuItem>Settings</MenuItem>
      </Menu>
    </Box>
  );
};
