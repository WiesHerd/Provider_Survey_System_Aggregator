/**
 * Analytics Feature - Custom Hook for Data Management
 * 
 * This hook manages all analytics data fetching, filtering, and state management.
 * Following enterprise patterns for separation of concerns and reusability.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDataService } from '../../../services/DataService';
import { AggregatedData, AnalyticsFilters, UseAnalyticsReturn } from '../types/analytics';
import { filterAnalyticsData } from '../utils/analyticsCalculations';
import { AnalyticsDataService } from '../services/analyticsDataService';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';
import { cacheInvalidation, CacheInvalidationEvent } from '../utils/cacheInvalidation';

/**
 * Custom hook for managing analytics data
 * 
 * @param initialFilters - Initial filter values
 * @returns Object containing data, loading state, error, and actions
 */
const useAnalyticsData = (
  initialFilters: AnalyticsFilters = {
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: '',
    year: ''
  },
  selectedVariables: string[] = [] // NEW: Support for dynamic variables
): UseAnalyticsReturn => {
  // State declarations
  const [data, setData] = useState<any[]>([]); // Support both AggregatedData and DynamicAggregatedData
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);
  const [mappings, setMappings] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<any[]>([]);
  const [regionMappings, setRegionMappings] = useState<any[]>([]);
  
  // Use smooth progress hook
  const { progress: loadingProgress, startProgress, completeProgress, resetProgress } = useSmoothProgress();

  // Memoized filtered data
  const filteredData = useMemo(() => {
    return filterAnalyticsData(data, filters);
  }, [data, filters]);

  // Data fetching function - fetch ALL data without filters
  const fetchData = useCallback(async () => {
    try {
      // Use singleton AnalyticsDataService instance (Google-style)
      const analyticsDataService = new AnalyticsDataService();
      
      // Check if we have cached data first (professional app behavior)
      if (analyticsDataService.hasCachedData()) {
        console.log('🚀 Using cached analytics data - no loading spinner needed');
        const cachedData = analyticsDataService.getCachedData();
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          
          // Still fetch mappings in background (they're lightweight)
          const dataService = getDataService();
          Promise.all([
            dataService.getAllSpecialtyMappings(),
            dataService.getAllColumnMappings(),
            dataService.getRegionMappings()
          ]).then(([specialtyMappings, colMappings, regMappings]) => {
            setMappings(specialtyMappings);
            setColumnMappings(colMappings);
            setRegionMappings(regMappings);
          }).catch(err => {
            console.warn('Failed to load mappings in background:', err);
          });
          
          return; // Exit early with cached data
        }
      }
      
      // Only show loading if we actually need to fetch data
      setLoading(true);
      setError(null);
      startProgress(); // Start smooth progress animation
      
      // FIXED: Always use legacy data fetching for now to ensure CF data displays
      // The dynamic data path is not working correctly with existing data
      // Reduced logging to prevent console spam
      console.log('🔍 useAnalyticsData: Fetching analytics data with', selectedVariables.length, 'selected variables');
      const allData = await analyticsDataService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      });
      
      // Reduced logging to prevent console spam
      console.log('🔍 useAnalyticsData: Loaded', allData.length, 'records');
      if (allData.length > 0) {
        console.log('🔍 useAnalyticsData: Data format:', {
          hasVariables: 'variables' in allData[0],
          recordKeys: Object.keys(allData[0]).slice(0, 10) // Show first 10 keys only
        });
      }
      
      // Also fetch mappings for filter options
      const dataService = getDataService();
      const [specialtyMappings, colMappings, regMappings] = await Promise.all([
        dataService.getAllSpecialtyMappings(),
        dataService.getAllColumnMappings(),
        dataService.getRegionMappings()
      ]);

      setData(allData);
      setMappings(specialtyMappings);
      setColumnMappings(colMappings);
      setRegionMappings(regMappings);
      
      // Complete progress animation
      completeProgress();
    } catch (err) {
      // Error logging removed for performance
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
      resetProgress();
    }
  }, []); // Only fetch once on mount, don't refetch on variable changes

  // Export functions
  const exportToExcel = useCallback(() => {
    const headers = [
      'Survey Source',
      'Survey Specialty', 
      'Geographic Region',
      'TCC # Orgs',
      'TCC # Incumbents',
      'TCC P25',
      'TCC P50',
      'TCC P75',
      'TCC P90',
      'wRVU # Orgs',
      'wRVU # Incumbents',
      'wRVU P25',
      'wRVU P50',
      'wRVU P75',
      'wRVU P90',
      'CF # Orgs',
      'CF # Incumbents',
      'CF P25',
      'CF P50',
      'CF P75',
      'CF P90'
    ];

    const csvData = filteredData.map(row => [
      row.surveySource,
      row.surveySpecialty,
      row.geographicRegion,
      row.tcc_n_orgs,
      row.tcc_n_incumbents,
      row.tcc_p25,
      row.tcc_p50,
      row.tcc_p75,
      row.tcc_p90,
      row.wrvu_n_orgs,
      row.wrvu_n_incumbents,
      row.wrvu_p25,
      row.wrvu_p50,
      row.wrvu_p75,
      row.wrvu_p90,
      row.cf_n_orgs,
      row.cf_n_incumbents,
      row.cf_p25,
      row.cf_p50,
      row.cf_p75,
      row.cf_p90
    ]);

    // Add headers
    csvData.unshift(headers);

    // Convert to CSV string
    const csvContent = csvData
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `survey-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredData]);

  const exportToCSV = useCallback(() => {
    exportToExcel(); // Same function for now
  }, [exportToExcel]);

  // Filter update function
  const updateFilters = useCallback((newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
  }, []);

  // Force refresh function (on-demand) - FIXED: Remove fetchData dependency
  const forceRefresh = useCallback(async () => {
    console.log('🔄 Force refreshing analytics data (on-demand)');
    const analyticsDataService = new AnalyticsDataService();
    analyticsDataService.invalidateCache();
    // Trigger a fresh fetch without dependency issues
    setLoading(true);
    setError(null);
    setTimeout(() => {
      fetchData();
    }, 100);
  }, []); // FIXED: Empty dependency array

  // Initial data fetch only - FIXED: Remove fetchData dependency to prevent infinite loop
  useEffect(() => {
    console.log('🔍 useAnalyticsData: Initial data fetch triggered');
    fetchData();
  }, []); // FIXED: Empty dependency array to fetch only once on mount

  // TEMPORARILY DISABLED: Cache invalidation listeners to stop infinite loop
  // TODO: Re-enable these once the infinite loop issue is resolved
  /*
  useEffect(() => {
    const { cacheInvalidationManager, CacheInvalidationEvent } = require('../utils/cacheInvalidation');
    
    const unsubscribeMappingChanged = cacheInvalidationManager.onInvalidation(
      CacheInvalidationEvent.MAPPING_CHANGED,
      () => {
        console.log('🔄 Mapping changed - refreshing analytics data');
        setLoading(true);
        setError(null);
        setTimeout(() => {
          fetchData();
        }, 100);
      }
    );

    const unsubscribeNewSurvey = cacheInvalidationManager.onInvalidation(
      CacheInvalidationEvent.NEW_SURVEY_UPLOADED,
      () => {
        console.log('🔄 New survey uploaded - refreshing analytics data');
        setLoading(true);
        setError(null);
        setTimeout(() => {
          fetchData();
        }, 100);
      }
    );

    const unsubscribeDataCleared = cacheInvalidationManager.onInvalidation(
      CacheInvalidationEvent.DATA_CLEARED,
      () => {
        console.log('🔄 Data cleared - refreshing analytics data');
        setLoading(true);
        setError(null);
        setTimeout(() => {
          fetchData();
        }, 100);
      }
    );

    return () => {
      unsubscribeMappingChanged();
      unsubscribeNewSurvey();
      unsubscribeDataCleared();
    };
  }, []);
  */

  // Return hook interface
  return {
    data: filteredData, // Return filtered data for display
    allData: data, // Return all data for filter options
    loading,
    loadingProgress,
    error,
    filters,
    setFilters: updateFilters,
    refetch: fetchData,
    forceRefresh, // New: Force refresh on-demand
    exportToExcel,
    exportToCSV
  };
};

export { useAnalyticsData };