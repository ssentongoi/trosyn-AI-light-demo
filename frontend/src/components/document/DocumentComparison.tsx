import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Box, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Grid, 
  Typography, 
  Paper,
  Divider,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Tooltip,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Document, DocumentVersion } from '@/types/tauri';
import { DiffEditor } from '@monaco-editor/react';

interface DocumentComparisonProps {
  open: boolean;
  onClose: () => void;
  document: Document;
  onRestore: (version: DocumentVersion) => Promise<void>;
}

export const DocumentComparison: React.FC<DocumentComparisonProps> = ({
  open,
  onClose,
  document,
  onRestore,
}) => {
  const [leftVersionId, setLeftVersionId] = useState<string>('');
  const [rightVersionId, setRightVersionId] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);

  const versions = [...document.versions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const leftVersion = versions.find(v => v.id === leftVersionId);
  const rightVersion = versions.find(v => v.id === rightVersionId) || document.versions[0];

  const handleLeftVersionChange = (event: SelectChangeEvent) => {
    setLeftVersionId(event.target.value);
  };

  const handleRightVersionChange = (event: SelectChangeEvent) => {
    setRightVersionId(event.target.value);
  };

  const handleCompare = () => {
    if (leftVersionId && rightVersionId) {
      setIsComparing(true);
    }
  };

  const handleReset = () => {
    setLeftVersionId('');
    setRightVersionId('');
    setIsComparing(false);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPpp');
  };

  const getVersionLabel = (version: DocumentVersion) => {
    const isCurrent = version.id === document.versions[0].id;
    return `${formatDate(version.timestamp)}${isCurrent ? ' (Current)' : ''}`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Compare Document Versions</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {!isComparing ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel id="left-version-label">Original Version</InputLabel>
                <Select
                  labelId="left-version-label"
                  value={leftVersionId}
                  label="Original Version"
                  onChange={handleLeftVersionChange}
                >
                  {versions.map((version) => (
                    <MenuItem key={`left-${version.id}`} value={version.id}>
                      {getVersionLabel(version)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {leftVersion && (
                <Paper variant="outlined" sx={{ p: 2, height: 300, overflow: 'auto' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {formatDate(leftVersion.timestamp)}
                    {leftVersion.isAutoSave && ' (Auto-saved)'}
                  </Typography>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(leftVersion.content, null, 2)}
                  </pre>
                </Paper>
              )}
            </Grid>
            
            <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Divider orientation="vertical" flexItem />
              <Typography variant="h6" sx={{ mx: 2 }}>vs</Typography>
              <Divider orientation="vertical" flexItem />
            </Grid>
            
            <Grid item xs={12} md={5}>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel id="right-version-label">Compare With</InputLabel>
                <Select
                  labelId="right-version-label"
                  value={rightVersionId}
                  label="Compare With"
                  onChange={handleRightVersionChange}
                >
                  {versions.map((version) => (
                    <MenuItem 
                      key={`right-${version.id}`} 
                      value={version.id}
                      disabled={version.id === leftVersionId}
                    >
                      {getVersionLabel(version)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {rightVersion && (
                <Paper variant="outlined" sx={{ p: 2, height: 300, overflow: 'auto' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {formatDate(rightVersion.timestamp)}
                    {rightVersion.isAutoSave && ' (Auto-saved)'}
                    {rightVersion.id === document.versions[0].id && ' (Current)'}
                  </Typography>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(rightVersion.content, null, 2)}
                  </pre>
                </Paper>
              )}
            </Grid>
            
            <Grid item xs={12} sx={{ mt: 2, textAlign: 'center' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleCompare}
                disabled={!leftVersionId || !rightVersionId}
              >
                Compare Versions
              </Button>
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">
                Comparing changes from {leftVersion && formatDate(leftVersion.timestamp)} to {rightVersion && formatDate(rightVersion.timestamp)}
              </Typography>
              <Button onClick={handleReset} size="small">Change Versions</Button>
            </Box>
            
            <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              <DiffEditor
                height="100%"
                language="json"
                original={leftVersion ? JSON.stringify(leftVersion.content, null, 2) : ''}
                modified={rightVersion ? JSON.stringify(rightVersion.content, null, 2) : ''}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                }}
              />
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip title="This will replace the current document with the selected version">
                <span>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => leftVersion && onRestore(leftVersion)}
                    disabled={!leftVersion}
                  >
                    Restore Left Version
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentComparison;
