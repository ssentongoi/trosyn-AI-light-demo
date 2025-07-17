import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDocumentApi } from '../../contexts/DocumentApiContext';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress,
  Paper,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Stack,
} from '@mui/material';
import { Upload as UploadIcon, Close as CloseIcon } from '@mui/icons-material';

interface DocumentUploaderProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess?: (document: any) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ 
  open, 
  onClose,
  onUploadSuccess 
}) => {
  const { uploadDocument, loading, error, clearError } = useDocumentApi();
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    is_public: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFile(file);
      // Set default title to filename without extension
      const title = file.name.replace(/\.[^/.]+$/, '');
      setMetadata(prev => ({ ...prev, title }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    } as const, // Add const assertion to fix type error
    multiple: false,
  });

  const handleRemoveFile = () => {
    setFile(null);
    setMetadata(prev => ({ ...prev, title: '' }));
  };

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setMetadata(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!metadata.tags.includes(newTag)) {
        setMetadata(prev => ({
          ...prev,
          tags: [...prev.tags, newTag],
        }));
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && metadata.tags.length > 0) {
      // Remove last tag on backspace when input is empty
      setMetadata(prev => ({
        ...prev,
        tags: prev.tags.slice(0, -1),
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async () => {
    if (!file) return;

    try {
      // Create a progress event handler
      const progressHandler = (progressEvent: ProgressEvent) => {
        if (progressEvent.lengthComputable) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      };

      const response = await uploadDocument(file, {
        ...metadata,
        file_size: file.size,
        file_type: file.type || file.name.split('.').pop() || 'txt',
      });

      if (onUploadSuccess && response.document_id) {
        onUploadSuccess(response);
      }
      
      // Reset form and close
      setFile(null);
      setMetadata({
        title: '',
        description: '',
        tags: [],
        is_public: false,
      });
      setUploadProgress(0);
      onClose();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleCloseError = () => {
    clearError();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent dividers>
          {!file ? (
            <Paper
              variant="outlined"
              {...getRootProps()}
              sx={{
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                borderStyle: 'dashed',
                borderColor: 'divider',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon fontSize="large" color="action" />
              <Typography variant="h6" gutterBottom>
                Drag & drop a file here, or click to select
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Supported formats: .txt, .md, .pdf, .doc, .docx
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                Max file size: 10MB
              </Typography>
            </Paper>
          ) : (
            <Box>
              <Box display="flex" alignItems="center" mb={2}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
                <Button 
                  size="small" 
                  onClick={handleRemoveFile}
                  startIcon={<CloseIcon />}
                >
                  Change
                </Button>
              </Box>

              <TextField
                fullWidth
                label="Title"
                name="title"
                value={metadata.title}
                onChange={handleMetadataChange}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                name="description"
                value={metadata.description}
                onChange={handleMetadataChange}
                margin="normal"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Tags</InputLabel>
                <TextField
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Press Enter to add tags"
                  margin="none"
                />
                <FormHelperText>Add tags to help organize your documents</FormHelperText>
                {metadata.tags.length > 0 && (
                  <Box mt={1}>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {metadata.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          onDelete={() => removeTag(tag)}
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Visibility</InputLabel>
                <Select
                  name="is_public"
                  value={metadata.is_public}
                  onChange={(e) => handleMetadataChange(e as React.ChangeEvent<HTMLInputElement>)}
                  label="Visibility"
                >
                  <MenuItem value="false">Private (Only you)</MenuItem>
                  <MenuItem value="true">Public (Anyone with the link)</MenuItem>
                </Select>
              </FormControl>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <Box mt={2}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Uploading: {uploadProgress}%
                  </Typography>
                  <Box width="100%" bgcolor="action.hover" borderRadius={4} overflow="hidden">
                    <Box 
                      sx={{
                        bgcolor: 'primary.main',
                        height: 8,
                        width: `${uploadProgress}%`,
                        borderRadius: 4,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            color="primary" 
            variant="contained"
            disabled={!file || !metadata.title || loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DocumentUploader;
