import React, { useState } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

export const VerifyEmailScreen: React.FC = () => {
  const { user, sendVerificationEmail, refreshUser, signOut, loading } = useAuth();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResend = async () => {
    try {
      setStatusMessage(null);
      setErrorMessage(null);
      await sendVerificationEmail();
      setStatusMessage('Verification email sent. Check your inbox.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send verification email';
      setErrorMessage(message);
    }
  };

  const handleRefresh = async () => {
    try {
      setStatusMessage(null);
      setErrorMessage(null);
      const refreshedUser = await refreshUser();
      if (refreshedUser?.emailVerified) {
        setStatusMessage('Email verified. You can continue.');
      } else {
        setStatusMessage('Email not verified yet. Please check your inbox.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh verification status';
      setErrorMessage(message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#ffffff',
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: 420, width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Verify your email
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          We sent a verification link to {user?.email || 'your email'}. Please verify to
          continue.
        </Typography>

        {statusMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {statusMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button variant="contained" onClick={handleRefresh} disabled={loading}>
            I have verified
          </Button>
          <Button variant="outlined" onClick={handleResend} disabled={loading}>
            Resend verification email
          </Button>
          <Button variant="text" onClick={signOut} disabled={loading}>
            Use a different account
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
