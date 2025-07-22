import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemButton, ListItemText, CircularProgress, Box } from '@mui/material';

interface AIActionModalProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
}

const actions = [
  { id: 'summarize', title: 'Summarize' },
  { id: 'fix-grammar', title: 'Fix Grammar & Spelling' },
  { id: 'improve-writing', title: 'Improve Writing' },
  { id: 'make-shorter', title: 'Make Shorter' },
  { id: 'make-longer', title: 'Make Longer' },
];

const AIActionModal: React.FC<AIActionModalProps> = ({ open, loading, onClose, onSelectAction }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Ask AI</DialogTitle>
      <DialogContent dividers sx={{ position: 'relative' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <List>
          {actions.map((action) => (
            <ListItem key={action.id} disablePadding>
              <ListItemButton onClick={() => onSelectAction(action.id)} disabled={loading}>
                <ListItemText primary={action.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIActionModal;
