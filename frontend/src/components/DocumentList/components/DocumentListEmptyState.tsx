import React from 'react';
import { Box, Typography, Button, SvgIcon } from '@mui/material';
import { CloudUpload as UploadIcon, Folder as FolderIcon } from '@mui/icons-material';

interface DocumentListEmptyStateProps {
  onUploadClick?: () => void;
  onNewFolderClick?: () => void;
  searchQuery?: string;
  i18n?: {
    noDocuments?: string;
    noSearchResults?: string;
    uploadYourFirstDocument?: string;
    orCreateANewFolder?: string;
    upload?: string;
    newFolder?: string;
  };
}

export const DocumentListEmptyState: React.FC<DocumentListEmptyStateProps> = ({
  onUploadClick,
  onNewFolderClick,
  searchQuery,
  i18n = {}
}) => {
  const hasSearchQuery = !!searchQuery?.trim();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={6}
      textAlign="center"
      height="100%"
      minHeight={300}
    >
      <Box
        width={120}
        height={120}
        display="flex"
        alignItems="center"
        justifyContent="center"
        mb={3}
        color="text.secondary"
      >
        <SvgIcon component={FolderIcon} style={{ fontSize: 100 }} />
      </Box>
      
      <Typography variant="h6" gutterBottom>
        {hasSearchQuery 
          ? i18n.noSearchResults || 'No documents match your search'
          : i18n.noDocuments || 'No documents found'}
      </Typography>
      
      {!hasSearchQuery && (
        <>
          <Typography variant="body1" color="textSecondary" paragraph>
            {i18n.uploadYourFirstDocument || 'Upload your first document or create a new folder to get started.'}
          </Typography>
          
          <Box display="flex" gap={2} mt={2}>
            {onUploadClick && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadIcon />}
                onClick={onUploadClick}
              >
                {i18n.upload || 'Upload'}
              </Button>
            )}
            
            {onNewFolderClick && (
              <Button
                variant="outlined"
                startIcon={<FolderIcon />}
                onClick={onNewFolderClick}
              >
                {i18n.newFolder || 'New Folder'}
              </Button>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};
