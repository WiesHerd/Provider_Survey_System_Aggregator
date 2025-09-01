import { StorageMode } from '../services/DataService';

// Storage configuration
export const STORAGE_CONFIG = {
  // Set this to control which storage mode to use
  DEFAULT_MODE: StorageMode.INDEXED_DB,
  
  // Environment-based configuration
  MODE: process.env.REACT_APP_STORAGE_MODE as StorageMode || StorageMode.INDEXED_DB,
  
  // IndexedDB configuration
  INDEXED_DB: {
    NAME: 'SurveyAggregatorDB',
    VERSION: 1
  }
};

// Helper function to get current storage mode
export const getCurrentStorageMode = (): StorageMode => {
  // Always return IndexedDB since we removed backend support
  return StorageMode.INDEXED_DB;
};

// Helper function to check if backend is available
export const isBackendAvailable = async (): Promise<boolean> => {
  // Backend is no longer supported
  return false;
};
