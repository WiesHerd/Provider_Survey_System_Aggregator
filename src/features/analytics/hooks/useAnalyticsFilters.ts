/**
 * Analytics Filters Hook
 * 
 * Custom hook for managing analytics filter state and localStorage persistence.
 * Following enterprise patterns for separation of concerns and reusability.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnalyticsFilters } from '../types/analytics';
import { performanceMonitor } from '../../../shared/utils/performance';

interface UseAnalyticsFiltersReturn {
  filters: AnalyticsFilters;
  handleFilterChange: (filterName: keyof AnalyticsFilters, value: string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Custom hook for managing analytics filters
 * 
 * @param initialFilters - Initial filter values
 * @returns Object containing filters, change handler, and utility functions
 */
export const useAnalyticsFilters = (
  initialFilters: AnalyticsFilters = {
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: '',
    year: ''
  }
): UseAnalyticsFiltersReturn => {
  // State management with localStorage persistence
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    try {
      const savedFilters = localStorage.getItem('analyticsFilters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (error) {
      console.warn('Failed to load saved filters:', error);
    }
    return initialFilters;
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('analyticsFilters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters:', error);
    }
  }, [filters]);

  // Debounced filter change handler
  const debouncedFilterChange = useMemo(
    () => performanceMonitor.debounce((filterName: string, value: string) => {
      setFilters((prev: AnalyticsFilters) => {
        const newFilters = { ...prev, [filterName]: value };
        
        // Clear dependent filters when specialty changes
        if (filterName === 'specialty') {
          newFilters.providerType = '';
          newFilters.geographicRegion = '';
          newFilters.surveySource = '';
        }
        
        return newFilters;
      });
    }, 300),
    []
  );

  // Filter change handler
  const handleFilterChange = useCallback((filterName: keyof AnalyticsFilters, value: string) => {
    debouncedFilterChange(filterName as string, value);
  }, [debouncedFilterChange]);

  // Reset filters to initial state
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => 
      value !== undefined && value !== '' && value !== 'All Sources' && value !== 'All Types' && value !== 'All Years'
    );
  }, [filters]);

  return {
    filters,
    handleFilterChange,
    resetFilters,
    hasActiveFilters
  };
};
