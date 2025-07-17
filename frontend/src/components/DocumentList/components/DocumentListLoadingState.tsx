import React from 'react';
import { Box, Skeleton } from '@mui/material';

export const DocumentListLoadingState: React.FC<{ viewMode?: 'grid' | 'list' | 'table' }> = ({
  viewMode = 'table',
}) => {
  if (viewMode === 'table') {
    return (
      <Box p={2}>
        {[...Array(5)].map((_, index) => (
          <Box key={index} display="flex" alignItems="center" mb={2}>
            <Skeleton variant="rectangular" width={24} height={24} sx={{ mr: 2 }} />
            <Skeleton variant="text" width={40} height={24} sx={{ mr: 2 }} />
            <Skeleton variant="text" width="40%" height={24} sx={{ flexGrow: 1 }} />
            <Skeleton variant="text" width={80} height={24} sx={{ ml: 'auto' }} />
          </Box>
        ))}
      </Box>
    );
  }

  if (viewMode === 'list') {
    return (
      <Box p={2}>
        {[...Array(8)].map((_, index) => (
          <Box key={index} display="flex" alignItems="center" mb={2}>
            <Skeleton variant="rectangular" width={40} height={40} sx={{ mr: 2 }} />
            <Box>
              <Skeleton variant="text" width={200} height={20} />
              <Skeleton variant="text" width={120} height={16} />
            </Box>
            <Skeleton variant="text" width={80} height={20} sx={{ ml: 'auto' }} />
          </Box>
        ))}
      </Box>
    );
  }

  // Grid view
  return (
    <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={2} p={2}>
      {[...Array(8)].map((_, index) => (
        <Box key={index}>
          <Skeleton variant="rectangular" sx={{ width: '100%', height: 160, mb: 1, borderRadius: 1 }} />
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="text" width="60%" height={16} />
        </Box>
      ))}
    </Box>
  );
};
