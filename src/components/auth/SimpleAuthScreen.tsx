/**
 * Simple Authentication Screen
 * 
 * Clean, focused authentication interface without debug information.
 * Just login and signup - perfect for testing Firebase auth.
 */

import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { useAuthStatus } from '../../hooks/useAuth';

/**
 * Simple Authentication Screen Component
 * 
 * Provides a clean interface for testing authentication.
 * Shows login/signup forms without debug information.
 */
export const SimpleAuthScreen: React.FC = () => {
  const { isAuthenticated, user } = useAuthStatus();
  const [showSignup, setShowSignup] = useState(false);

  // If user is authenticated, show welcome message
  if (isAuthenticated && user) {
    return (
      <Box sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 8 }}>
        <Box textAlign="center">
          <Typography variant="h5" gutterBottom color="success.main">
            ✅ Authentication Working!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Welcome, {user.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Firebase authentication is successfully configured and working.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Show login or signup form
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: 'grey.50' }}>
      {showSignup ? (
        <SignupScreen 
          onSwitchToLogin={() => setShowSignup(false)}
        />
      ) : (
        <LoginScreen 
          onSwitchToSignup={() => setShowSignup(true)}
        />
      )}
    </Box>
  );
};
