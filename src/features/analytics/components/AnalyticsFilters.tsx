/**
 * Analytics Feature - Filters Component
 * 
 * This component handles all filter controls for analytics data.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo, useState } from 'react';
import { 
  Box, 
  Switch, 
  FormControlLabel, 
  TextField, 
  FormControl, 
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
  Radio,
  RadioGroup,
  FormLabel,
  Slider,
  InputAdornment,
  Typography
} from '@mui/material';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { AnalyticsFiltersProps } from '../types/analytics';
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
const AnalyticsFiltersComponent: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
  availableSpecialties,
  availableSources,
  availableRegions,
  availableProviderTypes,
  availableYears
}) => {
  const [showMultiYear, setShowMultiYear] = useState(false);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  
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
      const years = availableYears.slice(0, Math.min(2, availableYears.length));
      setSelectedYears(years);
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
      setSelectedYears([]);
      onFiltersChange({
        ...filters,
        useMultiYearBlending: false,
        multiYearBlending: undefined
      });
    }
  };
  
  const handleYearsSelectionChange = (event: any) => {
    const value = event.target.value as string[];
    setSelectedYears(value);
    
    if (value.length === 0) {
      // If no years selected, disable blending
      handleMultiYearToggle(false);
      return;
    }
    
    // Calculate equal percentages for selected years
    const percentage = 100 / value.length;
    const currentMethod = filters.multiYearBlending?.method || 'equal';
    
    onFiltersChange({
      ...filters,
      useMultiYearBlending: true,
      multiYearBlending: {
        method: currentMethod,
        years: value.map(year => ({
          year,
          percentage: currentMethod === 'percentage' ? percentage : 100 / value.length,
          weight: 1
        })),
        totalPercentage: 100
      }
    });
  };
  
  const handleBlendingMethodChange = (method: 'percentage' | 'weighted' | 'equal') => {
    if (filters.multiYearBlending) {
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
    }
  };
  
  const handlePercentageChange = (yearToUpdate: string, newPercentage: number) => {
    if (filters.multiYearBlending) {
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
    }
  };
  
  const handleSliderChange = (yearToUpdate: string, newValue: number) => {
    handlePercentageChange(yearToUpdate, newValue);
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

      {/* Multi-Year Blending Section - Professional UX */}
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
        {filters.useMultiYearBlending && showMultiYear && (
          <div className="space-y-4 bg-gray-50 rounded-lg p-4">
            {/* Multi-Select Years Dropdown */}
            <FormControl fullWidth size="small">
              <InputLabel>Select Years to Blend</InputLabel>
              <Select
                multiple
                value={selectedYears}
                onChange={handleYearsSelectionChange}
                input={<OutlinedInput label="Select Years to Blend" />}
                renderValue={(selected: unknown) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    <Checkbox checked={selectedYears.indexOf(year) > -1} />
                    <ListItemText primary={year} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Show selected years count */}
            {selectedYears.length > 0 && (
              <div className="text-xs text-gray-600">
                {selectedYears.length} {selectedYears.length === 1 ? 'year' : 'years'} selected: {selectedYears.join(', ')}
              </div>
            )}

            {/* Blending Method - Radio Buttons */}
            {selectedYears.length > 0 && (
              <FormControl component="fieldset">
                <FormLabel component="legend" className="text-sm font-medium text-gray-700">
                  Blending Method
                </FormLabel>
                <RadioGroup
                  row
                  value={filters.multiYearBlending?.method || 'equal'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleBlendingMethodChange(e.target.value as 'percentage' | 'weighted' | 'equal')}
                >
                  <FormControlLabel 
                    value="equal" 
                    control={<Radio size="small" />} 
                    label={<Typography variant="body2">Equal</Typography>}
                  />
                  <FormControlLabel 
                    value="percentage" 
                    control={<Radio size="small" />} 
                    label={<Typography variant="body2">Custom %</Typography>}
                  />
                  <FormControlLabel 
                    value="weighted" 
                    control={<Radio size="small" />} 
                    label={<Typography variant="body2">By Sample Size</Typography>}
                  />
                </RadioGroup>
              </FormControl>
            )}

            {/* Percentage Controls - Only show for selected years */}
            {filters.multiYearBlending?.method === 'percentage' && selectedYears.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Adjust Year Weights
                </div>
                
                {filters.multiYearBlending.years.map((yearItem) => (
                  <div key={yearItem.year} className="bg-white rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{yearItem.year}</span>
                      <span className="text-sm font-bold text-purple-600">{yearItem.percentage.toFixed(1)}%</span>
                    </div>
                    
                    <Slider
                      value={yearItem.percentage}
                      onChange={(_: Event, value: number | number[]) => handleSliderChange(yearItem.year, value as number)}
                      min={0}
                      max={100}
                      step={1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value: number) => `${value}%`}
                      sx={{
                        '& .MuiSlider-thumb': {
                          backgroundColor: '#9333ea',
                        },
                        '& .MuiSlider-track': {
                          backgroundColor: '#9333ea',
                        },
                        '& .MuiSlider-rail': {
                          backgroundColor: '#e5e7eb',
                        },
                      }}
                    />
                    
                    <TextField
                      size="small"
                      type="number"
                      value={yearItem.percentage}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePercentageChange(yearItem.year, parseFloat(e.target.value) || 0)}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>
                      }}
                      sx={{ width: '100px' }}
                    />
                  </div>
                ))}

                {/* Total Percentage Indicator */}
                <div className={`text-sm p-3 rounded font-medium ${
                  Math.abs((filters.multiYearBlending?.totalPercentage || 0) - 100) < 0.1
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span>Total:</span>
                    <span className="font-bold">{(filters.multiYearBlending?.totalPercentage || 0).toFixed(1)}%</span>
                  </div>
                  {Math.abs((filters.multiYearBlending?.totalPercentage || 0) - 100) >= 0.1 && (
                    <div className="text-xs mt-1">Must equal 100%</div>
                  )}
                </div>
              </div>
            )}

            {/* Info for other methods */}
            {filters.multiYearBlending?.method === 'equal' && selectedYears.length > 0 && (
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                <strong>Equal Weighting:</strong> Each year weighted equally ({(100 / selectedYears.length).toFixed(1)}% each)
              </div>
            )}

            {filters.multiYearBlending?.method === 'weighted' && selectedYears.length > 0 && (
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                <strong>Weighted by Sample Size:</strong> Years with more data automatically get more weight
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

// Export memoized version
export const AnalyticsFilters = memo(AnalyticsFiltersComponent);
AnalyticsFilters.displayName = 'AnalyticsFilters';