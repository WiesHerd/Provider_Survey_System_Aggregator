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
 * Get current storage mode using cloud-first detection
 * 
 * Cloud-First Behavior (Enterprise Mode):
 * - If REACT_APP_STORAGE_MODE is explicitly set, use that mode
 * - Otherwise, default to Firebase (cloud) when available
 * - If Firebase is not available, fall back to IndexedDB automatically
 * - IndexedDB is always initialized as a backup/cache layer
 * 
 * This ensures data is primarily stored in the cloud with automatic
 * local backup for offline access and resilience.
 */
export const getCurrentStorageMode = (): StorageMode => {
  // Check for explicit override first (allows forcing a specific mode)
  const envMode = process.env.REACT_APP_STORAGE_MODE as StorageMode;
  if (envMode === StorageMode.FIREBASE || envMode === StorageMode.INDEXED_DB) {
    console.log(`📦 Storage mode explicitly set via environment: ${envMode}`);
    
    // Validate Firebase mode if explicitly requested
    if (envMode === StorageMode.FIREBASE && !isFirebaseAvailable()) {
      console.warn('⚠️ Firebase mode requested but Firebase not available - falling back to IndexedDB');
      return StorageMode.INDEXED_DB;
    }
    
    return envMode;
  }

  // CLOUD-FIRST: Default to Firebase when available
  if (isFirebaseAvailable()) {
    console.log('☁️ Cloud-first mode: Using Firebase (cloud storage with local backup)');
    return StorageMode.FIREBASE;
  }

  // Fallback to IndexedDB if Firebase is not configured
  console.log('💾 Fallback mode: Using IndexedDB (Firebase not configured)');
  return StorageMode.INDEXED_DB;
};

// Helper function to check if Firebase backend is available
export const isBackendAvailable = async (): Promise<boolean> => {
  return isFirebaseAvailable();
};
