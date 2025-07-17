import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Toolbar, 
  Button, 
  Typography, 
  IconButton, 
  Menu, 
  MenuItem, 
  Divider, 
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ButtonGroup,
  LinearProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  FolderOpen as OpenIcon,
  History as HistoryIcon,
  MoreVert as MoreIcon,
  FileDownload as ExportIcon,
  Restore as RestoreIcon,
  SaveAs as SaveAsIcon
} from '@mui/icons-material';
import VersionHistory from './VersionHistory';
import { DocumentVersion } from '@/types/document';

interface DocumentToolbarProps {
  onSave: () => Promise<void>;
  onSaveAs: () => Promise<void>;
  onOpen: (path?: string) => Promise<void>;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  versions?: DocumentVersion[];
  activeVersionId?: string | null;
  onVersionSelect?: (version: DocumentVersion) => void;
}

const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  onSave,
  onSaveAs,
  onOpen,
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  versions = [],
  activeVersionId,
  onVersionSelect
}) => {

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleVersionSelect = useCallback((version: typeof versions[0]) => {
    setSelectedVersion(version);
  }, []);

  const handleRestoreClick = useCallback((version: typeof versions[0]) => {
    setSelectedVersion(version);
    setShowRestoreConfirm(true);
  }, []);

  const handleRestoreVersion = useCallback(async () => {
    if (!selectedVersion) return;
    
    try {
      onVersionSelect(selectedVersion);
      setShowRestoreConfirm(false);
      setSelectedVersion(null);
    } catch (error) {
      console.error('Failed to restore version:', error);
      throw error; // Re-throw to allow error handling in parent
    }
  }, [onVersionSelect, selectedVersion]);

  const handleSave = useCallback(async () => {
    try {
      await onSave();
    } catch (error) {
      console.error('Failed to save document:', error);
      throw error; // Re-throw to allow error handling in parent
    }
  }, [onSave]);

  const handleOpen = useCallback(async () => {
    try {
      await onOpen();
    } catch (error) {
      console.error('Failed to open document:', error);
    }
  }, [onOpen]);

  const formatLastSaved = useCallback((date: Date | null) => {
    if (!date) return 'Never saved';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    
    return date.toLocaleDateString();
  }, []);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Toolbar variant="dense" disableGutters>
        <ButtonGroup variant="text" size="small" sx={{ mr: 1 }}>
          <Tooltip title={hasUnsavedChanges ? 'Save changes' : 'No changes to save'}>
            <Button
              color="inherit"
              startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </Tooltip>
          
          <Tooltip title="Save a copy of this document">
            <Button
              color="inherit"
              startIcon={<SaveAsIcon />}
              onClick={onSaveAs}
              disabled={isSaving}
            >
              Save As
            </Button>
          </Tooltip>
          
          <Tooltip title="Open a document">
            <Button
              color="inherit"
              startIcon={<OpenIcon />}
              onClick={handleOpen}
              disabled={isSaving}
            >
              Open
            </Button>
          </Tooltip>
        </ButtonGroup>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        <ButtonGroup variant="text" size="small">
          <Button
            color="inherit"
            startIcon={<HistoryIcon />}
            onClick={() => setShowVersionHistory(true)}
            disabled={isSaving || versions.length === 0}
          >
            Versions
          </Button>
          
          <Tooltip title={`Last saved: ${lastSaved?.toLocaleString() || 'Never'}`}>
            <Typography variant="caption" sx={{ ml: 1, alignSelf: 'center', color: 'text.secondary' }}>
              {isSaving ? 'Saving...' : formatLastSaved(lastSaved)}
            </Typography>
          </Tooltip>
        </ButtonGroup>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Tooltip title="More options">
          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            disabled={isLoading}
          >
            <MoreIcon />
          </IconButton>
        </Tooltip>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => {
            setShowExportDialog(true);
            handleMenuClose();
          }}>
            <ExportIcon sx={{ mr: 1 }} /> Export
          </MenuItem>
        </Menu>
      </Toolbar>
      
      {/* Version History Dialog */}
      <Dialog 
        open={showVersionHistory} 
        onClose={() => setShowVersionHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Document Version History</DialogTitle>
        <DialogContent>
          <VersionHistory
            document={currentDocument}
            onVersionSelect={handleVersionSelect}
            onRestore={handleRestoreClick}
            currentVersionId={currentDocument.versions[0]?.id}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVersionHistory(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Version Confirmation Dialog */}
      <Dialog
        open={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
      >
        <DialogTitle>Restore Version</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to restore this version?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will create a new version with the selected content.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRestoreConfirm(false)}>
            Cancel
          </Button>
          <Button 
            onClick={confirmRestore}
            variant="contained"
            color="primary"
            startIcon={<RestoreIcon />}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Export Dialog - Placeholder for future implementation */}
      <Dialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      >
        <DialogTitle>Export Document</DialogTitle>
        <DialogContent>
          <Typography>Export functionality will be implemented here.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentToolbar;
