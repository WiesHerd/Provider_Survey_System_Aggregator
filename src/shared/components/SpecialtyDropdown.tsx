/**
 * Specialty Dropdown Component
 * 
 * Enhanced dropdown component for specialty selection with mapping transparency indicators.
 * This component extends StandardDropdown with visual indicators showing which specialties
 * are mapped and which surveys contribute to each mapped specialty.
 * 
 * CRITICAL: This component maintains 100% backward compatibility - it still passes
 * the same string value (specialty name) to onChange, unchanged from before.
 */

import React, { memo, useMemo, useState } from 'react';
import {
  FormControl,
  Autocomplete,
  TextField,
  Drawer,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListSubheader
} from '@mui/material';
import { LinkIcon } from '@heroicons/react/24/outline';
import { SpecialtyOption } from '../types/specialtyOptions';
import { filterSpecialtyOptions } from '../utils/specialtyMatching';

export interface SpecialtyDropdownProps {
  /** Current selected value (specialty name string) */
  value: string;
  /** Callback when value changes - receives specialty name string (unchanged) */
  onChange: (value: string) => void;
  /** Enriched specialty options with mapping metadata */
  specialtyOptions: SpecialtyOption[];
  /** Label for the dropdown */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Whether the dropdown is loading */
  loading?: boolean;
  /** Error message to display (user-friendly, non-technical) */
  error?: string | null;
  /** Whether to use advanced search (flexible word matching) */
  useAdvancedSearch?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size of the dropdown */
  size?: 'small' | 'medium';
}

/**
 * Specialty Dropdown component with mapping transparency indicators
 * 
 * @param value - Current selected specialty name
 * @param onChange - Callback when specialty changes (receives specialty name string)
 * @param specialtyOptions - Enriched specialty options with mapping metadata
 * @param label - Label for the dropdown
 * @param placeholder - Placeholder text
 * @param disabled - Whether the dropdown is disabled
 * @param loading - Whether the dropdown is loading
 * @param useAdvancedSearch - Whether to use advanced search
 * @param className - Additional CSS classes
 * @param size - Size of the dropdown
 */
export const SpecialtyDropdown: React.FC<SpecialtyDropdownProps> = memo(({
  value,
  onChange,
  specialtyOptions,
  label,
  placeholder,
  disabled = false,
  loading = false,
  error = null,
  useAdvancedSearch = false,
  className = '',
  size = 'small'
}) => {
  // Group options into mapped and unmapped
  const groupedOptions = useMemo(() => {
    const mapped: SpecialtyOption[] = [];
    const unmapped: SpecialtyOption[] = [];

    specialtyOptions.forEach(option => {
      if (option.isMapped) {
        mapped.push(option);
      } else {
        unmapped.push(option);
      }
    });

    // Sort each group alphabetically
    mapped.sort((a, b) => a.name.localeCompare(b.name));
    unmapped.sort((a, b) => a.name.localeCompare(b.name));

    return { mapped, unmapped };
  }, [specialtyOptions]);

  // Create flat list of all options (for groupBy to work)
  const allOptions = useMemo(() => {
    return [...groupedOptions.mapped, ...groupedOptions.unmapped];
  }, [groupedOptions]);

  // Group function for Autocomplete
  const groupBy = useMemo(() => {
    return (option: SpecialtyOption) => {
      return option.isMapped ? 'Mapped' : 'Unmapped';
    };
  }, []);

  // Get the selected option object
  const selectedOption = useMemo(() => {
    return specialtyOptions.find(opt => opt.name === value) || null;
  }, [specialtyOptions, value]);

  // State for drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMappingOption, setSelectedMappingOption] = useState<SpecialtyOption | null>(null);

  // Handle icon click to show drawer
  const handleIconClick = (e: React.MouseEvent<HTMLElement>, option: SpecialtyOption) => {
    e.stopPropagation(); // Prevent option selection
    setSelectedMappingOption(option);
    setDrawerOpen(true);
  };

  // Close drawer
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedMappingOption(null);
  };

  // Render group header with purple theme color
  const renderGroup = (params: any) => (
    <li key={params.key} style={{ margin: 0, padding: 0, backgroundColor: 'white' }}>
      <ListSubheader
        component="div"
        sx={{
          backgroundColor: '#f9fafb !important',
          fontWeight: 600,
          color: '#7C3AED', // Purple theme color matching Regional Analytics
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

  // Render option with indicators
  // NOTE: We show the parent/standardized name in the dropdown (e.g., "family medicine (general)")
  // The drawer shows all the individual survey specialties that map to this parent name
  const renderOption = (props: any, option: SpecialtyOption) => {
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
          {option.name}
        </Typography>
        {option.isMapped && option.sourceSpecialties.length > 0 && (
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
            onClick={(e: React.MouseEvent<HTMLElement>) => handleIconClick(e, option)}
          >
            <LinkIcon className="w-4 h-4" />
          </Box>
        )}
      </Box>
    );
  };

  // Get option label (for display in input field)
  const getOptionLabel = (option: SpecialtyOption): string => {
    return option.name;
  };

  // Filter options
  const filterOptions = (options: SpecialtyOption[], { inputValue }: { inputValue: string }) => {
    if (!inputValue) {
      return options;
    }

    return options.filter(opt => {
      return useAdvancedSearch
        ? filterSpecialtyOptions([opt.name], inputValue, 100).length > 0
        : opt.name.toLowerCase().includes(inputValue.toLowerCase());
    });
  };

  // Handle value change - CRITICAL: Still pass string (specialty name) to onChange
  const handleChange = (event: any, newValue: SpecialtyOption | null) => {
    // Close drawer when selecting an option
    handleCloseDrawer();
    
    if (!newValue) {
      onChange(''); // Cleared
      return;
    }
    // Pass the specialty name string (unchanged from before)
    onChange(newValue.name);
  };

  return (
    <>
      <FormControl fullWidth size={size} className={className}>
        <Autocomplete
          value={selectedOption}
          onChange={handleChange}
          options={allOptions}
          getOptionLabel={getOptionLabel}
          renderOption={renderOption}
          renderGroup={renderGroup}
          groupBy={groupBy}
          loading={loading}
          disabled={disabled || loading} // ENTERPRISE: Disable input while loading to prevent empty dropdown
          filterOptions={filterOptions}
          isOptionEqualToValue={(option: SpecialtyOption, value: SpecialtyOption) => {
            return option.name === value.name;
          }}
          componentsProps={{
            popper: {
              sx: {
                zIndex: 1300,
                '& .MuiAutocomplete-paper': {
                  marginTop: '4px !important',
                  backgroundColor: 'white !important',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden',
                  padding: 0
                }
              }
            }
          }}
          sx={{
            '& .MuiAutocomplete-paper': {
              backgroundColor: 'white !important',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
              marginTop: '4px',
              padding: 0
            },
            '& .MuiAutocomplete-listbox': {
              padding: '0 !important',
              margin: 0,
              backgroundColor: 'white !important',
              '& ul': {
                padding: 0,
                margin: 0,
                backgroundColor: 'white'
              },
              '& .MuiListSubheader-root': {
                backgroundColor: '#f9fafb !important',
                position: 'relative',
                margin: 0,
                padding: '8px 16px'
              },
              '& .MuiAutocomplete-option': {
                padding: '8px 16px',
                margin: 0,
                backgroundColor: 'white !important',
                '&:hover': {
                  backgroundColor: '#f3f4f6 !important'
                },
                '&:first-of-type': {
                  marginTop: 0
                }
              }
            }
          }}
          renderInput={(params: any) => (
            <TextField
              {...params}
              label={label}
              placeholder={placeholder || `Search ${label.toLowerCase()}...`}
              size={size}
              error={!!error}
              helperText={error || (allOptions.length === 0 && !loading ? 'No specialties available' : undefined)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  height: size === 'small' ? '40px' : '56px',
                  border: error ? '1px solid #ef4444 !important' : '1px solid #d1d5db !important',
                  '&:hover': { 
                    borderColor: error ? '#dc2626 !important' : '#9ca3af !important',
                    borderWidth: '1px !important'
                  },
                  '&.Mui-focused': { 
                    boxShadow: 'none', 
                    borderColor: error ? '#dc2626 !important' : '#3b82f6 !important',
                    borderWidth: '1px !important'
                  },
                  '& fieldset': {
                    border: 'none !important'
                  }
                },
                '& .MuiInputLabel-root': {
                  '&.Mui-focused': {
                    color: error ? '#dc2626' : '#3b82f6',
                  },
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(14px, -9px) scale(0.75)',
                    backgroundColor: 'white',
                    padding: '0 6px',
                    zIndex: 1,
                  }
                },
                '& .MuiFormHelperText-root': {
                  marginTop: '4px',
                  fontSize: '0.75rem',
                  color: error ? '#dc2626' : '#6b7280'
                }
              }}
            />
          )}
          clearOnBlur={false}
          blurOnSelect={true}
          noOptionsText={error ? undefined : (allOptions.length === 0 && !loading ? 'No specialties available' : 'No specialties found')}
          loadingText="Loading specialties..."
        />
      </FormControl>

      {/* Mapping Details Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
        <div style={{ width: 380 }} className="p-4">
          {selectedMappingOption && (
            <>
              <Typography 
                variant="h6" 
                className="mb-1" 
                sx={{ fontWeight: 700, color: '#7C3AED' }}
              >
                {selectedMappingOption.name}
              </Typography>
              <Typography variant="body2" className="text-gray-600 mb-4">
                Specialty mapping details
              </Typography>
              <Divider />
              <div className="mt-4">
                {selectedMappingOption.sourceSpecialties.length > 0 ? (
                  <>
                    <Typography variant="subtitle2" className="mb-3" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      Mapped to:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {(() => {
                        // Group by survey source
                        const groupedBySource: Record<string, SpecialtyOption['sourceSpecialties']> = {};
                        selectedMappingOption.sourceSpecialties.forEach(source => {
                          if (!groupedBySource[source.surveySource]) {
                            groupedBySource[source.surveySource] = [];
                          }
                          groupedBySource[source.surveySource].push(source);
                        });

                        return Object.entries(groupedBySource).map(([surveySource, specialties], index, array) => (
                          <Box key={surveySource}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600, 
                                color: '#7C3AED', 
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'block',
                                mb: 0.5
                              }}
                            >
                              {surveySource}
                            </Typography>
                            {specialties.map((source, idx) => (
                              <Typography 
                                key={`${surveySource}-${idx}`}
                                variant="body2" 
                                sx={{ 
                                  color: '#6b7280', 
                                  fontSize: '0.875rem',
                                  pl: 1.5,
                                  lineHeight: 1.6,
                                  mb: idx < specialties.length - 1 ? 0.5 : 0
                                }}
                              >
                                {source.specialty}
                              </Typography>
                            ))}
                            {index < array.length - 1 && (
                              <Divider sx={{ mt: 1.5, mb: 0 }} />
                            )}
                          </Box>
                        ));
                      })()}
                    </Box>
                  </>
                ) : (
                  <Typography variant="body2" className="text-gray-600">
                    No mapping details available.
                  </Typography>
                )}
              </div>
            </>
          )}
        </div>
      </Drawer>
    </>
  );
});

SpecialtyDropdown.displayName = 'SpecialtyDropdown';

