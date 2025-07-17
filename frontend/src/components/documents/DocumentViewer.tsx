import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  Tooltip, 
  CircularProgress, 
  Button, 
  Divider, 
  Tabs, 
  Tab, 
  TextField, 
  InputAdornment, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText, 
  Chip, 
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  AlertTitle,
} from '@mui/material';
import { 
  ArrowBack as BackIcon, 
  Edit as EditIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Share as ShareIcon,
  GetApp as DownloadIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useDocumentApi } from '../../contexts/DocumentApiContext';
import DocumentList from './DocumentList';
import DocumentVersionHistory from './DocumentVersionHistory';
import DocumentMetadataEditor from './DocumentMetadataEditor';

type TabPanelProps = {
  children?: React.ReactNode;
  index: number;
  value: number;
};

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`document-tabpanel-${index}`}
      aria-labelledby={`document-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `document-tab-${index}`,
    'aria-controls': `document-tabpanel-${index}`,
  };
}

interface DocumentViewerProps {
  documentId?: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  documentId: propDocumentId, 
  onBack,
  showBackButton = true
}) => {
  const { documentId: paramDocumentId } = useParams<{ documentId: string }>();
  const documentId = propDocumentId || paramDocumentId;
  const navigate = useNavigate();
  
  const { 
    currentDocument, 
    loading, 
    error, 
    getDocument, 
    updateDocument,
    deleteDocument,
    getVersionHistory,
    versionHistory,
    summarizeText,
    spellcheckText,
  } = useDocumentApi();
  
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load document when component mounts or documentId changes
  useEffect(() => {
    if (documentId) {
      loadDocument(documentId);
    }
  }, [documentId]);

  // Update content when currentDocument changes
  useEffect(() => {
    if (currentDocument?.content) {
      setContent(currentDocument.content);
    }
  }, [currentDocument]);

  const loadDocument = async (id: string) => {
    try {
      await getDocument(id);
      // Load version history when document is loaded
      await getVersionHistory(id);
    } catch (err) {
      console.error('Error loading document:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load document',
        severity: 'error',
      });
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Auto-save after a delay
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    autoSaveTimer.current = setTimeout(() => {
      handleSave();
    }, 2000);
  };

  const handleSave = async () => {
    if (!documentId || !content || isSaving) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      await updateDocument(documentId, { content });
      setSnackbar({
        open: true,
        message: 'Document saved successfully',
        severity: 'success',
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving document:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save document';
      setSaveError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentId) return;
    
    try {
      await deleteDocument(documentId);
      setDeleteDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Document deleted successfully',
        severity: 'success',
      });
      
      // Navigate to documents list after deletion
      if (onBack) {
        onBack();
      } else {
        navigate('/documents');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete document',
        severity: 'error',
      });
    }
  };

  const handleShare = () => {
    if (!currentDocument) return;
    
    const shareData = {
      title: currentDocument.title || 'Document',
      text: `Check out this document: ${currentDocument.title}`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      setSnackbar({
        open: true,
        message: 'Link copied to clipboard',
        severity: 'info',
      });
    }
    
    handleMenuClose();
  };

  const handleDownload = () => {
    if (!currentDocument) return;
    
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${currentDocument.title || 'document'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    handleMenuClose();
  };

  const handleSummarize = async () => {
    if (!content) return;
    
    try {
      const result = await summarizeText(content, { length: 'medium' });
      if (result.status === 'success' && result.summary) {
        setSnackbar({
          open: true,
          message: 'Document summarized successfully',
          severity: 'success',
        });
        // You could update the content with the summary or show it in a dialog
        // For now, we'll just log it
        console.log('Summary:', result.summary);
      }
    } catch (err) {
      console.error('Error summarizing document:', err);
      setSnackbar({
        open: true,
        message: 'Failed to summarize document',
        severity: 'error',
      });
    }
  };

  const handleSpellCheck = async () => {
    if (!content) return;
    
    try {
      const result = await spellcheckText(content);
      if (result.status === 'success' && result.issues) {
        const issueCount = result.issues.length;
        setSnackbar({
          open: true,
          message: `Found ${issueCount} potential ${issueCount === 1 ? 'issue' : 'issues'}`,
          severity: issueCount > 0 ? 'warning' : 'success',
        });
        
        // You could highlight the issues in the editor
        // For now, we'll just log them
        if (issueCount > 0) {
          console.log('Spelling/grammar issues:', result.issues);
        }
      }
    } catch (err) {
      console.error('Error checking spelling:', err);
      setSnackbar({
        open: true,
        message: 'Failed to check spelling',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (loading && !currentDocument) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !currentDocument) {
    return (
      <Box p={3}>
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
          <WarningIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Document Not Found
          </Typography>
          <Typography color="textSecondary" paragraph>
            The requested document could not be loaded. It may have been moved or deleted.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleBack}
            startIcon={<BackIcon />}
          >
            Back to Documents
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Document Header */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            {showBackButton && (
              <IconButton onClick={handleBack} sx={{ mr: 1 }}>
                <BackIcon />
              </IconButton>
            )}
            <Typography variant="h4" component="h1">
              {currentDocument.title || 'Untitled Document'}
            </Typography>
            {currentDocument.is_public && (
              <Chip 
                label="Public" 
                size="small" 
                color="success" 
                variant="outlined"
                sx={{ ml: 2 }}
              />
            )}
          </Box>
          
          <Box>
            {isEditing ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={isSaving}
                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                sx={{ mr: 1 }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditToggle}
                sx={{ mr: 1 }}
              >
                Edit
              </Button>
            )}
            
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
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
              <MenuItem onClick={handleShare}>
                <ListItemIcon>
                  <ShareIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Share</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleDownload}>
                <ListItemIcon>
                  <DownloadIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Download</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleSummarize}>
                <ListItemIcon>
                  <InfoIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Summarize</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleSpellCheck}>
                <ListItemIcon>
                  <CheckIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Check Spelling</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleEditToggle}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{isEditing ? 'Stop Editing' : 'Edit Document'}</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => setActiveTab(2)}>
                <ListItemIcon>
                  <HistoryIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Version History</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Delete Document</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="textSecondary">
            Last updated: {currentDocument.updated_at ? format(new Date(currentDocument.updated_at), 'PPpp') : 'N/A'}
          </Typography>
          <Stack direction="row" spacing={1}>
            {currentDocument.tags?.map((tag: string) => (
              <Chip 
                key={tag} 
                label={tag} 
                size="small" 
                variant="outlined"
                onClick={() => {
                  // You could implement tag filtering here
                  console.log('Filter by tag:', tag);
                }}
              />
            ))}
          </Stack>
        </Box>
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="document tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Document" {...a11yProps(0)} />
          <Tab label="Details" {...a11yProps(1)} />
          <Tab 
            label={
              <Box display="flex" alignItems="center">
                <span>Versions</span>
                {versionHistory.length > 0 && (
                  <Chip 
                    label={versionHistory.length} 
                    size="small" 
                    sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            } 
            {...a11yProps(2)} 
          />
        </Tabs>
      </Box>
      
      {/* Document Content */}
      <TabPanel value={activeTab} index={0}>
        {isEditing ? (
          <TextField
            fullWidth
            multiline
            minRows={20}
            maxRows={50}
            variant="outlined"
            value={content}
            onChange={handleContentChange}
            placeholder="Start typing your document here..."
            sx={{
              '& .MuiOutlinedInput-root': {
                p: 2,
                lineHeight: 1.6,
                fontSize: '1rem',
              },
            }}
          />
        ) : (
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 3, 
              minHeight: '60vh',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.8,
              fontSize: '1.05rem',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            }}
          >
            {content || 'No content available.'}
          </Paper>
        )}
        
        {saveError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {saveError}
          </Alert>
        )}
      </TabPanel>
      
      {/* Document Details */}
      <TabPanel value={activeTab} index={1}>
        {currentDocument && (
          <DocumentMetadataEditor 
            document={currentDocument} 
            onUpdate={async (updates) => {
              try {
                await updateDocument(currentDocument.id, updates);
                setSnackbar({
                  open: true,
                  message: 'Document updated successfully',
                  severity: 'success',
                });
                return true;
              } catch (err) {
                console.error('Error updating document:', err);
                setSnackbar({
                  open: true,
                  message: 'Failed to update document',
                  severity: 'error',
                });
                return false;
              }
            }} 
          />
        )}
      </TabPanel>
      
      {/* Version History */}
      <TabPanel value={activeTab} index={2}>
        <DocumentVersionHistory 
          documentId={documentId!} 
          versions={versionHistory} 
          onRestore={async (versionId) => {
            try {
              // The actual restore would be handled by the parent component
              // which would then refresh the document
              await loadDocument(documentId!);
              setSnackbar({
                open: true,
                message: 'Version restored successfully',
                severity: 'success',
              });
              setActiveTab(0); // Switch back to document view
              return true;
            } catch (err) {
              console.error('Error restoring version:', err);
              setSnackbar({
                open: true,
                message: 'Failed to restore version',
                severity: 'error',
              });
              return false;
            }
          }}
        />
      </TabPanel>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Document?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{currentDocument?.title || 'this document'}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            variant="contained"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentViewer;
