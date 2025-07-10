import React, { useEffect } from 'react';
import { Box, Typography, Fade, Portal } from '@mui/material';

interface StatusPopupProps {
  open: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}

export const StatusPopup: React.FC<StatusPopupProps> = ({
  open,
  message,
  onClose,
  duration = 2000,
}) => {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (open) {
      timer = setTimeout(() => {
        onClose();
      }, duration);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <Fade in={open}>
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
            minWidth: 200,
            textAlign: 'center',
            zIndex: 1400,
          }}
        >
          <Typography variant="body1">{message}</Typography>
        </Box>
      </Fade>
    </Portal>
  );
};

export default StatusPopup;
