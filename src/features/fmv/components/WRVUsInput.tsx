import React from 'react';
import { 
  TextField, 
  InputAdornment 
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
  fte,
  onFTEChange
}) => {
  const normalized = applyFTEAdjustment(Number(value), fte);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="w-48">
          <TextField
            label="Annual wRVUs"
            type="number"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            fullWidth
            size="small"
            InputProps={{ 
              endAdornment: <InputAdornment position="end">wRVUs</InputAdornment> 
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
        <div className="w-24">
          <TextField
            label="FTE"
            type="number"
            value={fte}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              onFTEChange(Number(e.target.value))
            }
            fullWidth
            size="small"
            inputProps={{ 
              min: 0.1, 
              max: 2.0, 
              step: 0.1 
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
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm">
          <div className="font-medium text-blue-900 mb-1">
            FTE-adjusted: {normalized.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })} wRVUs
          </div>
          <div className="text-blue-700">
            Your value will be annualized to 1.0 FTE for market comparison.
          </div>
        </div>
      </div>
    </div>
  );
};
