import React from 'react';
import { format } from 'date-fns';
import { Button, List, ListItem, ListItemText, Typography, Paper, Divider, Chip } from '@mui/material';
import { Document, DocumentVersion } from '@/types/tauri';

interface VersionHistoryProps {
  document: Document;
  onVersionSelect: (version: DocumentVersion) => void;
  onRestore: (version: DocumentVersion) => Promise<void>;
  currentVersionId?: string;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  document,
  onVersionSelect,
  onRestore,
  currentVersionId,
}) => {
  // Sort versions by timestamp (newest first)
  const sortedVersions = [...document.versions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPpp');
  };

  return (
    <Paper elevation={2} sx={{ p: 2, maxHeight: '60vh', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Version History
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <List dense>
        {sortedVersions.map((version) => (
          <React.Fragment key={version.id}>
            <ListItem
              button
              selected={version.id === currentVersionId}
              onClick={() => onVersionSelect(version)}
              sx={{
                borderRadius: 1,
                mb: 1,
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                },
              }}
            >
              <ListItemText
                primary={formatDate(version.timestamp)}
                secondary={
                  <>
                    {version.isAutoSave && (
                      <Chip
                        label="Auto-saved"
                        size="small"
                        color="default"
                        sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    {version.id === document.versions[0].id && (
                      <Chip
                        label="Current"
                        size="small"
                        color="primary"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </>
                }
              />
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(version);
                }}
                disabled={version.id === document.versions[0].id}
                sx={{ ml: 2 }}
              >
                Restore
              </Button>
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        ))}
      </List>
      
      {sortedVersions.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No version history available
        </Typography>
      )}
    </Paper>
  );
};

export default VersionHistory;
