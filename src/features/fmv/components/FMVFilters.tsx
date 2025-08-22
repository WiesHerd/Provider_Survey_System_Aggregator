import React from 'react';
import { 
  Grid, 
  TextField, 
  MenuItem, 
  InputAdornment,
  Autocomplete,
  FormControl
} from '@mui/material';
import { FMVFiltersProps } from '../types/fmv';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';

/**
 * FMV Filters component for filtering market data
 * 
 * @param filters - Current filter values
 * @param onFiltersChange - Callback when filters change
 * @param uniqueValues - Available unique values for each filter
 */
export const FMVFilters: React.FC<FMVFiltersProps> = ({ 
  filters, 
  onFiltersChange, 
  uniqueValues 
}) => {
  console.log('FMV Debug - FMVFilters render - filters:', filters);
  console.log('FMV Debug - FMVFilters render - uniqueValues:', uniqueValues);
  const handleFilterChange = (field: keyof typeof filters, value: string | number) => {
    console.log('FMV Debug - Filter change:', field, value);
    console.log('FMV Debug - Current filters:', filters);
    onFiltersChange({ ...filters, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* All filters in one row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div>
          <FormControl fullWidth>
            <Autocomplete
              value={filters.specialty}
              onChange={(event: any, newValue: string | null) => {
                console.log('FMV Debug - Specialty dropdown change:', newValue);
                handleFilterChange('specialty', newValue || '');
              }}
              options={['', ...uniqueValues.specialties]}
              getOptionLabel={(option: string) => option === '' ? 'All Specialties' : formatSpecialtyForDisplay(option)}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Specialty"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#3b82f6',
                    },
                  }}
                />
              )}
              sx={{
                '& .MuiAutocomplete-paper': {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  maxHeight: '300px'
                },
                '& .MuiAutocomplete-option': {
                  '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                  '&.Mui-selected': { 
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                  }
                }
              }}
              noOptionsText="No specialties found"
              clearOnBlur={false}
              blurOnSelect={true}
            />
          </FormControl>
        </div>

        <div>
          <TextField
            select
            label="Provider Type"
            value={filters.providerType}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleFilterChange('providerType', e.target.value)
            }
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#3b82f6',
              },
            }}
          >
            <MenuItem value="">All Types</MenuItem>
            {uniqueValues.providerTypes.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </div>

        <div>
          <TextField
            select
            label="Region"
            value={filters.region}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleFilterChange('region', e.target.value)
            }
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#3b82f6',
              },
            }}
          >
            <MenuItem value="">All Regions</MenuItem>
            {uniqueValues.regions.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </div>

        <div>
          <TextField
            select
            label="Survey Source"
            value={filters.surveySource}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleFilterChange('surveySource', e.target.value)
            }
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#3b82f6',
              },
            }}
          >
            <MenuItem value="">All Sources</MenuItem>
            {uniqueValues.surveySources.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </div>

        <div>
          <TextField
            select
            label="Year"
            value={filters.year}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleFilterChange('year', e.target.value)
            }
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#3b82f6',
              },
            }}
          >
            <MenuItem value="">All Years</MenuItem>
            {uniqueValues.years.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </div>
      </div>
    </div>
  );
};
