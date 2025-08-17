import React from 'react';
import { 
  TextField, 
  InputAdornment 
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
    <div className="space-y-4">
      <div className="w-48">
        <TextField
          label="Conversion Factor"
          type="number"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          fullWidth
          size="small"
          InputProps={{ 
            startAdornment: <InputAdornment position="start">$</InputAdornment>, 
            endAdornment: <InputAdornment position="end">/wRVU</InputAdornment> 
          }}
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
      </div>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900 mb-1">
            Conversion Factor ($/wRVU)
          </div>
          <div className="text-gray-700">
            Enter your conversion factor, or calculate as TCC / wRVUs. FTE does not affect this value.
          </div>
        </div>
      </div>
    </div>
  );
};
