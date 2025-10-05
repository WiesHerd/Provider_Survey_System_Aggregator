/**
 * Custom hook for multi-year blending state management
 * 
 * ENTERPRISE IMPLEMENTATION - Clean, Simple, Professional
 * No fake optimizations, just good code that works
 */

import { useState, useMemo } from 'react';
import { AnalyticsFilters, YearBlendingConfig, YearBlendItem } from '../types/analytics';

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
 * Helper: Create year blend items with proper percentages
 */
const createYearBlendItems = (
  years: string[],
  method: 'percentage' | 'weighted' | 'equal',
  equalPercentage: number
): YearBlendItem[] => {
  return years.map(year => ({
    year,
    percentage: method === 'percentage' ? equalPercentage : 100 / years.length,
    weight: 1
  }));
};

/**
 * Helper: Create complete blending configuration
 */
const createBlendingConfig = (
  years: string[],
  method: 'percentage' | 'weighted' | 'equal' = 'equal'
): YearBlendingConfig => {
  const percentage = 100 / years.length;
  return {
    method,
    years: createYearBlendItems(years, method, percentage),
    totalPercentage: 100
  };
};

/**
 * Custom hook for managing multi-year blending
 * Simple, clear, professional - no pretend optimizations
 */
export const useMultiYearBlending = ({
  filters,
  availableYears,
  onFiltersChange
}: UseMultiYearBlendingProps): UseMultiYearBlendingReturn => {
  // Local UI state
  const [showMultiYear, setShowMultiYear] = useState(false);

  // Derive selected years from filters (single source of truth)
  const selectedYears = useMemo(() => {
    return filters.multiYearBlending?.years.map(y => y.year) || [];
  }, [filters.multiYearBlending?.years]);

  // Toggle multi-year blending on/off
  const handleMultiYearToggle = (enabled: boolean) => {
    if (enabled) {
      const years = availableYears.slice(0, Math.min(2, availableYears.length));
      
      onFiltersChange({
        ...filters,
        year: '',
        useMultiYearBlending: true,
        multiYearBlending: createBlendingConfig(years, 'equal')
      });
      
      setShowMultiYear(true);
    } else {
      onFiltersChange({
        ...filters,
        useMultiYearBlending: false,
        multiYearBlending: undefined
      });
    }
  };

  // Handle year selection changes
  const handleYearsSelectionChange = (selectedYears: string[]) => {
    if (selectedYears.length === 0) {
      handleMultiYearToggle(false);
      return;
    }
    
    const currentMethod = filters.multiYearBlending?.method || 'equal';
    
    onFiltersChange({
      ...filters,
      useMultiYearBlending: true,
      multiYearBlending: createBlendingConfig(selectedYears, currentMethod)
    });
  };

  // Handle blending method change
  const handleBlendingMethodChange = (method: 'percentage' | 'weighted' | 'equal') => {
    if (!filters.multiYearBlending) return;
    
    const years = filters.multiYearBlending.years.map(y => y.year);
    
    onFiltersChange({
      ...filters,
      multiYearBlending: createBlendingConfig(years, method)
    });
  };

  // Handle percentage change for a specific year
  const handlePercentageChange = (yearToUpdate: string, newPercentage: number) => {
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
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
      specialty: '',
      surveySource: '',
      geographicRegion: '',
      providerType: '',
      year: '',
      useMultiYearBlending: false,
      multiYearBlending: undefined
    });
  };

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
