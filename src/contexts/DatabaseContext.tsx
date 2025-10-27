/**
 * Database Context for managing IndexedDB initialization and health
 * Provides global database state and error recovery capabilities
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  clearError: () => void;
  
  // Service access
  getService: () => IndexedDBService;
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
  const [state, setState] = useState<DatabaseState>({
    isReady: false,
    isInitializing: false,
    healthStatus: 'unknown',
    error: null,
    lastChecked: 0
  });

  const [service] = useState(() => new IndexedDBService());

  // Initialize database on mount
  const initialize = useCallback(async () => {
    if (state.isInitializing || state.isReady) {
      return;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      console.log('🔧 DatabaseContext: Starting database initialization...');
      await service.initialize();
      
      setState(prev => ({
        ...prev,
        isReady: true,
        isInitializing: false,
        healthStatus: 'healthy',
        error: null,
        lastChecked: Date.now()
      }));
      
      console.log('✅ DatabaseContext: Database initialization completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize database';
      console.error('❌ DatabaseContext: Database initialization failed:', error);
      
      setState(prev => ({
        ...prev,
        isReady: false,
        isInitializing: false,
        healthStatus: 'unhealthy',
        error: errorMessage,
        lastChecked: Date.now()
      }));
    }
  }, [service, state.isInitializing, state.isReady]);

  // Check database health
  const checkHealth = useCallback(async () => {
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
  const repair = useCallback(async () => {
    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      console.log('🔧 DatabaseContext: Starting database repair...');
      await service.repairDatabase();
      
      setState(prev => ({
        ...prev,
        isReady: true,
        isInitializing: false,
        healthStatus: 'healthy',
        error: null,
        lastChecked: Date.now()
      }));
      
      console.log('✅ DatabaseContext: Database repair completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to repair database';
      console.error('❌ DatabaseContext: Database repair failed:', error);
      
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
 * Returns the IndexedDBService instance
 */
export const useDatabaseService = (): IndexedDBService => {
  const { getService } = useDatabase();
  return getService();
};
