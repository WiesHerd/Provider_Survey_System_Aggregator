/**
 * Provider Type Detection Hook
 * 
 * Custom hook for managing dynamic provider type detection and data availability.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  providerTypeDetectionService, 
  ProviderTypeDetectionResult, 
  ProviderTypeInfo 
} from '../services/ProviderTypeDetectionService';
import { ProviderType } from '../types/provider';

export interface UseProviderTypeDetectionReturn {
  // Detection state
  availableTypes: ProviderTypeInfo[];
  hasAnyData: boolean;
  totalSurveys: number;
  isLoading: boolean;
  error: string | null;
  lastScan: Date | null;
  
  // Actions
  refresh: () => Promise<void>;
  clearCache: () => void;
  
  // Utility functions
  hasProviderTypeData: (providerType: ProviderType | 'OTHER', customDescription?: string) => boolean;
  getProviderTypeInfo: (providerType: ProviderType | 'OTHER', customDescription?: string) => ProviderTypeInfo | null;
  getCustomProviderTypes: () => ProviderTypeInfo[];
  
  // Cache status
  cacheStatus: {
    hasCache: boolean;
    lastScan: Date | null;
    age: number;
  };
}

/**
 * Hook for dynamic provider type detection
 * 
 * @param autoRefresh - Whether to automatically refresh on mount
 * @param refreshInterval - Interval for automatic refresh (in ms)
 * @returns Provider type detection state and actions
 */
export const useProviderTypeDetection = (
  autoRefresh: boolean = true,
  refreshInterval: number = 30000 // 30 seconds
): UseProviderTypeDetectionReturn => {
  const [availableTypes, setAvailableTypes] = useState<ProviderTypeInfo[]>([]);
  const [hasAnyData, setHasAnyData] = useState<boolean>(false);
  const [totalSurveys, setTotalSurveys] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  // Load provider types
  const loadProviderTypes = useCallback(async () => {
    console.log('🔄 Loading provider types...');
    setIsLoading(true);
    setError(null);

    try {
      const result = await providerTypeDetectionService.detectAvailableProviderTypes();
      
      setAvailableTypes(result.availableTypes);
      setHasAnyData(result.hasAnyData);
      setTotalSurveys(result.totalSurveys);
      setLastScan(result.lastScan);
      
      // If no data, stop auto-refresh to prevent infinite spinning
      if (!result.hasAnyData) {
        console.log('🔍 No provider data found - stopping auto-refresh to prevent infinite spinning');
      } else {
        console.log(`✅ Found ${result.availableTypes.length} provider types with data`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect provider types');
      console.error('Provider type detection error:', err);
    } finally {
      console.log('🏁 Provider type detection completed, setting loading to false');
      setIsLoading(false);
    }
  }, []);

  // Refresh data
  const refresh = useCallback(async () => {
    await providerTypeDetectionService.forceRefresh();
    await loadProviderTypes();
  }, [loadProviderTypes]);

  // Clear cache
  const clearCache = useCallback(() => {
    providerTypeDetectionService.clearCache();
  }, []);

  // Check if provider type has data
  const hasProviderTypeData = useCallback((providerType: ProviderType | 'OTHER', customDescription?: string): boolean => {
    if (providerType === 'OTHER') {
      return availableTypes.some(type => 
        type.type === 'OTHER' && 
        type.customDescription === customDescription
      );
    }
    
    return availableTypes.some(type => type.type === providerType);
  }, [availableTypes]);

  // Get provider type info
  const getProviderTypeInfo = useCallback((providerType: ProviderType | 'OTHER', customDescription?: string): ProviderTypeInfo | null => {
    if (providerType === 'OTHER') {
      return availableTypes.find(type => 
        type.type === 'OTHER' && 
        type.customDescription === customDescription
      ) || null;
    }
    
    return availableTypes.find(type => type.type === providerType) || null;
  }, [availableTypes]);

  // Get custom provider types
  const getCustomProviderTypes = useCallback((): ProviderTypeInfo[] => {
    return availableTypes.filter(type => type.type === 'OTHER');
  }, [availableTypes]);

  // Get cache status
  const cacheStatus = providerTypeDetectionService.getCacheStatus();

  // Auto-refresh on mount - ALWAYS force refresh so we never show stale empty cache (e.g. from before auth)
  useEffect(() => {
    if (autoRefresh) {
      refresh();
    }
  }, [autoRefresh, refresh]);

  // Safety timeout to ensure loading state is reset
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Provider type detection taking too long, forcing loading state to false');
        setIsLoading(false);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // Add immediate refresh capability when data changes
  useEffect(() => {
    const handleDataChange = () => {
      console.log('🔄 Data change detected, forcing provider type detection refresh...');
      // ENTERPRISE FIX: Clear cache and force refresh when surveys are uploaded/deleted
      // This ensures the dropdown only shows provider types that actually have data
      providerTypeDetectionService.clearCache();
      refresh(); // Use refresh() which calls forceRefresh() internally
    };

    // Listen for custom events that indicate data changes
    window.addEventListener('survey-uploaded', handleDataChange);
    window.addEventListener('survey-deleted', handleDataChange);
    
    return () => {
      window.removeEventListener('survey-uploaded', handleDataChange);
      window.removeEventListener('survey-deleted', handleDataChange);
    };
  }, [refresh]); // Use refresh instead of loadProviderTypes to ensure cache is cleared

  // Set up refresh interval - only refresh if we have data
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0 && hasAnyData) {
      console.log('🔄 Setting up auto-refresh interval for provider type detection');
      const interval = setInterval(() => {
        // Only refresh if we have data
        if (hasAnyData) {
          console.log('🔄 Auto-refreshing provider type detection...');
          loadProviderTypes();
        }
      }, refreshInterval);

      return () => {
        console.log('🛑 Clearing auto-refresh interval');
        clearInterval(interval);
      };
    } else if (!hasAnyData) {
      console.log('🔍 No data available - skipping auto-refresh setup');
    }
  }, [autoRefresh, refreshInterval, loadProviderTypes, hasAnyData]);

  return {
    // Detection state
    availableTypes,
    hasAnyData,
    totalSurveys,
    isLoading,
    error,
    lastScan,
    
    // Actions
    refresh,
    clearCache,
    
    // Utility functions
    hasProviderTypeData,
    getProviderTypeInfo,
    getCustomProviderTypes,
    
    // Cache status
    cacheStatus
  };
};

export default useProviderTypeDetection;
