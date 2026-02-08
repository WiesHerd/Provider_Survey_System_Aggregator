/**
 * Database Context for managing IndexedDB initialization and health
 * Provides global database state and error recovery capabilities
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { IndexedDBService } from '../services/IndexedDBService';

interface DatabaseState {
  isReady: boolean;
  isInitializing: boolean;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  error: string | null;
  lastChecked: number;
}

interface DatabaseContextType {
  // State
  isReady: boolean;
  isInitializing: boolean;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  checkHealth: () => Promise<void>;
  repair: () => Promise<void>;
  reset: () => Promise<void>;
  clearError: () => void;
  
  // Service access (can be null if Firebase is the storage mode)
  getService: () => IndexedDBService | null;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: React.ReactNode;
}

/**
 * Database Provider Component
 * Manages IndexedDB initialization and provides global database state
 */
export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  // HYBRID MODE: Always initialize IndexedDB for fallback support
  // Even when Firebase is primary, IndexedDB is available for seamless fallback
  const [storageMode] = useState(() => {
    // Use centralized storage mode detection
    try {
      const { getCurrentStorageMode } = require('../config/storage');
      const { StorageMode } = require('../services/DataService');
      const mode = getCurrentStorageMode();
      console.log(`📦 DatabaseContext: Storage mode detected: ${mode} (hybrid mode enabled)`);
      return mode;
    } catch (error) {
      console.warn('⚠️ DatabaseContext: Could not detect storage mode, defaulting to IndexedDB');
      return 'indexeddb';
    }
  });

  const [state, setState] = useState<DatabaseState>({
    isReady: false,
    isInitializing: false,
    healthStatus: 'unknown',
    error: null,
    lastChecked: 0
  });

  // Use ref to track initialization to prevent race conditions
  const initializationStartedRef = React.useRef(false);

  // HYBRID MODE: Always create IndexedDB service for fallback support
  // This ensures IndexedDB is ready even when Firebase is primary storage
  const [service] = useState(() => {
    console.log('🔧 DatabaseContext: Initializing IndexedDB service (always available for fallback)');
    return new IndexedDBService();
  });

  // Initialize database on mount
  const initialize = useCallback(async () => {
    // HYBRID MODE: Always initialize IndexedDB, even when Firebase is primary
    // This ensures IndexedDB is ready for fallback if Firebase fails
    if (!service) {
      console.error('❌ DatabaseContext: IndexedDB service not available');
      setState(prev => ({
        ...prev,
        isReady: false,
        isInitializing: false,
        healthStatus: 'unhealthy',
        error: 'IndexedDB service not available',
        lastChecked: Date.now()
      }));
      return;
    }

    // If using Firebase as primary, still initialize IndexedDB for fallback
    // but mark as ready faster (IndexedDB is backup, Firebase handles primary operations)
    const isFirebasePrimary = storageMode === 'firebase';
    if (isFirebasePrimary) {
      console.log('📦 DatabaseContext: Firebase is primary, initializing IndexedDB for fallback support');
    }

    // Prevent multiple simultaneous initializations
    if (initializationStartedRef.current) {
      console.log('📦 DatabaseContext: Initialization already in progress, skipping...');
      return;
    }

    initializationStartedRef.current = true;
    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      console.log('🔧 DatabaseContext: Starting IndexedDB initialization...');
      
      // Add timeout to prevent infinite hanging (increased to 15 seconds for slow connections)
      const initPromise = service.initialize();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database initialization timed out after 15 seconds')), 15000)
      );
      
      await Promise.race([initPromise, timeoutPromise]);
      
      setState(prev => ({
        ...prev,
        isReady: true,
        isInitializing: false,
        healthStatus: 'healthy',
        error: null,
        lastChecked: Date.now()
      }));
      
      initializationStartedRef.current = false;
      console.log('✅ DatabaseContext: Database initialization completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize database';
      console.error('❌ DatabaseContext: Database initialization failed:', error);
      
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        console.error('❌ IndexedDB is not supported in this browser');
        setState(prev => ({
          ...prev,
          isReady: false,
          isInitializing: false,
          healthStatus: 'unhealthy',
          error: 'IndexedDB is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.',
          lastChecked: Date.now()
        }));
        return;
      }
      
      // ENTERPRISE: Auto-detect version mismatch errors and trigger repair
      const isVersionMismatch = errorMessage.includes('version') && 
                                 (errorMessage.includes('less than') || 
                                  errorMessage.includes('greater than') ||
                                  errorMessage.includes('requested version'));
      
      if (isVersionMismatch) {
        console.warn('🔄 DatabaseContext: Version mismatch detected, attempting automatic repair...');
        // Auto-trigger repair for version mismatch (call service directly to avoid circular dependency)
        try {
          await service.repairDatabase();
          // Re-initialize after repair
          const retryInitPromise = service.initialize();
          const retryTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database initialization timed out after 10 seconds')), 10000)
          );
          await Promise.race([retryInitPromise, retryTimeoutPromise]);
          
          setState(prev => ({
            ...prev,
            isReady: true,
            isInitializing: false,
            healthStatus: 'healthy',
            error: null,
            lastChecked: Date.now()
          }));
          console.log('✅ DatabaseContext: Automatic repair and re-initialization completed successfully');
          return; // Repair succeeded, state already updated
        } catch (repairError) {
          console.error('❌ DatabaseContext: Automatic repair failed:', repairError);
          // Fall through to set error state
        }
      }
      
      // When Firebase is primary, do not block the app: allow user in and use Firebase only.
      // IndexedDB is only a fallback; they can retry or clear it later (e.g. delete SurveyAggregatorDB in DevTools).
      if (isFirebasePrimary) {
        console.warn('📦 DatabaseContext: IndexedDB failed but Firebase is primary - allowing app to load');
        setState(prev => ({
          ...prev,
          isReady: true,
          isInitializing: false,
          healthStatus: 'unknown',
          error: null,
          lastChecked: Date.now()
        }));
        initializationStartedRef.current = false;
        return;
      }

      setState(prev => ({
        ...prev,
        isReady: false,
        isInitializing: false,
        healthStatus: 'unhealthy',
        error: errorMessage,
        lastChecked: Date.now()
      }));
      
      initializationStartedRef.current = false;
    }
  }, [service, storageMode]);

  // Check database health
  const checkHealth = useCallback(async () => {
    // HYBRID MODE: Always check IndexedDB health (even when Firebase is primary)
    // This ensures IndexedDB is ready for fallback
    if (!service) {
      console.error('❌ DatabaseContext: Cannot check health - IndexedDB service not available');
      setState(prev => ({
        ...prev,
        healthStatus: 'unhealthy',
        error: 'IndexedDB service not available',
        lastChecked: Date.now()
      }));
      return;
    }
    try {
      const health = await service.getHealthStatus();
      
      setState(prev => ({
        ...prev,
        healthStatus: health.status,
        error: health.status === 'unhealthy' ? health.details : null,
        lastChecked: Date.now()
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health check failed';
      console.error('❌ DatabaseContext: Health check failed:', error);
      
      setState(prev => ({
        ...prev,
        healthStatus: 'unhealthy',
        error: errorMessage,
        lastChecked: Date.now()
      }));
    }
  }, [service]);

  // Repair database
  // ENTERPRISE: Enhanced repair function that handles version mismatches automatically
  const repair = useCallback(async () => {
    if (!service) {
      console.log('📦 DatabaseContext: No IndexedDB to repair - using Firebase storage');
      setState(prev => ({
        ...prev,
        isReady: true,
        isInitializing: false,
        healthStatus: 'healthy',
        error: null,
        lastChecked: Date.now()
      }));
      return;
    }
    
    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      console.log('🔧 DatabaseContext: Starting database repair...');
      
      // First, try to repair the database
      await service.repairDatabase();
      
      // After repair, re-initialize to ensure database is ready
      // This handles version mismatch issues by re-detecting the version
      console.log('🔄 DatabaseContext: Re-initializing database after repair...');
      await service.initialize();
      
      // Verify database is healthy after repair
      const health = await service.getHealthStatus();
      
      if (health.status === 'healthy') {
        setState(prev => ({
          ...prev,
          isReady: true,
          isInitializing: false,
          healthStatus: 'healthy',
          error: null,
          lastChecked: Date.now()
        }));
        
        console.log('✅ DatabaseContext: Database repair and re-initialization completed successfully');
      } else {
        throw new Error(health.details || 'Database health check failed after repair');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to repair database';
      console.error('❌ DatabaseContext: Database repair failed:', error);
      
      // ENTERPRISE: If repair fails due to version mismatch, try one more time with force clear
      if (errorMessage.includes('version') && (errorMessage.includes('less than') || errorMessage.includes('greater than'))) {
        console.warn('🔄 DatabaseContext: Version mismatch detected, attempting force clear and reinitialize...');
        try {
          // Force clear and reinitialize
          await service.forceClearDatabase();
          await service.initialize();
          
          const health = await service.getHealthStatus();
          if (health.status === 'healthy') {
            setState(prev => ({
              ...prev,
              isReady: true,
              isInitializing: false,
              healthStatus: 'healthy',
              error: null,
              lastChecked: Date.now()
            }));
            console.log('✅ DatabaseContext: Force clear and reinitialize completed successfully');
            return;
          }
        } catch (forceClearError) {
          console.error('❌ DatabaseContext: Force clear also failed:', forceClearError);
        }
      }
      
      setState(prev => ({
        ...prev,
        isReady: false,
        isInitializing: false,
        healthStatus: 'unhealthy',
        error: errorMessage,
        lastChecked: Date.now()
      }));
    }
  }, [service]);

  // Reset database (complete wipe and recreate)
  const reset = useCallback(async () => {
    if (!service) {
      console.log('📦 DatabaseContext: No IndexedDB to reset - using Firebase storage');
      return;
    }
    
    if (!window.confirm('⚠️ WARNING: This will delete ALL survey data, mappings, and settings. This action cannot be undone. Are you sure you want to continue?')) {
      return;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      console.log('🔧 DatabaseContext: Starting database reset...');
      
      // Force clear the database (this will close connections, delete the DB, and reinitialize)
      await service.forceClearDatabase();
      
      // Update state to reflect successful reset
      setState(prev => ({
        ...prev,
        isReady: true,
        isInitializing: false,
        healthStatus: 'healthy',
        error: null,
        lastChecked: Date.now()
      }));
      
      console.log('✅ DatabaseContext: Database reset completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset database';
      console.error('❌ DatabaseContext: Database reset failed:', error);
      
      setState(prev => ({
        ...prev,
        isReady: false,
        isInitializing: false,
        healthStatus: 'unhealthy',
        error: errorMessage,
        lastChecked: Date.now()
      }));
    }
  }, [service]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get service instance
  const getService = useCallback(() => service, [service]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Periodic health checks (every 30 seconds)
  useEffect(() => {
    if (!state.isReady) return;

    const interval = setInterval(() => {
      checkHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [state.isReady, checkHealth]);

  const contextValue: DatabaseContextType = {
    // State
    isReady: state.isReady,
    isInitializing: state.isInitializing,
    healthStatus: state.healthStatus,
    error: state.error,
    
    // Actions
    initialize,
    checkHealth,
    repair,
    reset,
    clearError,
    
    // Service access
    getService
  };

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
};

/**
 * Hook to use database context
 * Must be used within DatabaseProvider
 */
export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  
  return context;
};

/**
 * Hook to check if database is ready
 * Returns true when database is fully initialized and healthy
 */
export const useDatabaseReady = (): boolean => {
  const { isReady, healthStatus } = useDatabase();
  return isReady && healthStatus === 'healthy';
};

/**
 * Hook to get database service
 * Returns the IndexedDBService instance (or null if Firebase is the storage mode)
 */
export const useDatabaseService = (): IndexedDBService | null => {
  const { getService } = useDatabase();
  return getService();
};
