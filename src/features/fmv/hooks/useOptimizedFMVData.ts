/**
 * Optimized FMV Data Hook
 * Enterprise-grade performance with intelligent caching for Fair Market Value
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAnalysisToolsPerformanceService } from '../../../services/AnalysisToolsPerformanceService';

interface FMVFilters {
  specialty?: string;
  providerType?: string;
  region?: string;
  year?: string;
  aggregationMethod?: string;
}

interface UseOptimizedFMVDataReturn {
  // State
  marketData: any;
  normalizedRows: any[];
  loading: boolean;
  error: string | null;
  
  // Performance metrics
  lastLoadTime: number;
  cacheHitRate: number;
  
  // Actions
  loadData: (filters?: FMVFilters) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Performance
  clearCache: () => void;
  getCacheStats: () => any;
  clearError: () => void;
}

/**
 * Optimized hook for managing FMV data
 */
export const useOptimizedFMVData = (): UseOptimizedFMVDataReturn => {
  // State declarations
  const [marketData, setMarketData] = useState<any>(null);
  const [normalizedRows, setNormalizedRows] = useState<any[]>([]);
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
  const loadData = useCallback(async (filters: FMVFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Starting optimized FMV data load...');
      const startTime = performance.now();
      
      const data = await performanceService.getFMVData(filters);
      
      const duration = performance.now() - startTime;
      setLastLoadTime(duration);
      setCacheHitRate(duration < 1000 ? 95 : 60); // Estimate cache hit rate based on load time
      
      console.log(`✅ FMV data loaded in ${duration.toFixed(2)}ms`);
      
      setMarketData(data.marketData);
      setNormalizedRows(data.normalizedRows);
      
    } catch (err) {
      console.error('Error loading optimized FMV data:', err);
      setError('Failed to load FMV data');
    } finally {
      setLoading(false);
    }
  }, [performanceService]);

  // Performance operations
  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing FMV data...');
    performanceService.clearCache('fmv');
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
    marketData,
    normalizedRows,
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
