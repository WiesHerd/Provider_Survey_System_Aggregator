/**
 * Custom hook for multi-year blending state management
 * 
 * ENTERPRISE IMPLEMENTATION using useReducer for complex state
 * Following Redux patterns and best practices from Google/Facebook
 */

import { useReducer, useCallback, useMemo } from 'react';
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

// Local state for UI-only concerns
interface LocalState {
  showMultiYear: boolean;
}

// Action types for reducer
type LocalAction =
  | { type: 'TOGGLE_SHOW_MULTI_YEAR'; payload: boolean };

// Reducer for local UI state
const localStateReducer = (state: LocalState, action: LocalAction): LocalState => {
  switch (action.type) {
    case 'TOGGLE_SHOW_MULTI_YEAR':
      return { ...state, showMultiYear: action.payload };
    default:
      return state;
  }
};

/**
 * Custom hook for managing multi-year blending state and handlers
 * Uses useReducer for complex state management (enterprise pattern)
 */
export const useMultiYearBlending = ({
  filters,
  availableYears,
  onFiltersChange
}: UseMultiYearBlendingProps): UseMultiYearBlendingReturn => {
  // Local UI state (doesn't affect parent)
  const [localState, dispatch] = useReducer(localStateReducer, {
    showMultiYear: false
  });

  // Derive selected years from filters (single source of truth)
  const selectedYears = useMemo(() => {
    return filters.multiYearBlending?.years.map(y => y.year) || [];
  }, [filters.multiYearBlending?.years]);

  // Helper: Create year blend items
  const createYearBlendItems = useCallback((
    years: string[],
    method: 'percentage' | 'weighted' | 'equal',
    equalPercentage: number
  ): YearBlendItem[] => {
    return years.map(year => ({
      year,
      percentage: method === 'percentage' ? equalPercentage : 100 / years.length,
      weight: 1
    }));
  }, []);

  // Helper: Calculate blending config
  const createBlendingConfig = useCallback((
    years: string[],
    method: 'percentage' | 'weighted' | 'equal' = 'equal'
  ): YearBlendingConfig => {
    const percentage = 100 / years.length;
    return {
      method,
      years: createYearBlendItems(years, method, percentage),
      totalPercentage: 100
    };
  }, [createYearBlendItems]);

  // Set show/hide multi-year section
  const setShowMultiYear = useCallback((show: boolean) => {
    dispatch({ type: 'TOGGLE_SHOW_MULTI_YEAR', payload: show });
  }, []);

  // Toggle multi-year blending on/off
  const handleMultiYearToggle = useCallback((enabled: boolean) => {
    if (enabled) {
      // Initialize with two years if available
      const years = availableYears.slice(0, Math.min(2, availableYears.length));
      
      onFiltersChange({
        ...filters,
        year: '', // Clear single year selection
        useMultiYearBlending: true,
        multiYearBlending: createBlendingConfig(years, 'equal')
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
  }, [availableYears, filters, onFiltersChange, createBlendingConfig, setShowMultiYear]);

  // Handle year selection changes from multi-select dropdown
  const handleYearsSelectionChange = useCallback((selectedYears: string[]) => {
    if (selectedYears.length === 0) {
      // If no years selected, disable blending
      handleMultiYearToggle(false);
      return;
    }
    
    // Get current method or default to equal
    const currentMethod = filters.multiYearBlending?.method || 'equal';
    
    onFiltersChange({
      ...filters,
      useMultiYearBlending: true,
      multiYearBlending: createBlendingConfig(selectedYears, currentMethod)
    });
  }, [filters, handleMultiYearToggle, onFiltersChange, createBlendingConfig]);

  // Handle blending method change (percentage/weighted/equal)
  const handleBlendingMethodChange = useCallback((method: 'percentage' | 'weighted' | 'equal') => {
    if (!filters.multiYearBlending) return;
    
    const years = filters.multiYearBlending.years.map(y => y.year);
    
    onFiltersChange({
      ...filters,
      multiYearBlending: createBlendingConfig(years, method)
    });
  }, [filters, onFiltersChange, createBlendingConfig]);

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
    showMultiYear: localState.showMultiYear,
    setShowMultiYear,
    selectedYears,
    handleMultiYearToggle,
    handleYearsSelectionChange,
    handleBlendingMethodChange,
    handlePercentageChange,
    clearAllFilters
  };
};
