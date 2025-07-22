import React, { isValidElement } from 'react';
import { Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Button, Tooltip } from '@mui/material';
import { Add as AddIcon, ArrowBack as ArrowBackIcon, Close as CloseIcon, Article as ArticleIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface Tab {
  id: string;
  title: string;
  icon?: React.ReactNode;
}

interface LeftSidebarProps {
  tabs: Tab[];
  activeTabId: string;
  onAddTab: () => void;
  onSelectTab: (id: string) => void;
  onDeleteTab: (id: string) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ tabs, activeTabId, onAddTab, onSelectTab, onDeleteTab }) => {
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

  const handleDeleteClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation(); // Prevent the tab from being selected
    onDeleteTab(tabId);
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
      <Box sx={{ padding: '0 8px 8px 8px' }}>
        <Button fullWidth variant="text" startIcon={<AddIcon />} onClick={onAddTab} sx={{ textTransform: 'none', color: 'text.secondary', justifyContent: 'flex-start', padding: '6px 8px' }}>
          New Page
        </Button>
      </Box>
      <List dense>
        {tabs.map((tab) => (
          <ListItem key={tab.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              selected={activeTabId === tab.id}
              onClick={() => onSelectTab(tab.id)}
              sx={{
                borderRadius: '6px',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.12)',
                  }
                },
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: 'inherit' }}>
                {isValidElement(tab.icon) ? tab.icon : <ArticleIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText 
                primary={tab.title} 
                primaryTypographyProps={{ 
                  variant: 'body2', 
                  fontWeight: activeTabId === tab.id ? 600 : 400,
                  sx: {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }
                }} 
              />
              <IconButton 
                size="small" 
                onClick={(e) => { e.stopPropagation(); onDeleteTab(tab.id); }}
                sx={{ 
                  visibility: 'hidden',
                  '.MuiListItemButton-root:hover &': {
                    visibility: 'visible'
                  }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
    </Box>
  );
};

export default LeftSidebar;
