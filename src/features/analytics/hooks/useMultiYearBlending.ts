/**
 * Custom hook for multi-year blending state management
 * 
 * Handles all multi-year blending logic in a separate, testable hook
 * Following React best practices for complex state management
 */

import { useState, useCallback, useMemo } from 'react';
import { AnalyticsFilters, YearBlendingConfig } from '../types/analytics';

interface UseMultiYearBlendingProps {
  filters: AnalyticsFilters;
  availableYears: string[];
  onFiltersChange: (filters: AnalyticsFilters) => void;
}

interface UseMultiYearBlendingReturn {
  showMultiYear: boolean;
  setShowMultiYear: (show: boolean) => void;
  selectedYears: string[];
  handleMultiYearToggle: (enabled: boolean) => void;
  handleYearsSelectionChange: (selectedYears: string[]) => void;
  handleBlendingMethodChange: (method: 'percentage' | 'weighted' | 'equal') => void;
  handlePercentageChange: (yearToUpdate: string, newPercentage: number) => void;
  clearAllFilters: () => void;
}

/**
 * Custom hook for managing multi-year blending state and handlers
 */
export const useMultiYearBlending = ({
  filters,
  availableYears,
  onFiltersChange
}: UseMultiYearBlendingProps): UseMultiYearBlendingReturn => {
  const [showMultiYear, setShowMultiYear] = useState(false);

  // Derive selected years from filters instead of duplicating state
  const selectedYears = useMemo(() => {
    return filters.multiYearBlending?.years.map(y => y.year) || [];
  }, [filters.multiYearBlending?.years]);

  // Toggle multi-year blending on/off
  const handleMultiYearToggle = useCallback((enabled: boolean) => {
    if (enabled) {
      // Initialize with two years if available
      const years = availableYears.slice(0, Math.min(2, availableYears.length));
      const percentage = years.length > 0 ? 100 / years.length : 100;
      
      onFiltersChange({
        ...filters,
        year: '', // Clear single year selection
        useMultiYearBlending: true,
        multiYearBlending: {
          method: 'equal',
          years: years.map(year => ({
            year,
            percentage,
            weight: 1
          })),
          totalPercentage: 100
        }
      });
      setShowMultiYear(true);
    } else {
      // Disable multi-year blending
      onFiltersChange({
        ...filters,
        useMultiYearBlending: false,
        multiYearBlending: undefined
      });
    }
  }, [availableYears, filters, onFiltersChange]);

  // Handle year selection changes from multi-select dropdown
  const handleYearsSelectionChange = useCallback((selectedYears: string[]) => {
    if (selectedYears.length === 0) {
      // If no years selected, disable blending
      handleMultiYearToggle(false);
      return;
    }
    
    // Calculate equal percentages for selected years
    const percentage = 100 / selectedYears.length;
    const currentMethod = filters.multiYearBlending?.method || 'equal';
    
    onFiltersChange({
      ...filters,
      useMultiYearBlending: true,
      multiYearBlending: {
        method: currentMethod,
        years: selectedYears.map(year => ({
          year,
          percentage: currentMethod === 'percentage' ? percentage : 100 / selectedYears.length,
          weight: 1
        })),
        totalPercentage: 100
      }
    });
  }, [filters, handleMultiYearToggle, onFiltersChange]);

  // Handle blending method change (percentage/weighted/equal)
  const handleBlendingMethodChange = useCallback((method: 'percentage' | 'weighted' | 'equal') => {
    if (!filters.multiYearBlending) return;
    
    const years = filters.multiYearBlending.years;
    const percentage = 100 / years.length;
    
    onFiltersChange({
      ...filters,
      multiYearBlending: {
        ...filters.multiYearBlending,
        method,
        years: years.map(y => ({
          ...y,
          percentage: method === 'percentage' ? percentage : 100 / years.length
        })),
        totalPercentage: 100
      }
    });
  }, [filters, onFiltersChange]);

  // Handle percentage change for a specific year
  const handlePercentageChange = useCallback((yearToUpdate: string, newPercentage: number) => {
    if (!filters.multiYearBlending) return;
    
    const newYears = filters.multiYearBlending.years.map(y => 
      y.year === yearToUpdate 
        ? { ...y, percentage: newPercentage }
        : y
    );
    
    const totalPercentage = newYears.reduce((sum, y) => sum + y.percentage, 0);
    
    onFiltersChange({
      ...filters,
      multiYearBlending: {
        ...filters.multiYearBlending,
        years: newYears,
        totalPercentage
      }
    });
  }, [filters, onFiltersChange]);

  // Clear all filters helper
  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      specialty: '',
      surveySource: '',
      geographicRegion: '',
      providerType: '',
      year: '',
      useMultiYearBlending: false,
      multiYearBlending: undefined
    });
  }, [onFiltersChange]);

  return {
    showMultiYear,
    setShowMultiYear,
    selectedYears,
    handleMultiYearToggle,
    handleYearsSelectionChange,
    handleBlendingMethodChange,
    handlePercentageChange,
    clearAllFilters
  };
};

