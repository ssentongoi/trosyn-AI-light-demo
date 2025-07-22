import React from 'react';
import { AppBar, Toolbar, Button, Box, TextField, Tooltip, IconButton, Divider } from '@mui/material';
import { History as HistoryIcon, Comment as CommentIcon, UploadFile as UploadFileIcon } from '@mui/icons-material';
import { Page } from '../types';

interface TopBarProps {
  page: Page;
  onTitleChange: (newTitle: string) => void;
  onSave: () => void;
  onExport: () => void;
  onAskAI: () => void;
  lastEdited: string | null;
  onToggleComments: () => void;
  onUpload: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ page, onTitleChange, onSave, onExport, onAskAI, lastEdited, onToggleComments, onUpload }) => {
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={lastEdited ? `Last edited: ${new Date(lastEdited).toLocaleString()}` : 'Not saved yet'}>
            <span>
              <IconButton size="small" color="inherit" disabled={!lastEdited}>
                <HistoryIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="View Comments">
            <IconButton size="small" color="inherit" onClick={onToggleComments}>
              <CommentIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Upload Document">
            <IconButton size="small" color="inherit" onClick={onUpload}>
              <UploadFileIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5 }} />

          <Button color="inherit">Share</Button>
          <Button color="inherit" onClick={onExport}>Export</Button>
          <Button variant="contained" onClick={onAskAI} sx={{ ml: 1 }}>Ask AI</Button>
          <Button variant="contained" color="primary" onClick={onSave} sx={{ ml: 1 }}>Save</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
