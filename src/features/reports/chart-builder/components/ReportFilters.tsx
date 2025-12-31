/**
 * Report Filters Component
 * 
 * Filter section for specialties, regions, sources, and provider types
 */

import React, { useMemo } from 'react';
import { Autocomplete, TextField, Chip, Box, FormControl, Typography, ListSubheader } from '@mui/material';
import { ReportFiltersProps } from '../types/reportBuilder';
import { FilterSection } from './FilterSection';
import { FilterAutocomplete } from './FilterAutocomplete';
import { useSpecialtyOptions } from '../../../../shared/hooks/useSpecialtyOptions';
import { formatSpecialtyForDisplay } from '../../../../shared/utils/formatters';
import { SpecialtyOption } from '../../../../shared/types/specialtyOptions';
import { LinkIcon } from '@heroicons/react/24/outline';

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  availableOptions,
  onFilterChange,
  specialtyOptions,
  specialtyMappings,
  filterImpacts,
  totalRecords = 0,
  onClearAll
}) => {
  const { specialties: specialtyOptionsFromHook } = useSpecialtyOptions();
  const effectiveSpecialtyOptions = specialtyOptions || specialtyOptionsFromHook;

  const groupedSpecialtyOptions = useMemo(() => {
    const mapped: SpecialtyOption[] = [];
    const unmapped: SpecialtyOption[] = [];
    
    effectiveSpecialtyOptions.forEach(option => {
      if (option.isMapped) {
        mapped.push(option);
      } else {
        unmapped.push(option);
      }
    });
    
    mapped.sort((a, b) => a.name.localeCompare(b.name));
    unmapped.sort((a, b) => a.name.localeCompare(b.name));
    
    return [...mapped, ...unmapped];
  }, [effectiveSpecialtyOptions]);

  const selectedSpecialtyOptions = useMemo(() => {
    if (!Array.isArray(effectiveSpecialtyOptions) || !Array.isArray(filters.specialties)) {
      return [];
    }
    return effectiveSpecialtyOptions
      .filter((opt): opt is SpecialtyOption => {
        return opt !== null && 
               opt !== undefined && 
               typeof opt === 'object' && 
               'name' in opt && 
               typeof opt.name === 'string' && 
               opt.name.length > 0 &&
               filters.specialties.includes(opt.name);
      });
  }, [effectiveSpecialtyOptions, filters.specialties]);

  const activeFilterCount = 
    filters.specialties.length +
    filters.regions.length +
    filters.surveySources.length +
    filters.providerTypes.length +
    filters.years.length;

  // Group function for Autocomplete
  const groupBySpecialty = (option: SpecialtyOption) => {
    return option.isMapped ? 'Mapped' : 'Unmapped';
  };

  // Render group header
  const renderSpecialtyGroup = (params: any) => (
    <li key={params.key} style={{ margin: 0, padding: 0, backgroundColor: 'white' }}>
      <ListSubheader
        component="div"
        sx={{
          backgroundColor: '#f9fafb !important',
          fontWeight: 600,
          color: '#7C3AED',
          fontSize: '0.875rem',
          py: 1,
          px: 2,
          borderBottom: '1px solid #e5e7eb',
          margin: 0,
          lineHeight: 1.5,
          position: 'relative',
          zIndex: 1
        }}
      >
        {params.group}
      </ListSubheader>
      <Box sx={{ backgroundColor: 'white', margin: 0, padding: 0 }}>
        {params.children}
      </Box>
    </li>
  );

  // Render specialty option with mapping indicator
  const renderSpecialtyOption = (props: any, option: SpecialtyOption) => {
    return (
      <Box
        {...props}
        component="li"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          py: 0.5,
          backgroundColor: 'white !important',
          margin: 0,
          '&:hover': {
            backgroundColor: '#f3f4f6 !important'
          }
        }}
      >
        <Typography variant="body2" sx={{ flex: 1 }}>
          {formatSpecialtyForDisplay(option.name)}
        </Typography>
        {option.isMapped && option.sourceSpecialties && option.sourceSpecialties.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              ml: 1,
              color: '#6366f1',
              cursor: 'pointer',
              '&:hover': {
                color: '#4f46e5'
              }
            }}
          >
            <LinkIcon className="w-4 h-4" />
          </Box>
        )}
      </Box>
    );
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    } else {
      onFilterChange('specialties', []);
      onFilterChange('regions', []);
      onFilterChange('surveySources', []);
      onFilterChange('providerTypes', []);
      onFilterChange('years', []);
    }
  };

  return (
    <FilterSection 
      title="Filters" 
      filterCount={activeFilterCount}
      onClearAll={handleClearAll}
      showClearAll={activeFilterCount > 0}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FormControl size="small" sx={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2" className="mb-2 text-gray-700 font-medium" sx={{ minHeight: '20px', display: 'flex', alignItems: 'center' }}>
            Specialties ({availableOptions.specialties.length} available)
          </Typography>
          <Autocomplete<SpecialtyOption, true>
            multiple
            value={selectedSpecialtyOptions}
            onChange={(event: any, newValue: SpecialtyOption[]) => {
              const specialtyNames = newValue
                .map(opt => opt?.name)
                .filter((name): name is string => Boolean(name && typeof name === 'string'));
              onFilterChange('specialties', specialtyNames);
            }}
            options={groupedSpecialtyOptions}
            getOptionKey={(option: SpecialtyOption) => option.name}
            getOptionLabel={(option: SpecialtyOption) => {
              if (!option || !option.name || typeof option.name !== 'string') return '';
              return formatSpecialtyForDisplay(option.name);
            }}
            groupBy={groupBySpecialty}
            renderGroup={renderSpecialtyGroup}
            renderOption={renderSpecialtyOption}
            disableListWrap={false}
            disablePortal={false}
            ListboxProps={{
              style: {
                maxHeight: '300px',
                overflow: 'auto'
              }
            }}
            filterOptions={(options: SpecialtyOption[], { inputValue }: { inputValue: string }) => {
              const searchTerms = inputValue.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
              const filtered = options.filter((option: SpecialtyOption) => {
                const displayName = formatSpecialtyForDisplay(option.name).toLowerCase();
                if (searchTerms.length === 0) return true;
                return searchTerms.every(term => displayName.includes(term));
              });
              return filtered;
            }}
            freeSolo={false}
            selectOnFocus
            handleHomeEndKeys
            renderInput={(params: any) => (
              <TextField
                {...params}
                placeholder="Search and select specialties..."
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    minHeight: '40px',
                    '& fieldset': {
                      borderColor: '#d1d5db',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                      borderWidth: '1px',
                    }
                  }
                }}
              />
            )}
            renderTags={(value: any[], getTagProps: any) => {
              if (!Array.isArray(value) || value.length === 0) return null;
              
              return (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {value.map((option: any, index: number) => {
                    let specialtyName = '';
                    if (typeof option === 'string') {
                      specialtyName = option;
                    } else if (option && typeof option === 'object' && option.name) {
                      specialtyName = String(option.name);
                    } else {
                      return null;
                    }
                    
                    if (!specialtyName) return null;
                    
                    return (
                      <Chip
                        {...getTagProps({ index })}
                        key={`${specialtyName}-${index}`}
                        label={formatSpecialtyForDisplay(specialtyName)}
                        size="small"
                        sx={{ 
                          backgroundColor: '#6366f1', 
                          color: 'white',
                          '& .MuiChip-deleteIcon': {
                            color: 'rgba(255, 255, 255, 0.8)',
                            '&:hover': { color: 'white' }
                          }
                        }}
                      />
                    );
                  }).filter(Boolean)}
                </Box>
              );
            }}
            noOptionsText="No specialties found"
            disableCloseOnSelect={true}
            componentsProps={{
              popper: {
                style: {
                  maxHeight: '500px',
                  overflow: 'auto'
                }
              }
            }}
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'flip',
                    enabled: false,
                  },
                ],
                style: {
                  maxHeight: '500px',
                  zIndex: 1300,
                },
              },
            }}
            sx={{
              '& .MuiAutocomplete-paper': {
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)',
                maxHeight: '500px !important',
                overflow: 'auto !important'
              },
              '& .MuiAutocomplete-listbox': {
                maxHeight: '500px !important',
                overflow: 'auto !important',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f1f5f9',
                scrollBehavior: 'smooth',
                '&::-webkit-scrollbar': {
                  width: '12px !important',
                  display: 'block !important'
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f5f9 !important',
                  borderRadius: '4px !important',
                  display: 'block !important'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#cbd5e1 !important',
                  borderRadius: '4px !important',
                  display: 'block !important',
                  '&:hover': {
                    background: '#94a3b8 !important'
                  }
                }
              },
              '& .MuiAutocomplete-option': {
                padding: '8px 12px',
                fontSize: '0.875rem',
                '&:hover': { backgroundColor: '#f3f4f6' },
                '&.Mui-selected': { 
                  backgroundColor: '#ede9fe',
                  color: '#5b21b6'
                }
              }
            }}
            isOptionEqualToValue={(option: SpecialtyOption, value: SpecialtyOption) => {
              return option.name === value.name;
            }}
          />
        </FormControl>

        <FilterAutocomplete
          label="Regions"
          value={filters.regions}
          options={availableOptions.regions || []}
          onChange={(value) => onFilterChange('regions', value)}
          placeholder="Select regions..."
          chipColor="#059669"
          availableCount={availableOptions.regions.length}
        />

        <FilterAutocomplete
          label="Survey Sources"
          value={filters.surveySources}
          options={availableOptions.surveySources || []}
          onChange={(value) => onFilterChange('surveySources', value)}
          placeholder="Select survey sources..."
          chipColor="#dc2626"
          availableCount={availableOptions.surveySources.length}
        />

        <FilterAutocomplete
          label="Provider Types"
          value={filters.providerTypes}
          options={availableOptions.providerTypes || []}
          onChange={(value) => onFilterChange('providerTypes', value)}
          placeholder="Select provider types..."
          chipColor="#F59E0B"
          availableCount={availableOptions.providerTypes.length}
        />
      </div>
    </FilterSection>
  );
};

