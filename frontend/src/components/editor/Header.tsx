import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

interface HeaderProps {
  onAskAiClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAskAiClick }) => {
  return (
    <AppBar 
      position="static" 
      color="transparent" 
      elevation={0} 
      sx={{ 
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'white'
      }}
    >
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Getting Started
        </Typography>
        <Box>
          <Button color="inherit" sx={{ color: 'text.secondary' }}>Share</Button>
          <Button color="inherit" sx={{ color: 'text.secondary' }}>Export</Button>
          <Button variant="contained" onClick={onAskAiClick} sx={{ mx: 1 }}>Ask AI</Button>
          <Button variant="contained" color="primary">Save</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
