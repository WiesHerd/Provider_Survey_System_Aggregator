/**
 * Analytics Feature - Custom Hook for Data Management
 * 
 * This hook manages all analytics data fetching, filtering, and state management.
 * Following enterprise patterns for separation of concerns and reusability.
 * 
 * Google-Level Architecture:
 * - Direct IndexedDB access (no caching layer)
 * - Fail-fast error handling
 * - Simple, predictable data flow
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDataService } from '../../../services/DataService';
import { AggregatedData, AnalyticsFilters, UseAnalyticsReturn } from '../types/analytics';
import { filterAnalyticsData } from '../utils/analyticsCalculations';
import { AnalyticsDataService } from '../services/analyticsDataService';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';

/**
 * Custom hook for managing analytics data
 * 
 * @param initialFilters - Initial filter values
 * @param selectedVariables - Selected variables for dynamic data
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
  selectedVariables: string[] = []
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

  // Data fetching function - always fetch fresh from IndexedDB
  const fetchData = useCallback(async () => {
    console.log('🔍 useAnalyticsData: fetchData function called');
    try {
      console.log('🔍 useAnalyticsData: Starting fresh data fetch from IndexedDB');
      setLoading(true);
      setError(null);
      startProgress();
      
      // DEBUG: Check IndexedDB directly first
      const dataService = getDataService();
      console.log('🔍 useAnalyticsData: Checking surveys in IndexedDB...');
      const surveys = await dataService.getAllSurveys();
      console.log('🔍 useAnalyticsData: Found surveys in IndexedDB:', surveys.length);
      surveys.forEach((survey, index) => {
        console.log(`🔍 Survey ${index + 1}:`, {
          id: survey.id,
          name: survey.name,
          type: survey.type,
          year: survey.year,
          rowCount: survey.rowCount,
          providerType: survey.providerType
        });
      });
      
      if (surveys.length === 0) {
        console.log('❌ useAnalyticsData: No surveys found in IndexedDB - this is the problem!');
        setData([]);
        setError('No survey data found. Please upload surveys first.');
        return;
      }
      
      // DEBUG: Check if survey data exists for each survey
      console.log('🔍 useAnalyticsData: Checking survey data for each survey...');
      for (const survey of surveys) {
        try {
          const surveyData = await dataService.getSurveyData(survey.id, {}, { limit: 10 });
          console.log(`🔍 Survey ${survey.id} (${survey.name}):`, {
            hasData: surveyData.rows.length > 0,
            rowCount: surveyData.rows.length,
            firstRow: surveyData.rows[0] || 'No rows'
          });
        } catch (error) {
          console.error(`❌ Failed to get data for survey ${survey.id}:`, error);
        }
      }
      
      // Create new service instance (no singleton complexity)
      const analyticsDataService = new AnalyticsDataService();
      
      // CRITICAL FIX: Always fetch ALL variables first, then filter in the UI
      // This ensures data is always available, regardless of selectedVariables state
      console.log('🔍 useAnalyticsData: Fetching ALL variables (no filtering at service level)');
      const allData = await analyticsDataService.getAnalyticsDataByVariables({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      }, []); // Empty filters and variables = process all data
      
      console.log('🔍 useAnalyticsData: Loaded', allData.length, 'records from IndexedDB');
      
      // Also fetch mappings for filter options
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
      console.error('❌ useAnalyticsData: Error fetching data:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
      resetProgress();
    }
  }, [startProgress, completeProgress, resetProgress]); // FIXED: Removed filters dependency - filtering happens at UI level

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

  // Force refresh function (on-demand)
  const forceRefresh = useCallback(async () => {
    console.log('🔄 Force refreshing analytics data (on-demand)');
    setLoading(true);
    setError(null);
    await fetchData();
  }, [fetchData]);

  // Initial data fetch on mount
  useEffect(() => {
    console.log('🔍 useAnalyticsData: Initial data fetch triggered on mount');
    console.log('🔍 useAnalyticsData: fetchData function reference:', fetchData);
    fetchData();
  }, [fetchData]);

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
    forceRefresh, // Force refresh on-demand
    exportToExcel,
    exportToCSV
  };
};

export { useAnalyticsData };