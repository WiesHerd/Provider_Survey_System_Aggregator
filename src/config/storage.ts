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
      console.warn('⚠️ REACT_APP_STORAGE_MODE=firebase but Firebase is not configured');
      console.warn('⚠️ Falling back to IndexedDB. Configure Firebase to use cloud storage.');
      return StorageMode.INDEXED_DB;
    }
    
    return envMode;
  }

  // Hybrid mode: Automatically use Firebase if available, otherwise IndexedDB
  if (isFirebaseAvailable()) {
    console.log('💾 Hybrid mode: Using Firebase (cloud storage) - automatically detected');
    return StorageMode.FIREBASE;
  }

  // Fallback to IndexedDB if Firebase not available
  console.log('💾 Hybrid mode: Using IndexedDB (local browser storage) - Firebase not configured');
  return StorageMode.INDEXED_DB;
};

// Helper function to check if Firebase backend is available
export const isBackendAvailable = async (): Promise<boolean> => {
  return isFirebaseAvailable();
};
