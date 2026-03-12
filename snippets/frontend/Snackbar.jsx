/**
 * Component: Snackbar
 *
 * Global error notification component. Listens for 'globalErrorEvent'
 * dispatched by the Apollo error link and displays error messages.
 */

import React, { useState } from 'react';
import useEvent from '@react-hook/event';
import { Box, Snackbar as CustomSnackbar, Typography } from '@mui/material';

const Snackbar = ({
  color = 'light.red',
  vertical = 'bottom',
  horizontal = 'center',
}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEvent(document, 'globalErrorEvent', ({ detail }) => {
    const { message: msg } = detail;
    const text = msg?.toString?.() || '';
    // Suppress known non-critical messages that are handled via custom dialogs
    // e.g., Registration with existing email shows WelcomeBackDialog
    if (/already\s+exists/i.test(text)) {
      return;
    }
    setMessage(text);
    setOpen(true);
  });

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <CustomSnackbar
      anchorOrigin={{ vertical, horizontal }}
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
    >
      <Box sx={{ backgroundColor: color }}>
        <Typography variant="body">
          {message}
        </Typography>
        <Box sx={{ cursor: 'pointer' }} onClick={handleClose}>
          {/* CloseIcon */}
          <span>&times;</span>
        </Box>
      </Box>
    </CustomSnackbar>
  );
};

export default Snackbar;
