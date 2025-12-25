/**
 * User Scoping Utility
 * 
 * Provides user ID for scoping data in IndexedDB and other storage.
 * In production, requires authentication. Falls back to local user ID for development.
 */

import { getFirebaseAuth, isFirebaseAvailable } from '../../config/firebase';

/**
 * Get current user ID
 * 
 * Priority:
 * 1. Firebase Auth user ID (if authenticated)
 * 2. Local user ID from localStorage (for development/IndexedDB-only mode)
 * 
 * @returns User ID string
 */
export const getUserId = (): string => {
  // Try to get from Firebase Auth first
  if (isFirebaseAvailable()) {
    try {
      const auth = getFirebaseAuth();
      if (auth?.currentUser?.uid) {
        return auth.currentUser.uid;
      }
    } catch (error) {
      // Firebase not available, continue to fallback
    }
  }

  // Fallback: Use local storage for IndexedDB-only mode
  // This is only acceptable in development
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    // In production, we should have Firebase Auth
    // If we don't, generate a temporary ID but log a warning
    console.warn('⚠️ Production mode: No authenticated user found. Using temporary user ID.');
  }

  let localUserId = localStorage.getItem('localUserId');
  if (!localUserId) {
    // Generate a unique local user ID
    localUserId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('localUserId', localUserId);
  }
  return localUserId;
};

/**
 * Scope a key with user ID
 * 
 * @param key - Base key name
 * @returns User-scoped key
 */
export const userScopedKey = (key: string): string => {
  const userId = getUserId();
  return `${userId}_${key}`;
};

/**
 * Check if user is authenticated (has Firebase Auth user)
 * 
 * @returns True if user is authenticated via Firebase
 */
export const isUserAuthenticated = (): boolean => {
  if (!isFirebaseAvailable()) {
    return false;
  }
  
  try {
    const auth = getFirebaseAuth();
    return !!auth?.currentUser?.uid;
  } catch (error) {
    return false;
  }
};

/**
 * Get user ID synchronously (for use in non-React contexts)
 * 
 * @returns User ID or null if not available
 */
export const getUserIdSync = (): string | null => {
  if (isFirebaseAvailable()) {
    try {
      const auth = getFirebaseAuth();
      if (auth?.currentUser?.uid) {
        return auth.currentUser.uid;
      }
    } catch (error) {
      // Firebase not available
    }
  }

  // Fallback to local storage
  return localStorage.getItem('localUserId');
};

