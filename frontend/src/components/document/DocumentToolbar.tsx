import React, { useState } from 'react';
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
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  FolderOpen as OpenIcon,
  History as HistoryIcon,
  Share as ShareIcon,
  MoreVert as MoreIcon,
  FileDownload as ExportIcon,
  CompareArrows as CompareIcon,
  CloudSync as AutoSaveIcon,
} from '@mui/icons-material';
import { Document } from '@/types/tauri';
import { documentUtils } from '@/utils/documentUtils';
import VersionHistory from './VersionHistory';
import DocumentComparison from './DocumentComparison';
import ExportDialog from './ExportDialog';
import ShareDialog from './ShareDialog';

interface DocumentToolbarProps {
  document: Document;
  onSave: () => Promise<void>;
  onOpen: () => Promise<void>;
  onNew: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onDocumentUpdate: (updatedDoc: Document) => void;
}

const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  document,
  onSave,
  onOpen,
  onNew,
  isSaving,
  hasUnsavedChanges,
  onDocumentUpdate,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Document['versions'][0] | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleVersionSelect = (version: Document['versions'][0]) => {
    setSelectedVersion(version);
    setShowVersionHistory(false);
    setShowComparison(true);
  };

  const handleRestoreVersion = async (version: Document['versions'][0]) => {
    try {
      // In a real app, you would call your API to restore the version
      const updatedDoc = {
        ...document,
        content: version.content,
        versions: [
          {
            ...version,
            id: `version-${Date.now()}`,
            timestamp: new Date().toISOString(),
            isAutoSave: false,
          },
          ...document.versions,
        ],
      };
      
      onDocumentUpdate(updatedDoc);
      await onSave();
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  const handleExport = () => {
    setShowExportDialog(true);
    handleMenuClose();
  };

  const handleShare = () => {
    setShowShareDialog(true);
    handleMenuClose();
  };

  const handleCompare = () => {
    if (document.versions.length > 1) {
      setSelectedVersion(document.versions[1]); // Select the previous version
      setShowComparison(true);
    }
    handleMenuClose();
  };

  return (
    <>
      <Toolbar 
        variant="dense" 
        sx={{ 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          minHeight: '48px !important',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Typography variant="h6" noWrap component="div" sx={{ mr: 2 }}>
            {document.title || 'Untitled Document'}
          </Typography>
          
          {hasUnsavedChanges && (
            <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
              (unsaved changes)
            </Typography>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Tooltip title={hasUnsavedChanges ? 'Save (Ctrl+S)' : 'Saved'}>
            <span>
              <Button
                color="primary"
                size="small"
                startIcon={
                  isSaving ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                onClick={onSave}
                disabled={isSaving || !hasUnsavedChanges}
                sx={{ mr: 1 }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </span>
          </Tooltip>
          
          <Tooltip title="Auto-save">
            <IconButton size="small" sx={{ mr: 1 }}>
              <AutoSaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          <Tooltip title="Version History">
            <IconButton 
              size="small" 
              onClick={() => setShowVersionHistory(true)}
              sx={{ mr: 1 }}
            >
              <Badge 
                badgeContent={document.versions.length} 
                color="primary" 
                max={99}
              >
                <HistoryIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Share">
            <IconButton 
              size="small" 
              onClick={handleShare}
              sx={{ mr: 1 }}
            >
              <ShareIcon />
            </IconButton>
          </Tooltip>
          
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            aria-label="more options"
          >
            <MoreIcon />
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={onNew}>
              <OpenIcon fontSize="small" sx={{ mr: 1 }} />
              New Document
            </MenuItem>
            <MenuItem onClick={onOpen}>
              <OpenIcon fontSize="small" sx={{ mr: 1 }} />
              Open...
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleExport}>
              <ExportIcon fontSize="small" sx={{ mr: 1 }} />
              Export...
            </MenuItem>
            
            <MenuItem 
              onClick={handleCompare}
              disabled={document.versions.length <= 1}
            >
              <CompareIcon fontSize="small" sx={{ mr: 1 }} />
              Compare Versions
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleShare}>
              <ShareIcon fontSize="small" sx={{ mr: 1 }} />
              Share...
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
      
      {/* Version History Dialog */}
      {showVersionHistory && (
        <VersionHistory
          document={document}
          onVersionSelect={handleVersionSelect}
          onRestore={handleRestoreVersion}
          currentVersionId={document.versions[0]?.id}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
      
      {/* Document Comparison Dialog */}
      {showComparison && selectedVersion && (
        <DocumentComparison
          open={showComparison}
          onClose={() => setShowComparison(false)}
          document={document}
          selectedVersion={selectedVersion}
          onRestore={handleRestoreVersion}
        />
      )}
      
      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        document={document}
      />
      
      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        document={document}
      />
    </>
  );
};

export default DocumentToolbar;
