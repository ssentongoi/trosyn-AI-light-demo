import React from 'react';
import { Box, Typography, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/Article';

const LeftSidebar: React.FC = () => {
  return (
    <Box
      sx={{
        width: 240,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        height: '100vh',
        p: 2,
        backgroundColor: '#f7f7f7'
      }}
    >
      <Typography variant="h6" component="div" sx={{ mb: 2 }}>
        Trosyn AI
      </Typography>
      <Button variant="outlined" startIcon={<AddIcon />} fullWidth sx={{ mb: 2 }}>
        New Page
      </Button>
      <List>
        {['Getting Started', 'New Page', 'New Page'].map((text, index) => (
          <ListItem key={text + index} disablePadding>
            <ListItemButton selected={index === 0}>
              <ListItemIcon>
                <ArticleIcon />
              </ListItemIcon>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default LeftSidebar;
