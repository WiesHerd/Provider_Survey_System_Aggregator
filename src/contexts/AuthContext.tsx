/**
 * Authentication Context
 * 
 * React context for managing authentication state across the application.
 * Provides user information, loading states, and authentication actions.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { authService, IAuthService } from '../services/AuthService';

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
      console.log('🔍 AuthProvider: Firebase not available, auth disabled');
      return;
    }

    // Subscribe to authentication state changes
    const unsubscribe = authService.onAuthStateChanged((user) => {
      console.log('🔍 AuthProvider: Auth state changed:', user?.email || 'signed out');
      setUser(user);
      setLoading(false);
      setError(null); // Clear any previous errors on successful auth
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
      await authService.signUp(email, password);
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
      await authService.signIn(email, password);
      // Auth state change will be handled by onAuthStateChanged
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      setLoading(false);
      throw err;
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
      setLoading(false);
      throw err;
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
    user,
    isAvailable,
  };
};
