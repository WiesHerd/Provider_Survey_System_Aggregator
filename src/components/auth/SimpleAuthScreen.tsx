/**
 * Simple Authentication Screen
 * 
 * Clean, focused authentication interface without debug information.
 * Just login and signup - perfect for testing Firebase auth.
 */

import React, { useState } from 'react';
import { Box } from '@mui/material';
import { ProfessionalLoginScreen } from './ProfessionalLoginScreen';
import { SignupScreen } from './SignupScreen';

/**
 * Simple Authentication Screen Component
 * 
 * Provides a clean interface for testing authentication.
 * Shows login/signup forms without debug information.
 */
export const SimpleAuthScreen: React.FC = () => {
  const [showSignup, setShowSignup] = useState(false);

  // Show login or signup form
  // When used as AuthGuard, if user is authenticated, they won't see this screen
  return (
    <>
      {showSignup ? (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', p: 2 }}>
          <SignupScreen 
            onSwitchToLogin={() => setShowSignup(false)}
          />
        </Box>
      ) : (
        <ProfessionalLoginScreen 
          onSwitchToSignup={() => setShowSignup(true)}
        />
      )}
    </>
  );
};
