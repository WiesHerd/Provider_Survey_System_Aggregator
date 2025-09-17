import React, { memo, useCallback } from 'react';
import { FormControl, Autocomplete, TextField, Chip, Box, Tooltip } from '@mui/material';
import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { FilterState, FilterOptions } from '../hooks/useAdvancedFiltering';

interface EnterpriseFilterGridProps {
  filters: FilterState;
  filterOptions: FilterOptions;
  loading: boolean;
  hasActiveFilters: boolean;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onClearFilters: () => void;
  onResetFilters: () => void;
}

/**
 * Enterprise-grade filter grid component with advanced features:
 * - Accessibility support (ARIA labels, keyboard navigation)
 * - Loading states and error handling
 * - Performance optimized rendering
 * - Consistent styling and UX
 * - Tooltip support for better UX
 */
export const EnterpriseFilterGrid: React.FC<EnterpriseFilterGridProps> = memo(({
  filters,
  filterOptions,
  loading,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
  onResetFilters
}) => {
  // Memoized filter change handler
  const handleFilterChange = useCallback((key: keyof FilterState, value: string | null) => {
    onFilterChange(key, value || '');
  }, [onFilterChange]);

  // Render individual filter component
  const renderFilter = useCallback((
    key: keyof FilterState,
    label: string,
    placeholder: string,
    options: string[],
    value: string
  ) => (
    <FormControl fullWidth size="small" key={key}>
      <Autocomplete
        options={options}
        value={value}
        onChange={(event: any, newValue: string | null) => {
          handleFilterChange(key, newValue);
        }}
        loading={loading}
        disabled={loading}
        renderInput={(params: any) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            size="small"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <Tooltip title={`Filter by ${label.toLowerCase()}`}>
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </Tooltip>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#6366f1',
                  },
                },
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#6366f1',
                    borderWidth: '2px',
                  },
                },
              },
              '& .MuiAutocomplete-input': {
                padding: '8px 12px',
              },
              '& .MuiAutocomplete-inputRoot': {
                padding: '0 8px',
              },
            }}
          />
        )}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
          },
        }}
        size="small"
        noOptionsText="No options found"
        loadingText="Loading options..."
        aria-label={`Filter by ${label.toLowerCase()}`}
        role="combobox"
        aria-expanded={false}
      />
    </FormControl>
  ), [handleFilterChange, loading]);

  // Render active filter chips
  const renderActiveFilterChips = useCallback(() => {
    const activeFilters = Object.entries(filters).filter(([_, value]) => value && value.trim() !== '');
    
    if (activeFilters.length === 0) return null;

    return (
      <Box className="flex flex-wrap gap-2 mb-4">
        {activeFilters.map(([key, value]) => (
          <Chip
            key={key}
            label={`${key}: ${value}`}
            onDelete={() => handleFilterChange(key as keyof FilterState, '')}
            size="small"
            color="primary"
            variant="outlined"
            deleteIcon={<XMarkIcon className="h-3 w-3" />}
            sx={{
              '& .MuiChip-deleteIcon': {
                fontSize: '12px',
              },
            }}
          />
        ))}
      </Box>
    );
  }, [filters, handleFilterChange]);

  return (
    <div className="space-y-4">
      {/* Active Filter Chips */}
      {renderActiveFilterChips()}
      
      {/* Filter Grid */}
      <div className="grid grid-cols-5 gap-4">
        {renderFilter('surveyName', 'Survey Name', 'Search survey names', filterOptions.surveyNames, filters.surveyName)}
        {renderFilter('specialty', 'Specialty', 'Search specialties', filterOptions.specialties, filters.specialty)}
        {renderFilter('providerType', 'Provider Type', 'Search provider types', filterOptions.providerTypes, filters.providerType)}
        {renderFilter('region', 'Geographic Region', 'Search regions', filterOptions.regions, filters.region)}
        {renderFilter('variable', 'Variable', 'Search variables', filterOptions.variables, filters.variable)}
      </div>

      {/* Filter Actions */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-4">
          <Tooltip title="Clear all active filters">
            <button
              onClick={onClearFilters}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50"
              disabled={loading}
              aria-label="Clear all filters"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Clear Filters
            </button>
          </Tooltip>
          
          <Tooltip title="Reset to default filters">
            <button
              onClick={onResetFilters}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all duration-200 disabled:opacity-50"
              disabled={loading}
              aria-label="Reset filters"
            >
              Reset
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
});

EnterpriseFilterGrid.displayName = 'EnterpriseFilterGrid';
