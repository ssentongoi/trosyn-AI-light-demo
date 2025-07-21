import React from 'react';
import { AppBar, Toolbar, Button, Box, TextField } from '@mui/material';
import { Page } from '../types';

interface TopBarProps {
  page: Page;
  onTitleChange: (newTitle: string) => void;
  onSave: () => void;
  onExport: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ page, onTitleChange, onSave, onExport }) => {
  return (
    <AppBar position="static" color="default" elevation={0} sx={{ backgroundColor: 'white', borderBottom: '1px solid #e0e0e0' }}>
      <Toolbar>
        <TextField
          variant="standard"
          value={page.title}
          onChange={(e) => onTitleChange(e.target.value)}
          sx={{
            flexGrow: 1,
            '& .MuiInput-underline:before': { borderBottom: 'none' },
            '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
            '& .MuiInput-underline:after': { borderBottom: 'none' },
            '& .MuiInputBase-input': {
              fontSize: '1.25rem',
              fontWeight: 'bold',
            }
          }}
        />
        <Box>
          <Button color="inherit">Share</Button>
          <Button color="inherit" onClick={onExport}>Export</Button>
          <Button variant="contained" onClick={onSave} sx={{ ml: 1 }}>Save</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
