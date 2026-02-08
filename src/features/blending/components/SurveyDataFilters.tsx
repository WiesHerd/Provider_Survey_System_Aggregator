/**
 * Survey Data Filters Component
 *
 * Compact multi-select filters (limitTags) so the row stays on one plane.
 * All five filters use the same pattern: Autocomplete multiple with max 2 chips visible, then "+N more".
 */

import React, { memo } from 'react';
import { FormControl, TextField, Autocomplete, Box, Chip, Typography } from '@mui/material';
import type { AutocompleteRenderInputParams } from '@mui/material/Autocomplete';
import { formatRegionForDisplay, formatSpecialtyForDisplay, capitalizeWords } from '../../../shared/utils/formatters';
import { ClearFilterButton } from '../../../shared/components';

const LIMIT_TAGS = 2;
const CHIP_COLORS = {
  specialty: '#6366f1',
  survey: '#dc2626',
  year: '#6366f1',
  region: '#059669',
  providerType: '#F59E0B'
} as const;

interface SurveyDataFiltersProps {
  selectedSurveys: string[];
  selectedYears: string[];
  selectedRegions: string[];
  selectedProviderTypes: string[];
  selectedSpecialties: string[];
  onSurveyChange: (value: string[]) => void;
  onYearChange: (value: string[]) => void;
  onRegionChange: (value: string[]) => void;
  onProviderTypeChange: (value: string[]) => void;
  onSelectedSpecialtiesChange: (value: string[]) => void;
  onClearFilters?: () => void;
  filterOptions: {
    surveys: string[];
    years: string[];
    regions: string[];
    providerTypes: string[];
    specialties: string[];
  };
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'white',
    borderRadius: '8px',
    minHeight: '40px',
    alignItems: 'flex-start',
    paddingTop: '8px',
    '& .MuiAutocomplete-tag': {
      margin: '2px 4px 2px 0'
    },
    '& fieldset': { borderColor: '#d1d5db' },
    '&:hover fieldset': { borderColor: '#9ca3af' },
    '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '1px' }
  }
};

const optionSx = {
  '& .MuiAutocomplete-option': {
    padding: '8px 12px',
    fontSize: '0.875rem',
    '&:hover': { backgroundColor: '#f3f4f6' },
    '&.Mui-selected': { backgroundColor: '#ede9fe', color: '#5b21b6' }
  }
};

const SurveyDataFiltersInner: React.FC<SurveyDataFiltersProps> = ({
  selectedSurveys,
  selectedYears,
  selectedRegions,
  selectedProviderTypes,
  selectedSpecialties,
  onSurveyChange,
  onYearChange,
  onRegionChange,
  onProviderTypeChange,
  onSelectedSpecialtiesChange,
  onClearFilters,
  filterOptions
}) => {
  const hasActiveFilters =
    selectedSurveys.length > 0 ||
    selectedYears.length > 0 ||
    selectedRegions.length > 0 ||
    selectedProviderTypes.length > 0 ||
    selectedSpecialties.length > 0;

  const renderMultiSelect = (
    label: string,
    count: number,
    value: string[],
    options: string[],
    onChange: (value: string[]) => void,
    chipColor: string,
    getOptionLabel: (option: string) => string,
    placeholder: string,
    noOptionsText: string
  ) => (
    <FormControl size="small" sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="body2" className="mb-2 text-gray-700 font-medium" sx={{ minHeight: '20px', display: 'flex', alignItems: 'center' }}>
        {label} ({count} available)
      </Typography>
      <Autocomplete<string, true>
        multiple
        value={value}
        onChange={(_event: React.SyntheticEvent, newValue: string[]) => {
          const names = newValue.filter((name: string): name is string => Boolean(name && typeof name === 'string'));
          onChange(names);
        }}
        options={options}
        getOptionLabel={getOptionLabel}
        disableCloseOnSelect
        limitTags={LIMIT_TAGS}
        filterOptions={(opts: string[], { inputValue }: { inputValue: string }) => {
          const search = inputValue.toLowerCase().trim();
          if (!search) return opts;
          return opts.filter((opt: string) => getOptionLabel(opt).toLowerCase().includes(search));
        }}
        renderInput={(params: AutocompleteRenderInputParams) => (
          <TextField
            {...params}
            placeholder={value.length > 0 ? '' : placeholder}
            size="small"
            sx={inputSx}
          />
        )}
        renderTags={(value: string[], getTagProps: (params: { index: number }) => Record<string, unknown>) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {value.map((option: string, index: number) => (
              <Chip
                {...getTagProps({ index })}
                key={`${option}-${index}`}
                label={getOptionLabel(option)}
                size="small"
                sx={{
                  backgroundColor: chipColor,
                  color: 'white',
                  minWidth: 100,
                  maxWidth: '100%',
                  '& .MuiChip-label': {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  },
                  '& .MuiChip-deleteIcon': { color: 'rgba(255, 255, 255, 0.8)', '&:hover': { color: 'white' } }
                }}
              />
            ))}
          </Box>
        )}
        noOptionsText={noOptionsText}
        ListboxProps={{ style: { maxHeight: '280px', overflow: 'auto' } }}
        sx={optionSx}
      />
    </FormControl>
  );

  // Only show filters that have at least one option (contextual/cascading: only available data)
  const specialtiesOptions = filterOptions.specialties ?? [];
  const surveysOptions = filterOptions.surveys ?? [];
  const yearsOptions = filterOptions.years ?? [];
  const regionsOptions = filterOptions.regions ?? [];
  const providerTypesOptions = filterOptions.providerTypes ?? [];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Filters</h3>
        {hasActiveFilters && onClearFilters && (
          <ClearFilterButton onClick={onClearFilters} hasActiveFilters={hasActiveFilters} />
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">Select by Survey, Year, Region, Provider Type, and Specialty</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {specialtiesOptions.length > 0 &&
          renderMultiSelect(
            'Specialties',
            specialtiesOptions.length,
            selectedSpecialties,
            specialtiesOptions,
            onSelectedSpecialtiesChange,
            CHIP_COLORS.specialty,
            (opt) => formatSpecialtyForDisplay(opt),
            'Search and select specialties...',
            'No specialties found'
          )}
        {surveysOptions.length > 0 &&
          renderMultiSelect(
            'Survey Source',
            surveysOptions.length,
            selectedSurveys,
            surveysOptions,
            onSurveyChange,
            CHIP_COLORS.survey,
            (opt) => opt,
            'Select surveys...',
            'No surveys found'
          )}
        {yearsOptions.length > 0 &&
          renderMultiSelect(
            'Year',
            yearsOptions.length,
            selectedYears,
            yearsOptions,
            onYearChange,
            CHIP_COLORS.year,
            (opt) => opt,
            'Select years...',
            'No years found'
          )}
        {regionsOptions.length > 0 &&
          renderMultiSelect(
            'Region',
            regionsOptions.length,
            selectedRegions,
            regionsOptions,
            onRegionChange,
            CHIP_COLORS.region,
            (opt) => formatRegionForDisplay(opt),
            'Select regions...',
            'No regions found'
          )}
        {providerTypesOptions.length > 0 &&
          renderMultiSelect(
            'Provider Type',
            providerTypesOptions.length,
            selectedProviderTypes,
            providerTypesOptions,
            onProviderTypeChange,
            CHIP_COLORS.providerType,
            (opt) => (opt === 'Staff Physician' ? 'Physician' : capitalizeWords(opt)),
            'Select provider types...',
            'No provider types found'
          )}
      </div>
    </div>
  );
};

export const SurveyDataFilters = memo(SurveyDataFiltersInner);
