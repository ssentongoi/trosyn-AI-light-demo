import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Divider, 
  Button, 
  IconButton, 
  Tooltip, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  CircularProgress,
  Chip,
  Stack,
  useTheme,
} from '@mui/material';
import { 
  History as HistoryIcon, 
  Restore as RestoreIcon, 
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { parseISO } from 'date-fns/fp';
import { useDocumentApi } from '../../contexts/DocumentApiContext';

interface DocumentVersionHistoryProps {
  documentId: string;
  versions: any[];
  onRestore: (versionId: string) => Promise<boolean>;
}

const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  documentId,
  versions: initialVersions = [],
  onRestore,
}) => {
  const theme = useTheme();
  const { getVersionHistory, versionHistory, loading } = useDocumentApi();
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Use provided versions or fetch if not provided
  const versions = initialVersions.length > 0 ? initialVersions : versionHistory;
  
  // Load versions if not provided
  useEffect(() => {
    if (initialVersions.length === 0 && documentId) {
      getVersionHistory(documentId, currentPage, itemsPerPage);
    }
  }, [documentId, currentPage, getVersionHistory]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, version: any) => {
    setSelectedVersion(version);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVersion(null);
  };

  const handleRestore = async () => {
    if (!selectedVersion) return;
    
    setIsRestoring(true);
    try {
      const success = await onRestore(selectedVersion.id);
      if (success) {
        // Refresh versions after restore
        if (initialVersions.length === 0) {
          await getVersionHistory(documentId, currentPage, itemsPerPage);
        }
      }
    } catch (err) {
      console.error('Error restoring version:', err);
    } finally {
      setIsRestoring(false);
      handleMenuClose();
    }
  };

  const handleViewChanges = () => {
    if (!selectedVersion) return;
    // Implement diff view between versions
    console.log('View changes for version:', selectedVersion.id);
    handleMenuClose();
  };

  const getVersionLabel = (index: number, total: number) => {
    if (index === 0) return 'Current Version';
    if (index === 1) return 'Previous Version';
    return `Version ${total - index}`;
  };

  const getVersionColor = (index: number) => {
    if (index === 0) return 'success';
    if (index === 1) return 'primary';
    return 'default';
  };

  if (loading && versions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (versions.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
        <HistoryIcon color="action" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No Version History
        </Typography>
        <Typography color="textSecondary" paragraph>
          This document doesn't have any previous versions yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper variant="outlined">
        <List disablePadding>
          {versions.map((version, index) => (
            <React.Fragment key={version.id}>
              <ListItem 
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    onClick={(e) => handleMenuClick(e, version)}
                    disabled={isRestoring && selectedVersion?.id === version.id}
                  >
                    <MoreVertIcon />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar 
                    sx={{
                      bgcolor: index === 0 
                        ? theme.palette.success.light 
                        : theme.palette.grey[300],
                      color: index === 0 
                        ? theme.palette.success.contrastText 
                        : theme.palette.text.primary,
                    }}
                  >
                    <HistoryIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" flexWrap="wrap">
                      <Typography variant="subtitle1" component="span" sx={{ mr: 1 }}>
                        {version.title || 'Untitled Document'}
                      </Typography>
                      <Chip 
                        label={getVersionLabel(index, versions.length)}
                        size="small"
                        color={getVersionColor(index) as any}
                        variant={index < 2 ? 'filled' : 'outlined'}
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box component="span">
                      <Box component="span" display="flex" alignItems="center" flexWrap="wrap">
                        <TimeIcon fontSize="inherit" sx={{ fontSize: '1rem', mr: 0.5, opacity: 0.7 }} />
                        <Typography variant="caption" color="textSecondary" sx={{ mr: 1 }}>
                          {formatDistanceToNow(parseISO(version.updated_at), { addSuffix: true })}
                        </Typography>
                        {version.user && (
                          <>
                            <PersonIcon fontSize="inherit" sx={{ fontSize: '1rem', mr: 0.5, opacity: 0.7 }} />
                            <Typography variant="caption" color="textSecondary" sx={{ mr: 1 }}>
                              {version.user.name || 'Unknown User'}
                            </Typography>
                          </>
                        )}
                        {version.version && (
                          <>
                            <CodeIcon fontSize="inherit" sx={{ fontSize: '1rem', mr: 0.5, opacity: 0.7 }} />
                            <Typography variant="caption" color="textSecondary">
                              v{version.version}
                            </Typography>
                          </>
                        )}
                      </Box>
                      {version.change_summary && (
                        <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                          {version.change_summary}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              {index < versions.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Pagination */}
      {initialVersions.length === 0 && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Stack direction="row" spacing={1}>
            <Button 
              size="small" 
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button 
              size="small" 
              variant="contained"
              disabled
            >
              {currentPage}
            </Button>
            <Button 
              size="small" 
              disabled={versions.length < itemsPerPage || loading}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </Button>
          </Stack>
        </Box>
      )}

      {/* Version Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleViewChanges}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Changes</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleRestore}
          disabled={isRestoring}
        >
          <ListItemIcon>
            {isRestoring ? (
              <CircularProgress size={20} />
            ) : (
              <RestoreIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>
            {isRestoring ? 'Restoring...' : 'Restore This Version'}
          </ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default DocumentVersionHistory;
