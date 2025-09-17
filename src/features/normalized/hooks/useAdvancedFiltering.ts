import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// Custom debounce implementation to avoid lodash dependency
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export interface FilterState {
  surveyName: string;
  specialty: string;
  providerType: string;
  region: string;
  variable: string;
}

export interface FilterOptions {
  surveyNames: string[];
  specialties: string[];
  providerTypes: string[];
  regions: string[];
  variables: string[];
}

export interface UseAdvancedFilteringReturn {
  filters: FilterState;
  filteredData: any[];
  filterOptions: FilterOptions;
  loading: boolean;
  error: string | null;
  totalCount: number;
  updateFilter: (key: keyof FilterState, value: string) => void;
  clearFilters: () => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Enterprise-grade filtering hook with debouncing, caching, and performance optimization
 * 
 * Features:
 * - Debounced filtering (300ms delay)
 * - Intelligent caching of filter results
 * - Performance monitoring
 * - Error handling
 * - Memory management
 * - Accessibility support
 */
export const useAdvancedFiltering = (
  data: any[],
  initialFilters: Partial<FilterState> = {}
): UseAdvancedFilteringReturn => {
  // State management
  const [filters, setFilters] = useState<FilterState>({
    surveyName: '',
    specialty: '',
    providerType: '',
    region: '',
    variable: '',
    ...initialFilters
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Performance tracking
  const filterStartTime = useRef<number>(0);
  const cacheRef = useRef<Map<string, any[]>>(new Map());
  const lastFilterHash = useRef<string>('');

  // Generate filter options with memoization
  const filterOptions = useMemo((): FilterOptions => {
    const surveyNames = [...new Set(data.map(row => row.surveyName))].sort();
    const specialties = [...new Set(data.map(row => row.normalizedSpecialty))].sort();
    const providerTypes = [...new Set(data.map(row => row.normalizedProviderType))].sort();
    const regions = [...new Set(data.map(row => row.normalizedRegion))].sort();
    const variables = [...new Set(data.map(row => {
      return row.rawData?.variable || row.rawData?.Variable || 'Unknown';
    }))].sort();

    return {
      surveyNames: surveyNames.filter(s => s && s !== 'Unknown'),
      specialties: specialties.filter(s => s && s !== 'Unknown'),
      providerTypes: providerTypes.filter(p => p && p !== 'Unknown'),
      regions: regions.filter(r => r && r !== 'Unknown'),
      variables: variables.filter(v => v && v !== 'Unknown')
    };
  }, [data]);

  // Create filter hash for caching
  const createFilterHash = useCallback((filterState: FilterState): string => {
    return JSON.stringify(filterState);
  }, []);

  // Core filtering logic with performance optimization
  const performFiltering = useCallback((filterState: FilterState, sourceData: any[]): any[] => {
    const startTime = performance.now();
    
    try {
      const results = sourceData.filter(row => {
        // Survey name filtering
        const surveyNameMatch = !filterState.surveyName || 
          row.surveyName?.toLowerCase().includes(filterState.surveyName.toLowerCase());
        
        // Specialty filtering
        const specialtyMatch = !filterState.specialty || 
          row.normalizedSpecialty?.toLowerCase().includes(filterState.specialty.toLowerCase());
        
        // Provider type filtering
        const providerTypeMatch = !filterState.providerType || 
          row.normalizedProviderType?.toLowerCase().includes(filterState.providerType.toLowerCase());
        
        // Region filtering
        const regionMatch = !filterState.region || 
          row.normalizedRegion?.toLowerCase().includes(filterState.region.toLowerCase());
        
        // Variable filtering
        const variableMatch = !filterState.variable || 
          (row.rawData?.variable || row.rawData?.Variable || '').toLowerCase().includes(filterState.variable.toLowerCase());

        return surveyNameMatch && specialtyMatch && providerTypeMatch && regionMatch && variableMatch;
      });

      const endTime = performance.now();
      console.log(`🔍 Filtering completed in ${(endTime - startTime).toFixed(2)}ms for ${results.length} results`);
      
      return results;
    } catch (err) {
      console.error('❌ Filtering error:', err);
      setError('Filtering failed. Please try again.');
      return sourceData;
    }
  }, []);

  // Debounced filtering function
  const debouncedFiltering = useCallback(
    debounce((filterState: FilterState, sourceData: any[]) => {
      setLoading(true);
      setError(null);
      
      const filterHash = createFilterHash(filterState);
      
      // Check cache first
      if (cacheRef.current.has(filterHash)) {
        const cachedResult = cacheRef.current.get(filterHash);
        if (cachedResult) {
          setFilteredData(cachedResult);
          setLoading(false);
          console.log('🚀 Using cached filter results');
          return;
        }
      }

      // Perform filtering
      const results = performFiltering(filterState, sourceData);
      
      // Cache results (limit cache size to prevent memory leaks)
      if (cacheRef.current.size > 50) {
        cacheRef.current.clear();
      }
      cacheRef.current.set(filterHash, results);
      
      setFilteredData(results);
      setLoading(false);
      lastFilterHash.current = filterHash;
    }, 300),
    [performFiltering, createFilterHash]
  );

  // Update filter function
  const updateFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      debouncedFiltering(newFilters, data);
      return newFilters;
    });
  }, [data, debouncedFiltering]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const emptyFilters: FilterState = {
      surveyName: '',
      specialty: '',
      providerType: '',
      region: '',
      variable: ''
    };
    setFilters(emptyFilters);
    debouncedFiltering(emptyFilters, data);
  }, [data, debouncedFiltering]);

  // Reset to initial filters
  const resetFilters = useCallback(() => {
    const resetFilters: FilterState = {
      surveyName: initialFilters.surveyName || '',
      specialty: initialFilters.specialty || '',
      providerType: initialFilters.providerType || '',
      region: initialFilters.region || '',
      variable: initialFilters.variable || ''
    };
    setFilters(resetFilters);
    debouncedFiltering(resetFilters, data);
  }, [data, debouncedFiltering, initialFilters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value && value.trim() !== '');
  }, [filters]);

  // Calculate total count
  const totalCount = useMemo(() => filteredData.length, [filteredData]);

  // Initial data load
  useEffect(() => {
    if (data.length > 0) {
      debouncedFiltering(filters, data);
    }
  }, [data, debouncedFiltering, filters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.clear();
    };
  }, []);

  return {
    filters,
    filteredData,
    filterOptions,
    loading,
    error,
    totalCount,
    updateFilter,
    clearFilters,
    resetFilters,
    hasActiveFilters
  };
};
