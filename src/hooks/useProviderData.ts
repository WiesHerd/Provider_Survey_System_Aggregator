/**
 * Provider Data Hook
 * 
 * Custom hook for managing provider-specific data loading and state.
 * Provides enterprise-grade data management with proper error handling,
 * caching, and state transitions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProviderType } from '../types/provider';
import { providerDataService, ProviderDataResult, ProviderDataState } from '../services/ProviderDataService';

export interface UseProviderDataReturn {
  // Data state
  data: ProviderDataState | null;
  status: 'idle' | 'loading' | 'success' | 'error' | 'empty';
  error: string | null;
  
  // Actions
  refetch: () => Promise<void>;
  clearCache: () => void;
  
  // Computed properties
  hasData: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  hasError: boolean;
  
  // Metadata
  surveyCount: number;
  specialtyCount: number;
  lastUpdated: Date | null;
  
  // Empty state info
  emptyStateMessage: string | null;
  emptyStateActions: Array<{
    label: string;
    action: string;
    variant: 'primary' | 'secondary';
    icon?: string;
  }> | null;
}

/**
 * Hook for managing provider-specific data
 * 
 * @param providerType - The provider type to load data for
 * @param autoLoad - Whether to automatically load data on mount
 * @returns Provider data state and actions
 */
export const useProviderData = (
  providerType: ProviderType,
  autoLoad: boolean = true
): UseProviderDataReturn => {
  const [data, setData] = useState<ProviderDataState | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'empty'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const [emptyStateActions, setEmptyStateActions] = useState<Array<{
    label: string;
    action: string;
    variant: 'primary' | 'secondary';
    icon?: string;
  }> | null>(null);

  // Load provider data
  const loadData = useCallback(async () => {
    if (!providerType) return;

    setStatus('loading');
    setError(null);
    setEmptyStateMessage(null);
    setEmptyStateActions(null);

    try {
      const result: ProviderDataResult = await providerDataService.loadProviderData(providerType);
      
      setStatus(result.status);
      
      if (result.status === 'success' && result.data) {
        setData(result.data);
        setError(null);
      } else if (result.status === 'empty') {
        setData(null);
        setEmptyStateMessage(result.message || null);
        setEmptyStateActions(result.actions || null);
        setError(null);
      } else if (result.status === 'error') {
        setData(null);
        setError(result.error || 'Unknown error occurred');
        setEmptyStateMessage(result.message || null);
        setEmptyStateActions(result.actions || null);
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setData(null);
      setEmptyStateMessage('An unexpected error occurred while loading data.');
      setEmptyStateActions([
        {
          label: 'Retry',
          action: 'retry',
          variant: 'primary'
        }
      ]);
    }
  }, [providerType]);

  // Refetch data
  const refetch = useCallback(async () => {
    providerDataService.clearCache(providerType);
    await loadData();
  }, [providerType, loadData]);

  // Clear cache
  const clearCache = useCallback(() => {
    providerDataService.clearCache(providerType);
  }, [providerType]);

  // Auto-load data on mount or provider type change
  useEffect(() => {
    if (autoLoad && providerType) {
      loadData();
    }
  }, [providerType, autoLoad, loadData]);

  // Computed properties
  const hasData = useMemo(() => {
    return status === 'success' && data !== null && data.surveys.length > 0;
  }, [status, data]);

  const isEmpty = useMemo(() => {
    return status === 'empty' || (status === 'success' && data !== null && data.surveys.length === 0);
  }, [status, data]);

  const isLoading = useMemo(() => {
    return status === 'loading';
  }, [status]);

  const hasError = useMemo(() => {
    return status === 'error';
  }, [status]);

  const surveyCount = useMemo(() => {
    return data?.surveys.length || 0;
  }, [data]);

  const specialtyCount = useMemo(() => {
    return data?.specialtyMappings.length || 0;
  }, [data]);

  const lastUpdated = useMemo(() => {
    return data?.lastUpdated || null;
  }, [data]);

  return {
    // Data state
    data,
    status,
    error,
    
    // Actions
    refetch,
    clearCache,
    
    // Computed properties
    hasData,
    isEmpty,
    isLoading,
    hasError,
    
    // Metadata
    surveyCount,
    specialtyCount,
    lastUpdated,
    
    // Empty state info
    emptyStateMessage,
    emptyStateActions
  };
};

/**
 * Hook for managing provider data with automatic provider type detection
 * 
 * @param autoLoad - Whether to automatically load data on mount
 * @returns Provider data state and actions
 */
export const useCurrentProviderData = (autoLoad: boolean = true): UseProviderDataReturn => {
  // This would integrate with your ProviderContext
  // For now, we'll use a placeholder
  const providerType: ProviderType = 'PHYSICIAN'; // This should come from context
  
  return useProviderData(providerType, autoLoad);
};

/**
 * Hook for managing multiple provider types
 * 
 * @param providerTypes - Array of provider types to load
 * @returns Map of provider data states
 */
export const useMultipleProviderData = (
  providerTypes: ProviderType[]
): Record<ProviderType, UseProviderDataReturn> => {
  const physicianData = useProviderData('PHYSICIAN', providerTypes.includes('PHYSICIAN'));
  const appData = useProviderData('APP', providerTypes.includes('APP'));
  const customData = useProviderData('CUSTOM', providerTypes.includes('CUSTOM'));

  return {
    PHYSICIAN: physicianData,
    APP: appData,
    CALL: appData, // Use APP data structure for CALL for now
    CUSTOM: customData
  };
};

export default useProviderData;
