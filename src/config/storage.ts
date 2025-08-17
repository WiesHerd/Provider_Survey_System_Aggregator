import { StorageMode } from '../services/DataService';

// Storage configuration
export const STORAGE_CONFIG = {
  // Set this to control which storage mode to use
  DEFAULT_MODE: StorageMode.INDEXED_DB,
  
  // Environment-based configuration
  MODE: process.env.REACT_APP_STORAGE_MODE as StorageMode || StorageMode.INDEXED_DB,
  
  // Backend configuration (only used if mode is BACKEND or HYBRID)
  BACKEND_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  
  // IndexedDB configuration
  INDEXED_DB: {
    NAME: 'SurveyAggregatorDB',
    VERSION: 1
  }
};

// Helper function to get current storage mode
export const getCurrentStorageMode = (): StorageMode => {
  // Check if we're in development and backend is available
  if (process.env.NODE_ENV === 'development') {
    // You can add logic here to detect if backend is available
    // For now, use the configured mode
    return STORAGE_CONFIG.MODE;
  }
  
  // In production, default to IndexedDB unless explicitly set to backend
  return STORAGE_CONFIG.MODE === StorageMode.BACKEND ? StorageMode.BACKEND : StorageMode.INDEXED_DB;
};

// Helper function to check if backend is available
export const isBackendAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${STORAGE_CONFIG.BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
};
