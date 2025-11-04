/**
 * Protected Route Component
 * 
 * Wrapper component that protects routes requiring authentication.
 * Redirects unauthenticated users to login screen.
 */

import React, { ReactNode } from 'react';
import { useAuthStatus } from '../../hooks/useAuth';
import { CircularProgress, Box, Typography } from '@mui/material';

/**
 * Protected route props
 */
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Protected Route Component
 * 
 * Renders children only if user is authenticated.
 * Shows loading state while checking authentication.
 * Shows fallback component if user is not authenticated.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAuthenticated, isLoading, isAvailable } = useAuthStatus();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        alignItems="center" 
        justifyContent="center" 
        minHeight="50vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // If Firebase is not available, allow access (fallback to IndexedDB)
  if (!isAvailable) {
    return <>{children}</>;
  }

  // If not authenticated, show fallback or default message
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Box 
        display="flex" 
        flexDirection="column"
        alignItems="center" 
        justifyContent="center" 
        minHeight="50vh"
        gap={2}
        p={4}
      >
        <Typography variant="h6" color="text.secondary">
          Authentication Required
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Please sign in to access this feature.
        </Typography>
      </Box>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
};
