import React, { useState, useCallback } from 'react';
import {
  Toolbar,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Box,
  Button,
  Divider,
  useTheme,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Upload as UploadIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Sort as SortIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { DocumentFilter } from '../types';

interface DocumentToolbarProps {
  selectedCount: number;
  onFilterChange: (filters: DocumentFilter) => void;
  filters: DocumentFilter;
  onUploadClick?: () => void;
  onCreateFolderClick?: () => void;
  rowActions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
  }>;
  viewMode?: 'grid' | 'list' | 'table';
  onViewModeChange?: (mode: 'grid' | 'list' | 'table') => void;
}

const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  selectedCount,
  onFilterChange,
  filters,
  onUploadClick,
  onCreateFolderClick,
  rowActions = [],
  viewMode = 'list',
  onViewModeChange,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [moreActionsAnchorEl, setMoreActionsAnchorEl] = useState<null | HTMLElement>(null);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
    // Debounce this in a real app
    onFilterChange({ ...filters, searchQuery: value });
  }, [filters, onFilterChange]);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleMoreActionsClick = (event: React.MouseEvent<HTMLElement>) => {
    setMoreActionsAnchorEl(event.currentTarget);
  };

  const handleMoreActionsClose = () => {
    setMoreActionsAnchorEl(null);
  };

  const handleViewModeChange = useCallback((newMode: 'grid' | 'list' | 'table') => {
    onViewModeChange?.(newMode);
  }, [onViewModeChange]);

  const hasSelection = selectedCount > 0;

  return (
    <Toolbar
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1,
        gap: 1,
        flexWrap: 'wrap',
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Left side: Search and filter */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 300 }}>
        <TextField
          size="small"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            maxWidth: 400,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
            },
          }}
        />

        <Tooltip title="Filter">
          <IconButton onClick={handleFilterClick} size="small">
            <FilterListIcon />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={handleFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <MenuItem onClick={handleFilterClose}>Date modified: Newest first</MenuItem>
          <MenuItem onClick={handleFilterClose}>Date modified: Oldest first</MenuItem>
          <MenuItem onClick={handleFilterClose}>Name: A to Z</MenuItem>
          <MenuItem onClick={handleFilterClose}>Name: Z to A</MenuItem>
          <Divider />
          <MenuItem onClick={handleFilterClose}>Type: Documents</MenuItem>
          <MenuItem onClick={handleFilterClose}>Type: Images</MenuItem>
          <MenuItem onClick={handleFilterClose}>Type: Spreadsheets</MenuItem>
          <MenuItem onClick={handleFilterClose}>Type: Presentations</MenuItem>
        </Menu>
      </Box>

      {/* Right side: Actions and view mode */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {hasSelection && (
          <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
            {selectedCount} selected
          </Typography>
        )}

        {onViewModeChange && (
          <Box sx={{ display: 'flex', border: 1, borderColor: 'divider', borderRadius: 1, marginLeft: 1 }}>
            <Tooltip title="Grid view">
              <IconButton
                onClick={() => handleViewModeChange('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
                aria-label="Grid view"
                size="small"
                sx={{
                  borderRadius: 0,
                  borderRight: 1,
                  borderColor: 'divider',
                  ...(viewMode === 'grid' ? { bgcolor: 'action.selected' } : {})
                }}
              >
                <ViewModuleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="List view">
              <IconButton
                onClick={() => handleViewModeChange('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
                aria-label="List view"
                size="small"
                sx={{
                  borderRadius: 0,
                  borderRight: 1,
                  borderColor: 'divider',
                  ...(viewMode === 'list' ? { bgcolor: 'action.selected' } : {})
                }}
              >
                <ViewListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Table view">
              <IconButton
                onClick={() => handleViewModeChange('table')}
                color={viewMode === 'table' ? 'primary' : 'default'}
                aria-label="Table view"
                size="small"
                sx={{
                  borderRadius: 0,
                  ...(viewMode === 'table' ? { bgcolor: 'action.selected' } : {})
                }}
              >
                <ViewListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        {!hasSelection ? (
          <>
            {onUploadClick && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadIcon />}
                onClick={onUploadClick}
                size="small"
              >
                Upload
              </Button>
            )}

            {onCreateFolderClick && (
              <Button
                variant="outlined"
                startIcon={<CreateNewFolderIcon />}
                onClick={onCreateFolderClick}
                size="small"
                sx={{ ml: 1 }}
              >
                New folder
              </Button>
            )}
          </>
        ) : (
          <>
            <Tooltip title="Download">
              <IconButton size="small" onClick={() => {}}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Share">
              <IconButton size="small" onClick={() => {}}>
                <ShareIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete">
              <IconButton size="small" onClick={() => {}} color="error">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </>
        )}

        {(rowActions.length > 0 || onViewModeChange) && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Tooltip title="More actions">
              <IconButton size="small" onClick={handleMoreActionsClick}>
                <MoreVertIcon />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={moreActionsAnchorEl}
              open={Boolean(moreActionsAnchorEl)}
              onClose={handleMoreActionsClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              {rowActions.map((action, index) => (
                <MenuItem
                  key={index}
                  onClick={() => {
                    action.onClick();
                    handleMoreActionsClose();
                  }}
                  disabled={action.disabled}
                >
                  {action.icon}
                  <Box component="span" sx={{ ml: 1 }}>
                    {action.label}
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Box>
    </Toolbar>
  );
};

export default React.memo(DocumentToolbar);
