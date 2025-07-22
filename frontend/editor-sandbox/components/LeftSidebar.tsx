import React from 'react';
import { Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Divider } from '@mui/material';
import { Add as AddIcon, ArrowBack as ArrowBackIcon, Article as ArticleIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const LeftSidebar = () => {
  const theme = useTheme();

  const sidebarStyles = {
    width: '280px',
    flexShrink: 0,
    backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
    borderRight: `1px solid ${theme.palette.divider}`,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 8px',
  };

  return (
    <Box sx={sidebarStyles}>
      <Box sx={{ display: 'flex', alignItems: 'center', padding: '0 8px 16px 8px', justifyContent: 'space-between' }}>
        <IconButton size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Trosyn AI</Typography>
        <Box />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', padding: '0 8px 8px 8px', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">Document tabs</Typography>
        <IconButton size="small">
          <AddIcon />
        </IconButton>
      </Box>
      <List dense>
        <ListItem 
          disablePadding
          sx={{
            backgroundColor: theme.palette.action.selected,
            borderRadius: '8px',
          }}
        >
          <ListItemButton sx={{ borderRadius: '8px' }}>
            <ListItemIcon sx={{ minWidth: '32px' }}>
              <ArticleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Tab 1" />
            <IconButton edge="end" size="small">
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ flexGrow: 1, padding: '16px', color: 'text.secondary', textAlign: 'center' }}>
        <Typography variant="caption">
          Headings you add to the document will appear here.
        </Typography>
      </Box>
    </Box>
  );
};

export default LeftSidebar;
