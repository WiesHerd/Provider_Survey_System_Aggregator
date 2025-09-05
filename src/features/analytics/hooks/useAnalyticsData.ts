/**
 * Custom hook for managing analytics data
 * Extracted from SurveyAnalytics.tsx for better organization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AggregatedData, AnalyticsFilters, AnalyticsState } from '../types/analytics';
import { analyticsDataService } from '../services/analyticsDataService';

/**
 * Custom hook for analytics data management
 * 
 * @param initialFilters - Initial filter values
 * @returns Analytics state and actions
 */
export const useAnalyticsData = (initialFilters: Partial<AnalyticsFilters> = {}) => {
  // State declarations
  const [data, setData] = useState<AggregatedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    specialty: '',
    providerType: '',
    region: '',
    variable: '',
    surveySource: '',
    ...initialFilters
  });

  // Memoized unique values
  const uniqueValues = useMemo(() => {
    return analyticsDataService.getUniqueValues(data);
  }, [data]);

  // Memoized filtered data
  const filteredData = useMemo(() => {
    return analyticsDataService.filterData(data, filters);
  }, [data, filters]);

  // Memoized summary statistics
  const summaryStats = useMemo(() => {
    return analyticsDataService.getSummaryStats(filteredData);
  }, [filteredData]);

  // Load analytics data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const analyticsData = await analyticsDataService.loadAnalyticsData();
      setData(analyticsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
      setError(errorMessage);
      console.error('Error loading analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      specialty: '',
      providerType: '',
      region: '',
      variable: '',
      surveySource: ''
    });
  }, []);

  // Refresh data
  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Return analytics state and actions
  const analyticsState: AnalyticsState = {
    data: filteredData,
    loading,
    error,
    filters,
    uniqueValues
  };

  return {
    // State
    ...analyticsState,
    summaryStats,
    
    // Actions
    updateFilters,
    clearFilters,
    refreshData,
    loadData
  };
};