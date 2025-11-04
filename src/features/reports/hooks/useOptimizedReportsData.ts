/**
 * Optimized Reports Data Hook
 * Enterprise-grade performance with intelligent caching for Custom Reports
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAnalysisToolsPerformanceService } from '../../../services/AnalysisToolsPerformanceService';

interface ReportsFilters {
  specialty?: string;
  providerType?: string;
  region?: string;
  year?: string;
}

interface UseOptimizedReportsDataReturn {
  // State
  analyticsData: any[];
  loading: boolean;
  error: string | null;
  
  // Performance metrics
  lastLoadTime: number;
  cacheHitRate: number;
  
  // Actions
  loadData: (filters?: ReportsFilters) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Performance
  clearCache: () => void;
  getCacheStats: () => any;
  clearError: () => void;
}

/**
 * Optimized hook for managing custom reports data
 */
export const useOptimizedReportsData = (): UseOptimizedReportsDataReturn => {
  // State declarations
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
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
  const loadData = useCallback(async (filters: ReportsFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Starting optimized custom reports data load...');
      const startTime = performance.now();
      
      const data = await performanceService.getCustomReportsData(filters);
      
      const duration = performance.now() - startTime;
      setLastLoadTime(duration);
      setCacheHitRate(duration < 1000 ? 95 : 60); // Estimate cache hit rate based on load time
      
      console.log(`✅ Custom reports data loaded in ${duration.toFixed(2)}ms`);
      
      setAnalyticsData(data.analyticsData);
      
    } catch (err) {
      console.error('Error loading optimized custom reports data:', err);
      setError('Failed to load custom reports data');
    } finally {
      setLoading(false);
    }
  }, [performanceService]);

  // Performance operations
  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing custom reports data...');
    performanceService.clearCache('customReports');
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
    analyticsData,
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
