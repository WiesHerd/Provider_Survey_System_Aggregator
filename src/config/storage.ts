import { isFirebaseAvailable } from './firebase';

/**
 * Storage mode enumeration
 * Defines the available storage backends for the application
 */
export enum StorageMode {
  INDEXED_DB = 'indexeddb',
  FIREBASE = 'firebase'
}

// Storage configuration
export const STORAGE_CONFIG = {
  // IndexedDB configuration
  INDEXED_DB: {
    NAME: 'SurveyAggregatorDB',
    VERSION: 7
  },
  
  // Firebase configuration
  FIREBASE: {
    // Firebase config is loaded from environment variables
    // See src/config/firebase.ts
  }
};

/**
 * Get current storage mode using hybrid detection
 * 
 * Hybrid Mode Behavior:
 * - If REACT_APP_STORAGE_MODE is explicitly set, use that mode
 * - Otherwise, automatically use Firebase if available and configured
 * - Fallback to IndexedDB if Firebase is not available
 * 
 * This ensures the app works on Vercel (IndexedDB) while optionally
 * leveraging Firebase cloud storage when credentials are provided.
 */
export const getCurrentStorageMode = (): StorageMode => {
  // Check for explicit override first (allows forcing a specific mode)
  const envMode = process.env.REACT_APP_STORAGE_MODE as StorageMode;
  if (envMode === StorageMode.FIREBASE || envMode === StorageMode.INDEXED_DB) {
    console.log(`📦 Storage mode explicitly set via environment: ${envMode}`);
    
    // Validate Firebase mode if explicitly requested
    if (envMode === StorageMode.FIREBASE && !isFirebaseAvailable()) {
      throw new Error('Firebase storage mode is required but Firebase is not configured.');
    }

    // Firebase-only mode: block IndexedDB to avoid cross-user data bleed
    if (envMode === StorageMode.INDEXED_DB) {
      throw new Error('IndexedDB storage mode is disabled. Configure Firebase for storage.');
    }
    
    return envMode;
  }

  // Firebase-only default: require Firebase to be available
  if (isFirebaseAvailable()) {
    console.log('💾 Firebase-only mode: Using Firebase (cloud storage)');
    return StorageMode.FIREBASE;
  }

  throw new Error('Firebase is required for storage but is not configured.');
};

// Helper function to check if Firebase backend is available
export const isBackendAvailable = async (): Promise<boolean> => {
  return isFirebaseAvailable();
};
