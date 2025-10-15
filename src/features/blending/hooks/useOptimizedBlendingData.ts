/**
 * Optimized Blending Data Hook
 * Enterprise-grade performance with intelligent caching for Custom Blending
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAnalysisToolsPerformanceService } from '../../../services/AnalysisToolsPerformanceService';

interface BlendingFilters {
  specialties?: string[];
  providerType?: string;
  region?: string;
}

interface UseOptimizedBlendingDataReturn {
  // State
  allData: any[];
  availableSpecialties: string[];
  loading: boolean;
  error: string | null;
  
  // Performance metrics
  lastLoadTime: number;
  cacheHitRate: number;
  
  // Actions
  loadData: (filters?: BlendingFilters) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Performance
  clearCache: () => void;
  getCacheStats: () => any;
  clearError: () => void;
}

/**
 * Optimized hook for managing custom blending data
 */
export const useOptimizedBlendingData = (): UseOptimizedBlendingDataReturn => {
  // State declarations
  const [allData, setAllData] = useState<any[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [cacheHitRate, setCacheHitRate] = useState<number>(0);

  // Performance service
  const performanceService = useMemo(() => getAnalysisToolsPerformanceService(), []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Optimized data loading with performance monitoring
  const loadData = useCallback(async (filters: BlendingFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Starting optimized custom blending data load...');
      const startTime = performance.now();
      
      const data = await performanceService.getCustomBlendingData(filters);
      
      const duration = performance.now() - startTime;
      setLastLoadTime(duration);
      setCacheHitRate(duration < 1000 ? 95 : 60); // Estimate cache hit rate based on load time
      
      console.log(`✅ Custom blending data loaded in ${duration.toFixed(2)}ms`);
      
      setAllData(data.allData);
      setAvailableSpecialties(data.availableSpecialties);
      
    } catch (err) {
      console.error('Error loading optimized custom blending data:', err);
      setError('Failed to load custom blending data');
    } finally {
      setLoading(false);
    }
  }, [performanceService]);

  // Performance operations
  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing custom blending data...');
    performanceService.clearCache('customBlending');
    await loadData();
  }, [performanceService, loadData]);

  const clearCache = useCallback(() => {
    performanceService.clearCache();
    console.log('🗑️ Cache cleared');
  }, [performanceService]);

  const getCacheStats = useCallback(() => {
    return performanceService.getCacheStats();
  }, [performanceService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    allData,
    availableSpecialties,
    loading,
    error,
    
    // Performance metrics
    lastLoadTime,
    cacheHitRate,
    
    // Actions
    loadData,
    refreshData,
    
    // Performance
    clearCache,
    getCacheStats,
    clearError
  };
};
