import React from 'react';
import { 
  Paper, 
  FormControl, 
  Typography, 
  TextField, 
  InputAdornment, 
  FormHelperText 
} from '@mui/material';
import { WRVUsInputProps } from '../types/fmv';
import { applyFTEAdjustment } from '../utils/fmvCalculations';

/**
 * WRVUs Input component for entering work RVU values
 * 
 * @param value - Current wRVU value
 * @param onChange - Callback when value changes
 * @param fte - FTE value for adjustment calculation
 */
export const WRVUsInput: React.FC<WRVUsInputProps> = ({ 
  value, 
  onChange, 
  fte 
}) => {
  const normalized = applyFTEAdjustment(Number(value), fte);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <FormControl fullWidth>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Work RVUs
        </Typography>
        <TextField
          label="Annual wRVUs"
          type="number"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          size="small"
          InputProps={{ 
            endAdornment: <InputAdornment position="end">wRVUs</InputAdornment> 
          }}
          sx={{ 
            mb: 1, 
            width: 220,
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            }
          }}
        />
        <FormHelperText>
          <span style={{ fontWeight: 500, color: '#333' }}>
            FTE-adjusted: {normalized.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })} wRVUs
          </span>
          <br />
          <span style={{ color: '#888' }}>
            Your value will be annualized to 1.0 FTE for market comparison.
          </span>
        </FormHelperText>
      </FormControl>
    </Paper>
  );
};
