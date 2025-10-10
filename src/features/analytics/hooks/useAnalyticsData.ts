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

/**
 * Custom hook for managing analytics data
 * 
 * @param initialFilters - Initial filter values
 * @returns Object containing data, loading state, error, and actions
 */
const useAnalyticsData = (initialFilters: AnalyticsFilters = {
  specialty: '',
  surveySource: '',
  geographicRegion: '',
  providerType: '',
  year: ''
}): UseAnalyticsReturn => {
  // State declarations
  const [data, setData] = useState<AggregatedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);
  const [mappings, setMappings] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<any[]>([]);
  const [regionMappings, setRegionMappings] = useState<any[]>([]);

  // Memoized filtered data
  const filteredData = useMemo(() => {
    return filterAnalyticsData(data, filters);
  }, [data, filters]);

  // Data fetching function - fetch ALL data without filters
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 useAnalyticsData: Starting data fetch...');
      setLoadingProgress(10);
      
      // Use singleton AnalyticsDataService instance (Google-style)
      const analyticsDataService = new AnalyticsDataService();
      console.log('🔍 useAnalyticsData: Using AnalyticsDataService instance');
      
      // Clear cache to force recalculation with fixed percentile logic and provider type normalization
      analyticsDataService.clearCache();
      setLoadingProgress(20);
      
      setLoadingProgress(30);
      const allData = await analyticsDataService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      });

      setLoadingProgress(80);
      console.log('🔍 useAnalyticsData: Fetched all data -', allData.length, 'records');
      console.log('🔍 useAnalyticsData: Sample data:', allData[0]);
      console.log('🔍 useAnalyticsData: Sample data wRVU/CF values:', {
        tcc_p50: allData[0]?.tcc_p50,
        wrvu_p50: allData[0]?.wrvu_p50,
        cf_p50: allData[0]?.cf_p50
      });
      
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
      setLoadingProgress(100);
    } catch (err) {
      console.error('🔍 useAnalyticsData: Error fetching analytics data:', err);
      console.error('🔍 useAnalyticsData: Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace',
        error: err
      });
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  }, []); // Remove filters dependency - fetch all data once

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

  // Initial data fetch and refetch when filters change
  useEffect(() => {
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
    exportToExcel,
    exportToCSV
  };
};

export { useAnalyticsData };