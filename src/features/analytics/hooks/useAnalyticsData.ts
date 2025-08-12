/**
 * Custom hook for managing analytics data
 * This hook handles data fetching, filtering, sorting, and state management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AggregatedData, AnalyticsFilters, AnalyticsSummary } from '../types/analytics';
import { 
  calculateAnalyticsSummary, 
  applyAnalyticsFilters, 
  sortAnalyticsData,
  validateAnalyticsData 
} from '../utils/analyticsCalculations';
import { LoadingState } from '@/shared/types';

interface UseAnalyticsDataReturn {
  // Data state
  data: AggregatedData[];
  filteredData: AggregatedData[];
  summary: AnalyticsSummary;
  
  // Loading and error state
  loading: LoadingState;
  
  // Filter and sort state
  filters: AnalyticsFilters;
  sorting: {
    column: keyof AggregatedData | null;
    direction: 'asc' | 'desc';
  };
  
  // Actions
  setFilters: (filters: AnalyticsFilters) => void;
  clearFilters: () => void;
  setSorting: (column: keyof AggregatedData, direction: 'asc' | 'desc') => void;
  refreshData: () => Promise<void>;
  
  // Computed values
  availableOptions: {
    specialties: string[];
    providerTypes: string[];
    regions: string[];
    surveySources: string[];
    years: string[];
  };
  
  // Validation
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

interface UseAnalyticsDataOptions {
  initialFilters?: AnalyticsFilters;
  initialSorting?: {
    column: keyof AggregatedData;
    direction: 'asc' | 'desc';
  };
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Custom hook for managing analytics data
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing data, state, and actions
 * 
 * @example
 * ```typescript
 * const {
 *   data,
 *   filteredData,
 *   summary,
 *   loading,
 *   filters,
 *   setFilters,
 *   clearFilters
 * } = useAnalyticsData({
 *   initialFilters: { specialty: 'Cardiology' }
 * });
 * ```
 */
export const useAnalyticsData = (
  options: UseAnalyticsDataOptions = {}
): UseAnalyticsDataReturn => {
  const {
    initialFilters = {},
    initialSorting = { column: null, direction: 'asc' },
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options;

  // State declarations
  const [data, setData] = useState<AggregatedData[]>([]);
  const [filters, setFiltersState] = useState<AnalyticsFilters>(initialFilters);
  const [sorting, setSortingState] = useState(initialSorting);
  const [loading, setLoading] = useState<LoadingState>({
    loading: true,
    error: null,
    lastUpdated: undefined
  });

  // Memoized computed values
  const filteredData = useMemo(() => {
    return applyAnalyticsFilters(data, filters);
  }, [data, filters]);

  const sortedData = useMemo(() => {
    if (!sorting.column) return filteredData;
    return sortAnalyticsData(filteredData, sorting.column, sorting.direction);
  }, [filteredData, sorting]);

  const summary = useMemo(() => {
    return calculateAnalyticsSummary(sortedData);
  }, [sortedData]);

  const availableOptions = useMemo(() => {
    const specialties = [...new Set(data.map(row => row.surveySpecialty))].sort();
    const providerTypes = [...new Set(data.map(row => row.providerType))].sort();
    const regions = [...new Set(data.map(row => row.geographicRegion))].sort();
    const surveySources = [...new Set(data.map(row => row.surveySource))].sort();
    const years = [...new Set(data.map(row => row.surveyYear))].sort();

    return {
      specialties,
      providerTypes,
      regions,
      surveySources,
      years
    };
  }, [data]);

  const validation = useMemo(() => {
    return validateAnalyticsData(data);
  }, [data]);

  // Data fetching function
  const fetchData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, loading: true, error: null }));
      
      // TODO: Replace with actual API call
      // const response = await analyticsApi.getData();
      // setData(response.data);
      
      // For now, we'll use mock data or existing data
      // This should be replaced with actual API integration
      
      setLoading(prev => ({ 
        ...prev, 
        loading: false, 
        lastUpdated: new Date() 
      }));
    } catch (error) {
      setLoading(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch data' 
      }));
    }
  }, []);

  // Actions
  const setFilters = useCallback((newFilters: AnalyticsFilters) => {
    setFiltersState(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  const setSorting = useCallback((column: keyof AggregatedData, direction: 'asc' | 'desc') => {
    setSortingState({ column, direction });
  }, []);

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Effects
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  // Return object
  return {
    // Data state
    data,
    filteredData: sortedData,
    summary,
    
    // Loading and error state
    loading,
    
    // Filter and sort state
    filters,
    sorting,
    
    // Actions
    setFilters,
    clearFilters,
    setSorting,
    refreshData,
    
    // Computed values
    availableOptions,
    
    // Validation
    validation
  };
};
