import React from 'react';
import { 
  Grid, 
  TextField, 
  MenuItem, 
  InputAdornment 
} from '@mui/material';
import { FMVFiltersProps } from '../types/fmv';

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
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={4}>
        <TextField
          select
          label="Specialty"
          value={filters.specialty}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            handleFilterChange('specialty', e.target.value)
          }
          fullWidth
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            }
          }}
        >
          <MenuItem value="">All Specialties</MenuItem>
          {uniqueValues.specialties.map(option => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} md={4}>
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
            }
          }}
        >
          <MenuItem value="">All Types</MenuItem>
          {uniqueValues.providerTypes.map(option => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} md={4}>
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
            }
          }}
        >
          <MenuItem value="">All Regions</MenuItem>
          {uniqueValues.regions.map(option => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} md={4}>
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
            }
          }}
        >
          <MenuItem value="">All Sources</MenuItem>
          {uniqueValues.surveySources.map(option => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} md={4}>
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
            }
          }}
        >
          <MenuItem value="">All Years</MenuItem>
          {uniqueValues.years.map(option => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          label="FTE"
          type="number"
          value={filters.fte}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            handleFilterChange('fte', Math.max(0, Math.min(2, Number(e.target.value))))
          }
          fullWidth
          size="small"
          inputProps={{ min: 0, max: 2, step: 0.01 }}
          InputProps={{
            endAdornment: <InputAdornment position="end">FTE</InputAdornment>
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            }
          }}
        />
      </Grid>
    </Grid>
  );
};
