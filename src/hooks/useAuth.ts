/**
 * Authentication Hook
 * 
 * Custom hook that provides convenient access to authentication state and actions.
 * Re-exports useAuth from AuthContext for cleaner imports.
 */

import { useAuth as useAuthContext, useAuthStatus } from '../contexts/AuthContext';

/**
 * Re-export useAuth for convenience
 */
export { useAuthContext as useAuth, useAuthStatus };

/**
 * Hook for authentication actions only
 * 
 * @returns Authentication actions without state
 */
export const useAuthActions = () => {
  const { signUp, signIn, signOut, clearError } = useAuthContext();
  
  return {
    signUp,
    signIn,
    signOut,
    clearError,
  };
};

/**
 * Hook for authentication state only
 * 
 * @returns Authentication state without actions
 */
export const useAuthState = () => {
  const { user, loading, error, isAvailable } = useAuthContext();
  
  return {
    user,
    loading,
    error,
    isAvailable,
  };
};
