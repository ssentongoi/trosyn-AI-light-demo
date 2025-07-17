import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DocumentService } from '../../services/DocumentService';

interface RecoveryFile {
  path: string;
  name: string;
  lastModified: Date;
}

interface RecoveryDialogProps {
  open: boolean;
  onClose: (recoveredContent?: string, filePath?: string) => void;
}

const RecoveryDialog: React.FC<RecoveryDialogProps> = ({ open, onClose }) => {
  const [recoveryFiles, setRecoveryFiles] = useState<RecoveryFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    const loadRecoveryFiles = async () => {
      if (!open) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real implementation, we would get this from the DocumentService
        const files = await DocumentService.getInstance().checkForRecoveryFiles();
        setRecoveryFiles(files);
      } catch (err) {
        console.error('Failed to load recovery files:', err);
        setError('Failed to load recovery files. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecoveryFiles();
  }, [open]);

  const handleRecover = async () => {
    if (!selectedFile) return;
    
    try {
      const content = await window.fs.readFile(selectedFile, 'utf-8');
      const recoveryData = JSON.parse(content);
      onClose(recoveryData.content, recoveryData.originalPath);
    } catch (err) {
      console.error('Failed to recover file:', err);
      setError('Failed to recover the selected file. It may be corrupted.');
    }
  };

  const handleDiscard = () => {
    // In a real implementation, we would clean up the recovery files
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => onClose()}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Recover Unsaved Changes</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          The following recovery files were found. Would you like to recover any of them?
        </Typography>
        
        {isLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : recoveryFiles.length === 0 ? (
          <Alert severity="info">No recovery files found.</Alert>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
            {recoveryFiles.map((file, index) => (
              <React.Fragment key={file.path}>
                <ListItem 
                  button 
                  selected={selectedFile === file.path}
                  onClick={() => setSelectedFile(file.path)}
                >
                  <ListItemText
                    primary={file.name}
                    secondary={`Last modified: ${file.lastModified.toLocaleString()}`}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItem>
                {index < recoveryFiles.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleDiscard} color="inherit">
          Discard All
        </Button>
        <Button
          onClick={handleRecover}
          color="primary"
          variant="contained"
          disabled={!selectedFile || isLoading}
        >
          Recover Selected
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecoveryDialog;
