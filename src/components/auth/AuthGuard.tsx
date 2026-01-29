/**
 * Authentication Guard Component
 * 
 * Wraps the entire app and handles authentication flow.
 * Shows login screen if not authenticated, otherwise shows app.
 * 
 * When Firebase is available, authentication is required.
 * When Firebase is not available, falls back to IndexedDB-only mode.
 */

import React from 'react';
import { useAuthStatus } from '../../hooks/useAuth';
import { SimpleAuthScreen } from './SimpleAuthScreen';
import { CircularProgress, Box, Typography } from '@mui/material';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // If false, allows IndexedDB-only mode when Firebase unavailable
}

/**
 * Authentication Guard Component
 * 
 * Protects the entire application by requiring authentication when Firebase is available.
 * Shows login screen if user is not authenticated.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAuth = true // Default to requiring auth when Firebase is available
}) => {
  const { isAuthenticated, isLoading, isAvailable } = useAuthStatus();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        alignItems="center" 
        justifyContent="center" 
        minHeight="100vh"
        gap={2}
        bgcolor="grey.50"
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  // Check if authentication should be required
  // Allow bypassing auth requirement via environment variable for IndexedDB-only mode
  const envRequireAuth = process.env.REACT_APP_REQUIRE_AUTH;
  const shouldRequireAuth = envRequireAuth === undefined 
    ? (process.env.NODE_ENV === 'production') // Default: require in production, optional in development
    : envRequireAuth === 'true';
  
  // If Firebase is not available and auth is required, show error
  // If Firebase is not available and auth is not required, allow IndexedDB-only mode
  if (!isAvailable) {
    if (shouldRequireAuth) {
      return (
        <Box 
          display="flex" 
          flexDirection="column"
          alignItems="center" 
          justifyContent="center"
          minHeight="100vh"
          gap={2}
          bgcolor="grey.50"
          p={3}
        >
          <Typography variant="h5" color="error" sx={{ mb: 2 }}>
            Authentication Required
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, textAlign: 'center', maxWidth: 500 }}>
            Firebase authentication is required. Please configure Firebase environment variables.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 500 }}>
            To use IndexedDB-only mode (no authentication), set REACT_APP_REQUIRE_AUTH=false in your .env.local file.
          </Typography>
        </Box>
      );
    }
    
    // Firebase not available but auth not required - allow IndexedDB-only mode
    console.log('🔍 AuthGuard: Firebase unavailable, running in IndexedDB-only mode (no authentication)');
    return <>{children}</>;
  }

  // If authentication is required but user is not authenticated
  if (shouldRequireAuth && !isAuthenticated) {
    return <SimpleAuthScreen />;
  }

  // Allow access (either authenticated or IndexedDB-only mode if requireAuth is false)
  return <>{children}</>;
};

