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

  // Check if authentication is required via environment variable
  // Default: Allow IndexedDB-only mode if Firebase not available
  const envRequireAuth = process.env.REACT_APP_REQUIRE_AUTH === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // CRITICAL: In production, always require authentication unless explicitly disabled
  // This ensures security by default in production environments
  const shouldRequireAuth = isProduction 
    ? (envRequireAuth !== false) // In production, require auth unless explicitly disabled
    : (requireAuth || envRequireAuth); // In development, use prop or env var
  
  // If Firebase is not available
  if (!isAvailable) {
    // If authentication is explicitly required (via prop or env var), show error
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
            {isProduction 
              ? 'Firebase authentication is required in production. Please configure Firebase environment variables in Vercel.'
              : 'Firebase authentication is required. Please configure Firebase environment variables in Vercel or set REACT_APP_REQUIRE_AUTH=false to allow IndexedDB-only mode.'}
          </Typography>
          <SimpleAuthScreen />
        </Box>
      );
    }
    
    // Allow IndexedDB-only mode (no authentication required) - only in development
    if (!isProduction) {
      return <>{children}</>;
    }
    
    // In production, if Firebase is not available and auth is required, show error
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
          Configuration Error
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, textAlign: 'center', maxWidth: 500 }}>
          Firebase authentication is required in production but is not properly configured. Please configure Firebase environment variables.
        </Typography>
      </Box>
    );
  }

  // If authentication is required but user is not authenticated
  if (shouldRequireAuth && !isAuthenticated) {
    return <SimpleAuthScreen />;
  }

  // Allow access (either authenticated or IndexedDB-only mode if requireAuth is false)
  return <>{children}</>;
};

