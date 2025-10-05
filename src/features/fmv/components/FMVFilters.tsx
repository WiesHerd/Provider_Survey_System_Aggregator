import React from 'react';
import { 
  Grid, 
  TextField, 
  MenuItem, 
  InputAdornment,
  Autocomplete,
  FormControl,
  Box
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
  const handleFilterChange = (field: keyof typeof filters, value: string | number) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* All filters in one row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-visible">
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
            <MenuItem value="All Years">All Years</MenuItem>
            {uniqueValues.years.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </div>

        <Box>
          <Autocomplete
            value={filters.specialty}
            onChange={(_: any, newValue: string | null) => handleFilterChange('specialty', newValue || '')}
            options={uniqueValues.specialties}
            getOptionLabel={(option: string) => formatSpecialtyForDisplay(option)}
            renderInput={(params: any) => (
              <TextField
                {...params}
                label="Specialty"
                variant="outlined"
                size="small"
                placeholder="Select specialty..."
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
            clearOnEscape
            clearOnBlur
            selectOnFocus
            handleHomeEndKeys
          />
        </Box>

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
            <MenuItem value="All Types">All Types</MenuItem>
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
            <MenuItem value="All Regions">All Regions</MenuItem>
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
            <MenuItem value="All Sources">All Sources</MenuItem>
            {uniqueValues.surveySources.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </div>
      </div>
    </div>
  );
};
