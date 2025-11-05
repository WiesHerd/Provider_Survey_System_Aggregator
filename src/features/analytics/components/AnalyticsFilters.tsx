/**
 * Analytics Feature - Filters Component
 * 
 * This component handles all filter controls for analytics data.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo, useCallback } from 'react';
import { 
  FormControl,
  Autocomplete,
  TextField,
  Chip
} from '@mui/material';
import { AnalyticsFiltersProps } from '../types/analytics';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';
import { StandardDropdown } from '../../../shared/components';
import { 
  formatVariableDisplayName, 
  getVariableColor,
  validateVariableSelection 
} from '../utils/variableFormatters';
import { MAX_SELECTED_VARIABLES } from '../types/variables';

/**
 * AnalyticsFilters component for filtering analytics data
 * 
 * @param filters - Current filter values
 * @param onFiltersChange - Callback when filters change
 * @param availableSpecialties - Available specialty options
 * @param availableSources - Available survey source options
 * @param availableRegions - Available region options
 * @param availableProviderTypes - Available provider type options
 * @param availableYears - Available year options
 */
const AnalyticsFiltersComponent: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
  availableSpecialties,
  availableSources,
  availableRegions,
  regionMapping,
  availableProviderTypes,
  availableDataCategories = [], // NEW: Data category options
  availableYears,
  // NEW: Variable selection props
  selectedVariables,
  availableVariables,
  onVariablesChange
}) => {
  
  // Handler for standard filter changes (specialty, region, etc.)
  const handleFilterChange = useCallback((field: keyof typeof filters, value: string) => {
    // For geographic region, convert formatted display value back to original value
    if (field === 'geographicRegion' && regionMapping && value) {
      const originalValue = regionMapping.get(value) || value;
      onFiltersChange({ ...filters, [field]: originalValue });
    } else {
      onFiltersChange({ ...filters, [field]: value });
    }
  }, [filters, onFiltersChange, regionMapping]);
  
  // Clear all filters
  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      specialty: '',
      surveySource: '',
      geographicRegion: '',
      providerType: '',
      dataCategory: '', // ENTERPRISE FIX: Clear dataCategory to show all categories
      year: ''
    });
  }, [onFiltersChange]);
  
  // NEW: Variable selection handler
  const handleVariableChange = useCallback((event: any, newValue: string[]) => {
    // CRITICAL DEBUG: Log variable selection changes
    console.log('🔍 AnalyticsFilters: handleVariableChange called:', {
      previousCount: selectedVariables.length,
      previousVariables: selectedVariables,
      newCount: newValue.length,
      newVariables: newValue,
      added: newValue.filter(v => !selectedVariables.includes(v)),
      removed: selectedVariables.filter(v => !newValue.includes(v))
    });
    
    // Enforce maximum 5 variables limit
    if (newValue.length > MAX_SELECTED_VARIABLES) {
      // If trying to add more than 5, keep only the first 5
      const limitedValue = newValue.slice(0, MAX_SELECTED_VARIABLES);
      console.log('🔍 AnalyticsFilters: Limited to 5 variables:', limitedValue);
      onVariablesChange(limitedValue);
      return;
    }
    
    // Validate selection (max 5 variables)
    const validation = validateVariableSelection(newValue);
    if (validation.isValid) {
      console.log('🔍 AnalyticsFilters: Validation passed, calling onVariablesChange with:', newValue);
      onVariablesChange(newValue);
    } else {
      console.warn('⚠️ AnalyticsFilters: Validation failed:', validation.error);
    }
  }, [onVariablesChange, selectedVariables]);


  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Benchmarking Filters</h3>
          {/* Clear Filters Button - In header */}
          {(filters.specialty || filters.surveySource || filters.geographicRegion || filters.providerType || filters.dataCategory || filters.year) && (
            <div className="relative group">
              <button
                onClick={clearAllFilters}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full border border-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                aria-label="Clear all filters"
              >
                <div className="relative w-4 h-4">
                  {/* Funnel Icon */}
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
                  </svg>
                  {/* X Overlay - Only show when filters are active */}
                  <svg className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  Clear Filters
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Name Input removed - now in modal when Save View is clicked */}

      {/* Cascading Filters - Responsive Layout with Natural Width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-full">
        {/* Year Filter */}
        <StandardDropdown
          value={filters.year}
          onChange={(value) => handleFilterChange('year', value)}
          options={availableYears}
          label="Year"
          placeholder="Select year..."
          variant="select"
          size="small"
        />

        {/* Survey Source Filter */}
        <StandardDropdown
          value={filters.surveySource}
          onChange={(value) => handleFilterChange('surveySource', value)}
          options={availableSources}
          label="Survey Source"
          placeholder="Select source..."
          variant="select"
          size="small"
        />

        {/* Specialty Filter */}
        <StandardDropdown
          value={filters.specialty}
          onChange={(value) => handleFilterChange('specialty', value)}
          options={availableSpecialties}
          label="Specialty"
          placeholder="Search specialties..."
          getOptionLabel={formatSpecialtyForDisplay}
          variant="autocomplete"
          useAdvancedSearch={true}
          size="small"
        />

        {/* Geographic Region Filter */}
        <StandardDropdown
          value={regionMapping && filters.geographicRegion ? 
            Array.from(regionMapping.entries()).find(([_, original]) => original === filters.geographicRegion)?.[0] || filters.geographicRegion
            : filters.geographicRegion}
          onChange={(value) => handleFilterChange('geographicRegion', value)}
          options={availableRegions}
          label="Geographic Region"
          placeholder="Search regions..."
          variant="autocomplete"
          size="small"
        />

        {/* Provider Type Filter */}
        <StandardDropdown
          value={filters.providerType}
          onChange={(value) => handleFilterChange('providerType', value)}
          options={['All Types', ...(availableProviderTypes || [])]}
          label="Provider Type"
          placeholder="Select type..."
          variant="select"
          size="small"
        />
      </div>

      {/* Second Row: Data Category Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-full mt-4">
        {/* Data Category Filter (NEW) */}
        {availableDataCategories && availableDataCategories.length > 0 && (
          <StandardDropdown
            value={filters.dataCategory || ''}
            onChange={(value) => {
              // ENTERPRISE FIX: StandardDropdown already normalizes "All Categories" to empty string
              // Just pass the value through - empty string means "show all"
              handleFilterChange('dataCategory', value || '');
            }}
            options={['All Categories', ...(availableDataCategories || [])]}
            label="Data Category"
            placeholder="Select category..."
            variant="select"
            size="small"
          />
        )}
      </div>

      {/* NEW ROW: Variable Selection (Multi-select) */}
      <div className="border-t border-gray-200 pt-4">
        <FormControl fullWidth size="small">
          <Autocomplete
            multiple
            value={selectedVariables}
            onChange={handleVariableChange}
            options={availableVariables}
            getOptionLabel={(option: string) => formatVariableDisplayName(option)}
            renderInput={(params: any) => (
              <TextField
                {...params}
                label="Display Variables (Select 1-5)"
                placeholder="Choose variables to display..."
                size="small"
                helperText={`${selectedVariables.length}/${MAX_SELECTED_VARIABLES} selected`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    minHeight: '60px', // Increased height to accommodate multiple rows
                    border: '1px solid #d1d5db !important',
                    '&:hover': { 
                      borderColor: '#9ca3af !important',
                      borderWidth: '1px !important'
                    },
                    '&.Mui-focused': { 
                      boxShadow: 'none', 
                      borderColor: '#3b82f6 !important',
                      borderWidth: '1px !important'
                    },
                    '& fieldset': {
                      border: 'none !important'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    '&.Mui-focused': {
                      color: '#3b82f6',
                    },
                    '&.MuiInputLabel-shrink': {
                      transform: 'translate(14px, -9px) scale(0.75)',
                      backgroundColor: 'white',
                      padding: '0 6px',
                      zIndex: 1,
                    }
                  }
                }}
              />
            )}
            renderTags={(value: string[], getTagProps: any) =>
              value.map((option: string, index: number) => (
                <Chip
                  key={option}
                  label={formatVariableDisplayName(option)}
                  {...getTagProps({ index })}
                  size="small"
                  sx={{
                    backgroundColor: getVariableColor(option, index),
                    color: 'white',
                    fontWeight: 500,
                    maxWidth: '200px', // Limit chip width
                    margin: '2px', // Add margin between chips
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      padding: '0 8px'
                    },
                    '& .MuiChip-deleteIcon': {
                      color: 'white',
                      fontSize: '16px'
                    }
                  }}
                />
              ))
            }
            limitTags={-1}
            disableCloseOnSelect
            noOptionsText="No variables found"
            loadingText="Loading variables..."
            sx={{
              '& .MuiAutocomplete-inputRoot': {
                padding: '4px 8px',
                minHeight: '60px',
                flexWrap: 'wrap',
                alignItems: 'flex-start', // Align chips to top
                paddingTop: '8px' // Add top padding for better spacing
              }
            }}
          />
        </FormControl>
      </div>

    </div>
  );
};

// Export memoized version
export const AnalyticsFilters = memo(AnalyticsFiltersComponent);
AnalyticsFilters.displayName = 'AnalyticsFilters';