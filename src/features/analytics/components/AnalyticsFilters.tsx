/**
 * Analytics Feature - Filters Component
 * 
 * This component handles all filter controls for analytics data.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo, useState } from 'react';
import { Box, Switch, FormControlLabel, Button, TextField, MenuItem, Select, FormControl, InputLabel, IconButton } from '@mui/material';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { AnalyticsFiltersProps, YearBlendItem } from '../types/analytics';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';
import { StandardDropdown } from '../../../shared/components';

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
export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = memo(({
  filters,
  onFiltersChange,
  availableSpecialties,
  availableSources,
  availableRegions,
  availableProviderTypes,
  availableYears
}) => {
  const [showMultiYear, setShowMultiYear] = useState(false);
  
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    // Simply update the specific filter that changed
    // Allow multiple filters to work together
    const newFilters = { ...filters, [field]: value };
    onFiltersChange(newFilters);
  };
  
  // Multi-year blending handlers
  const handleMultiYearToggle = (enabled: boolean) => {
    if (enabled) {
      // Initialize with two years if available
      const years = availableYears.slice(0, 2);
      const percentage = years.length > 0 ? 100 / years.length : 100;
      
      onFiltersChange({
        ...filters,
        year: '', // Clear single year selection
        useMultiYearBlending: true,
        multiYearBlending: {
          method: 'percentage',
          years: years.map(year => ({
            year,
            percentage,
            weight: 1
          })),
          totalPercentage: 100
        }
      });
    } else {
      // Disable multi-year blending
      onFiltersChange({
        ...filters,
        useMultiYearBlending: false,
        multiYearBlending: undefined
      });
    }
  };
  
  const handleBlendingMethodChange = (method: 'percentage' | 'weighted' | 'equal') => {
    if (filters.multiYearBlending) {
      onFiltersChange({
        ...filters,
        multiYearBlending: {
          ...filters.multiYearBlending,
          method
        }
      });
    }
  };
  
  const handleYearItemChange = (index: number, updates: Partial<YearBlendItem>) => {
    if (filters.multiYearBlending) {
      const newYears = [...filters.multiYearBlending.years];
      newYears[index] = { ...newYears[index], ...updates };
      
      // Recalculate total percentage
      const totalPercentage = newYears.reduce((sum, y) => sum + y.percentage, 0);
      
      onFiltersChange({
        ...filters,
        multiYearBlending: {
          ...filters.multiYearBlending,
          years: newYears,
          totalPercentage
        }
      });
    }
  };
  
  const handleAddYear = () => {
    if (filters.multiYearBlending) {
      const newYears = [
        ...filters.multiYearBlending.years,
        {
          year: availableYears[0] || '',
          percentage: 0,
          weight: 1
        }
      ];
      
      onFiltersChange({
        ...filters,
        multiYearBlending: {
          ...filters.multiYearBlending,
          years: newYears
        }
      });
    }
  };
  
  const handleRemoveYear = (index: number) => {
    if (filters.multiYearBlending && filters.multiYearBlending.years.length > 1) {
      const newYears = filters.multiYearBlending.years.filter((_, i) => i !== index);
      const totalPercentage = newYears.reduce((sum, y) => sum + y.percentage, 0);
      
      onFiltersChange({
        ...filters,
        multiYearBlending: {
          ...filters.multiYearBlending,
          years: newYears,
          totalPercentage
        }
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Analytics Filters</h3>
        </div>
        
        {/* Clear Filters Button */}
        {(filters.specialty || filters.surveySource || filters.geographicRegion || filters.providerType || filters.year || filters.useMultiYearBlending) && (
          <button
            onClick={() => {
              onFiltersChange({
                specialty: '',
                surveySource: '',
                geographicRegion: '',
                providerType: '',
                year: '',
                useMultiYearBlending: false,
                multiYearBlending: undefined
              });
            }}
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
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { 
          xs: '1fr', 
          sm: '1fr 1fr', 
          md: '1fr 1fr 1fr', 
          lg: '1fr 1fr 1fr 1fr 1fr' 
        }, 
        gap: 2, 
        width: '100%',
        maxWidth: '100%' // Use full available width but don't stretch with table
      }}>
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
          value={filters.geographicRegion}
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
      </Box>

      {/* Multi-Year Blending Section */}
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <FormControlLabel
            control={
              <Switch
                checked={filters.useMultiYearBlending || false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMultiYearToggle(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label={
              <span className="text-sm font-medium text-gray-700">
                Enable Multi-Year Blending
              </span>
            }
          />
          
          {filters.useMultiYearBlending && (
            <button
              onClick={() => setShowMultiYear(!showMultiYear)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all duration-200"
            >
              {showMultiYear ? (
                <>
                  <ChevronUpIcon className="w-4 h-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDownIcon className="w-4 h-4 mr-1" />
                  Show Details
                </>
              )}
            </button>
          )}
        </div>

        {/* Multi-Year Blending Controls */}
        {filters.useMultiYearBlending && showMultiYear && filters.multiYearBlending && (
          <div className="space-y-3 bg-gray-50 rounded-lg p-3">
            {/* Blending Method Selector */}
            <FormControl fullWidth size="small">
              <InputLabel>Blending Method</InputLabel>
              <Select
                value={filters.multiYearBlending?.method || 'percentage'}
                onChange={(e: any) => handleBlendingMethodChange(e.target.value as 'percentage' | 'weighted' | 'equal')}
                label="Blending Method"
              >
                <MenuItem value="percentage">Percentage-Based (e.g., 70% / 30%)</MenuItem>
                <MenuItem value="weighted">Weighted by Sample Size</MenuItem>
                <MenuItem value="equal">Equal Weighting</MenuItem>
              </Select>
            </FormControl>

            {/* Year Blend Items */}
            <div className="space-y-2">
              {filters.multiYearBlending?.years.map((yearItem, index) => (
                <div key={index} className="flex items-center gap-2 bg-white rounded p-2">
                  {/* Year Selector */}
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={yearItem.year}
                      onChange={(e: any) => handleYearItemChange(index, { year: e.target.value })}
                      label="Year"
                    >
                      {availableYears.map(year => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Percentage Input (only for percentage method) */}
                  {filters.multiYearBlending?.method === 'percentage' && (
                    <TextField
                      size="small"
                      type="number"
                      label="Percentage"
                      value={yearItem.percentage}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleYearItemChange(index, { 
                        percentage: parseFloat(e.target.value) || 0 
                      })}
                      InputProps={{
                        endAdornment: <span className="text-gray-500">%</span>
                      }}
                      sx={{ width: 120 }}
                    />
                  )}

                  {/* Remove Button */}
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveYear(index)}
                    disabled={(filters.multiYearBlending?.years.length || 0) <= 1}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </IconButton>
                </div>
              ))}
            </div>

            {/* Add Year Button */}
            <Button
              size="small"
              onClick={handleAddYear}
              startIcon={<PlusIcon className="w-4 h-4" />}
              variant="outlined"
              fullWidth
            >
              Add Year
            </Button>

            {/* Total Percentage Warning */}
            {filters.multiYearBlending?.method === 'percentage' && (
              <div className={`text-xs p-2 rounded ${
                Math.abs((filters.multiYearBlending?.totalPercentage || 0) - 100) < 0.1
                  ? 'bg-green-50 text-green-700'
                  : 'bg-yellow-50 text-yellow-700'
              }`}>
                Total: {(filters.multiYearBlending?.totalPercentage || 0).toFixed(1)}% 
                {Math.abs((filters.multiYearBlending?.totalPercentage || 0) - 100) >= 0.1 && 
                  ' (must equal 100%)'}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
});

AnalyticsFilters.displayName = 'AnalyticsFilters';