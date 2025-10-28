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
      year: ''
    });
  }, [onFiltersChange]);
  
  // NEW: Variable selection handler
  const handleVariableChange = useCallback((event: any, newValue: string[]) => {
    // Enforce maximum 5 variables limit
    if (newValue.length > MAX_SELECTED_VARIABLES) {
      // If trying to add more than 5, keep only the first 5
      const limitedValue = newValue.slice(0, MAX_SELECTED_VARIABLES);
      onVariablesChange(limitedValue);
      return;
    }
    
    // Validate selection (max 5 variables)
    const validation = validateVariableSelection(newValue);
    if (validation.isValid) {
      onVariablesChange(newValue);
    }
  }, [onVariablesChange]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Benchmarking Filters</h3>
        </div>
        
        {/* Clear Filters Button */}
        {(filters.specialty || filters.surveySource || filters.geographicRegion || filters.providerType || filters.year) && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
            title="Clear all filters"
          >
            <div className="relative w-4 h-4 mr-2">
              {/* Funnel Icon */}
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
              </svg>
              {/* X Overlay - Only show when filters are active */}
              <svg className="absolute -top-1 -right-1 w-3 h-3 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs">Clear Filters</span>
          </button>
        )}
      </div>

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
          options={availableProviderTypes}
          label="Provider Type"
          placeholder="Select type..."
          variant="select"
          size="small"
        />
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