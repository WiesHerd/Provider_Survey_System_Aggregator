/**
 * Authentication Test Screen
 * 
 * Hidden test route for verifying Firebase authentication functionality.
 * Not integrated into main app navigation - accessed via direct URL.
 */

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Alert,
  Divider,
  Chip
} from '@mui/material';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { useAuth, useAuthStatus } from '../../hooks/useAuth';

/**
 * Authentication Test Screen Component
 * 
 * Provides a complete test interface for authentication functionality.
 * Includes login/signup forms and user status display.
 */
export const AuthTestScreen: React.FC = () => {
  const { user, signOut, isAvailable } = useAuth();
  const { isAuthenticated, isLoading } = useAuthStatus();
  const [showSignup, setShowSignup] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        🔐 Authentication Test Screen
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This is a hidden test route for verifying Firebase authentication functionality.
        Access via: <code>/auth-test</code>
      </Typography>

      {/* Firebase Status */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Firebase Status
          </Typography>
          <Box display="flex" gap={1} alignItems="center" sx={{ mb: 2 }}>
            <Chip 
              label={isAvailable ? "Available" : "Not Available"} 
              color={isAvailable ? "success" : "error"}
              size="small"
            />
            {!isAvailable && (
              <Typography variant="body2" color="text.secondary">
                Check .env.local configuration
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Authentication Status */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Authentication Status
          </Typography>
          <Box display="flex" gap={1} alignItems="center" sx={{ mb: 2 }}>
            <Chip 
              label={isLoading ? "Loading..." : isAuthenticated ? "Authenticated" : "Not Authenticated"} 
              color={isLoading ? "default" : isAuthenticated ? "success" : "warning"}
              size="small"
            />
          </Box>
          
          {user && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                <strong>Email:</strong> {user.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>UID:</strong> {user.uid}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Authentication Forms */}
      {!isAvailable ? (
        <Alert severity="warning" sx={{ mb: 4 }}>
          Firebase is not configured. Create a .env.local file with your Firebase credentials to test authentication.
        </Alert>
      ) : !isAuthenticated ? (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Authentication Test
            </Typography>
            {showSignup ? (
              <SignupScreen 
                onSwitchToLogin={() => setShowSignup(false)}
              />
            ) : (
              <LoginScreen 
                onSwitchToSignup={() => setShowSignup(true)}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Welcome, {user?.email}!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You are successfully authenticated. This proves Firebase Auth is working correctly.
            </Typography>
            <Button 
              variant="outlined" 
              onClick={handleSignOut}
              color="secondary"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Next Steps
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <ol>
              <li>If Firebase is not available, create a .env.local file with your Firebase credentials</li>
              <li>Test sign up with a new email address</li>
              <li>Test sign in with the created account</li>
              <li>Verify user information is displayed correctly</li>
              <li>Test sign out functionality</li>
            </ol>
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> This test screen is not integrated into the main app navigation.
            Your current IndexedDB workflow remains unchanged.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
