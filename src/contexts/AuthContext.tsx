/**
 * Authentication Context
 * 
 * React context for managing authentication state across the application.
 * Provides user information, loading states, and authentication actions.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { authService, IAuthService } from '../services/AuthService';
import { logger } from '../shared/utils/logger';
import { isFirebaseAvailable } from '../config/firebase';
import { getCurrentStorageMode } from '../config/storage';
import { StorageMode } from '../services/DataService';

/**
 * Authentication state interface
 */
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAvailable: boolean;
}

/**
 * Authentication actions interface
 */
interface AuthActions {
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/**
 * Combined authentication context value
 */
interface AuthContextValue extends AuthState, AuthActions {}

/**
 * Create authentication context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Authentication provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider Component
 * 
 * Wraps the application with authentication state and actions.
 * Automatically handles auth state changes and provides clean interface.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  // Initialize auth service availability
  useEffect(() => {
    const available = authService.isAvailable();
    setIsAvailable(available);
    
    if (!available) {
      setLoading(false);
      logger.log('🔍 AuthProvider: Firebase not available, auth disabled');
      return;
    }

    // Subscribe to authentication state changes
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      logger.log('🔍 AuthProvider: Auth state changed:', user?.email || 'signed out');
      setUser(user);
      setLoading(false);
      setError(null); // Clear any previous errors on successful auth
      
      // Ensure user profile exists in Firestore if using Firebase
      if (user && isFirebaseAvailable() && getCurrentStorageMode() === StorageMode.FIREBASE) {
        try {
          // Dynamically import FirestoreService to avoid issues if Firebase isn't available
          const { FirestoreService } = await import('../services/FirestoreService');
          const firestoreService = new FirestoreService();
          await firestoreService.ensureUserProfile(user.email || undefined);
        } catch (error) {
          // Non-critical - log but don't block authentication
          logger.warn('⚠️ AuthProvider: Could not ensure user profile:', error);
        }
      }
    });

    authService.handleRedirectResult().catch((err) => {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      logger.error('❌ AuthProvider: Redirect sign-in failed:', err);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Sign up new user
   */
  const signUp = async (email: string, password: string): Promise<void> => {
    if (!isAvailable) {
      throw new Error('Authentication service is not available');
    }

    try {
      setLoading(true);
      setError(null);
      const userCredential = await authService.signUp(email, password);
      // Ensure user profile exists in Firestore if using Firebase
      if (userCredential.user && isFirebaseAvailable() && getCurrentStorageMode() === StorageMode.FIREBASE) {
        try {
          const { FirestoreService } = await import('../services/FirestoreService');
          const firestoreService = new FirestoreService();
          await firestoreService.ensureUserProfile(userCredential.user.email || undefined);
        } catch (error) {
          // Non-critical - log but don't block signup
          logger.warn('⚠️ AuthProvider: Could not ensure user profile after signup:', error);
        }
      }
      // Auth state change will be handled by onAuthStateChanged
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  /**
   * Sign in existing user
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    if (!isAvailable) {
      throw new Error('Authentication service is not available');
    }

    try {
      setLoading(true);
      setError(null);
      const userCredential = await authService.signIn(email, password);
      // Ensure user profile exists in Firestore if using Firebase
      if (userCredential.user && isFirebaseAvailable() && getCurrentStorageMode() === StorageMode.FIREBASE) {
        try {
          const { FirestoreService } = await import('../services/FirestoreService');
          const firestoreService = new FirestoreService();
          await firestoreService.ensureUserProfile(userCredential.user.email || undefined);
        } catch (error) {
          // Non-critical - log but don't block signin
          logger.warn('⚠️ AuthProvider: Could not ensure user profile after signin:', error);
        }
      }
      // Auth state change will be handled by onAuthStateChanged
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async (): Promise<void> => {
    if (!isAvailable) {
      throw new Error('Authentication service is not available');
    }

    try {
      setLoading(true);
      setError(null);
      await authService.signInWithGoogle();
      // Note: User profile will be ensured in onAuthStateChanged callback
      // Auth state change will be handled by onAuthStateChanged
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign in failed';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  /**
   * Send verification email to current user
   */
  const sendVerificationEmail = async (): Promise<void> => {
    if (!isAvailable) {
      throw new Error('Authentication service is not available');
    }

    try {
      setLoading(true);
      setError(null);
      await authService.sendVerificationEmail();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification email';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string): Promise<void> => {
    if (!isAvailable) {
      throw new Error('Authentication service is not available');
    }

    try {
      setLoading(true);
      setError(null);
      await authService.resetPassword(email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send password reset email';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh current user state (used for email verification checks)
   */
  const refreshUser = async (): Promise<User | null> => {
    if (!isAvailable) {
      return null;
    }

    try {
      setLoading(true);
      const refreshedUser = await authService.reloadCurrentUser();
      setUser(refreshedUser);
      return refreshedUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh user';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async (): Promise<void> => {
    if (!isAvailable) {
      throw new Error('Authentication service is not available');
    }

    try {
      setLoading(true);
      setError(null);
      await authService.signOut();
      // Auth state change will be handled by onAuthStateChanged
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear authentication error
   */
  const clearError = (): void => {
    setError(null);
  };

  // Context value
  const value: AuthContextValue = {
    // State
    user,
    loading,
    error,
    isAvailable,
    // Actions
    signUp,
    signIn,
    signInWithGoogle,
    sendVerificationEmail,
    resetPassword,
    refreshUser,
    signOut,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use authentication context
 * 
 * @returns Authentication context value
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * Hook to check if user is authenticated
 * 
 * @returns Object with authentication status and user info
 */
export const useAuthStatus = () => {
  const { user, loading, isAvailable } = useAuth();
  
  return {
    isAuthenticated: !!user,
    isUnauthenticated: !user && !loading,
    isLoading: loading,
    isEmailVerified: !!user?.emailVerified,
    user,
    isAvailable,
  };
};
