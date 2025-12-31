/**
 * Storage Diagnostics Utility
 * 
 * Provides comprehensive diagnostics for storage configuration and status.
 * Helps identify why Firebase might not be working.
 */

import { isFirebaseAvailable } from '../../config/firebase';
import { StorageMode } from '../../config/storage';
import { getFirebaseAuth } from '../../config/firebase';

export interface StorageDiagnostics {
  currentMode: StorageMode;
  configuredMode: StorageMode | null;
  firebaseAvailable: boolean;
  firebaseConfigured: boolean;
  firebaseAuthenticated: boolean;
  userId: string | null;
  missingEnvVars: string[];
  recommendations: string[];
  status: 'ok' | 'warning' | 'error';
}

/**
 * Get comprehensive storage diagnostics
 */
export function getStorageDiagnostics(): StorageDiagnostics {
  const diagnostics: StorageDiagnostics = {
    currentMode: StorageMode.INDEXED_DB,
    configuredMode: null,
    firebaseAvailable: false,
    firebaseConfigured: false,
    firebaseAuthenticated: false,
    userId: null,
    missingEnvVars: [],
    recommendations: [],
    status: 'ok',
  };

  // Check configured mode from environment
  const envMode = process.env.REACT_APP_STORAGE_MODE as StorageMode;
  if (envMode === StorageMode.FIREBASE || envMode === StorageMode.INDEXED_DB) {
    diagnostics.configuredMode = envMode;
  }

  // Check Firebase configuration
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID',
  ];

  diagnostics.missingEnvVars = requiredEnvVars.filter(
    key => !process.env[key]
  );

  diagnostics.firebaseConfigured = diagnostics.missingEnvVars.length === 0;
  diagnostics.firebaseAvailable = isFirebaseAvailable();

  // Check authentication
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    diagnostics.firebaseAuthenticated = !!user;
    diagnostics.userId = user?.uid || null;
  } catch (error) {
    // Firebase not configured
    diagnostics.firebaseAuthenticated = false;
  }

  // Determine current mode (this matches DataService logic)
  if (diagnostics.configuredMode) {
    diagnostics.currentMode = diagnostics.configuredMode;
  } else {
    // Default to IndexedDB (matches DataService default)
    diagnostics.currentMode = StorageMode.INDEXED_DB;
  }

  // Generate recommendations
  if (diagnostics.configuredMode === StorageMode.FIREBASE) {
    if (!diagnostics.firebaseConfigured) {
      diagnostics.recommendations.push(
        'Create .env.local file with Firebase configuration (see env.example)'
      );
      diagnostics.status = 'error';
    } else if (!diagnostics.firebaseAvailable) {
      diagnostics.recommendations.push(
        'Firebase configuration found but initialization failed. Check console for errors.'
      );
      diagnostics.status = 'error';
    } else if (!diagnostics.firebaseAuthenticated) {
      diagnostics.recommendations.push(
        'Firebase is configured but user is not authenticated. Please sign in.'
      );
      diagnostics.status = 'warning';
    } else {
      diagnostics.recommendations.push(
        '✅ Firebase is properly configured and user is authenticated'
      );
      diagnostics.status = 'ok';
    }
  } else {
    if (diagnostics.firebaseConfigured && diagnostics.firebaseAvailable) {
      diagnostics.recommendations.push(
        'Firebase is configured but not enabled. Set REACT_APP_STORAGE_MODE=firebase in .env.local to use cloud storage.'
      );
      diagnostics.status = 'warning';
    } else {
      diagnostics.recommendations.push(
        'Using IndexedDB (local browser storage). Data is stored locally and not synced to cloud.'
      );
      diagnostics.status = 'ok';
    }
  }

  return diagnostics;
}

/**
 * Get user-friendly storage status message
 */
export function getStorageStatusMessage(diagnostics: StorageDiagnostics): string {
  if (diagnostics.currentMode === StorageMode.FIREBASE) {
    if (!diagnostics.firebaseConfigured) {
      return 'Firebase not configured - check .env.local';
    }
    if (!diagnostics.firebaseAvailable) {
      return 'Firebase initialization failed';
    }
    if (!diagnostics.firebaseAuthenticated) {
      return 'Please sign in to use Firebase storage';
    }
    return `Firebase (Cloud) - User: ${diagnostics.userId?.substring(0, 8)}...`;
  }
  
  return 'IndexedDB (Local Browser Storage)';
}





