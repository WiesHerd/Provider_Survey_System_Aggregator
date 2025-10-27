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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect provider types');
      console.error('Provider type detection error:', err);
    } finally {
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

  // Auto-refresh on mount
  useEffect(() => {
    if (autoRefresh) {
      loadProviderTypes();
    }
  }, [autoRefresh, loadProviderTypes]);

  // Set up refresh interval - only refresh if we have data or are actively loading
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0 && (hasAnyData || isLoading)) {
      const interval = setInterval(() => {
        // Only refresh if we have data or are currently loading
        if (hasAnyData || isLoading) {
          loadProviderTypes();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadProviderTypes, hasAnyData, isLoading]);

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
