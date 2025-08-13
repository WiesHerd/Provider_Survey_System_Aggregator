import React from 'react';
import { 
  Paper, 
  FormControl, 
  Typography, 
  TextField, 
  InputAdornment, 
  FormHelperText 
} from '@mui/material';
import { CFInputProps } from '../types/fmv';

/**
 * Conversion Factor Input component for entering conversion factor values
 * 
 * @param value - Current conversion factor value
 * @param onChange - Callback when value changes
 * @param fte - FTE value (not used for CF but kept for consistency)
 * @param percentile - Optional percentile value for display
 */
export const CFInput: React.FC<CFInputProps> = ({ 
  value, 
  onChange, 
  fte, 
  percentile 
}) => {
  return (
    <Paper sx={{ 
      p: 2, 
      mb: 2, 
      border: '1.5px solid #b0b4bb', 
      boxShadow: 'none' 
    }}>
      <FormControl fullWidth>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Conversion Factor ($/wRVU)
        </Typography>
        <TextField
          label="Conversion Factor"
          type="number"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          size="small"
          InputProps={{ 
            startAdornment: <InputAdornment position="start">$</InputAdornment>, 
            endAdornment: <InputAdornment position="end">/wRVU</InputAdornment> 
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
          Enter your conversion factor, or calculate as TCC / wRVUs.
          <br />
          <span style={{ color: '#888' }}>
            FTE does not affect this value.
          </span>
        </FormHelperText>
      </FormControl>
    </Paper>
  );
};
