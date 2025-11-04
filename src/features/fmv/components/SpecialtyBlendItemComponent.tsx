/**
 * Specialty Blend Item Component
 * 
 * Individual specialty item in a blended calculation with percentage/weight inputs.
 */

import React from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  IconButton,
  InputAdornment
} from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { SpecialtyBlendItemProps } from '../types/fmv';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';

/**
 * Individual specialty blend item component
 * 
 * Allows users to select a specialty and set its percentage/weight
 * in a blended FMV calculation.
 */
export const SpecialtyBlendItemComponent: React.FC<SpecialtyBlendItemProps> = ({
  item,
  availableSpecialties,
  onItemChange,
  onRemove,
  canRemove
}) => {
  // Handle specialty selection
  const handleSpecialtyChange = (_: any, newSpecialty: string | null) => {
    onItemChange({
      ...item,
      specialty: newSpecialty || ''
    });
  };

  // Handle percentage change
  const handlePercentageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(event.target.value) || 0;
    onItemChange({
      ...item,
      percentage: Math.max(0, Math.min(100, percentage)) // Clamp between 0-100
    });
  };

  // Handle weight change
  const handleWeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const weight = parseFloat(event.target.value) || 1;
    onItemChange({
      ...item,
      weight: Math.max(0.1, weight) // Minimum weight of 0.1
    });
  };

  // Handle sample size change
  const handleSampleSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sampleSize = parseInt(event.target.value) || 0;
    onItemChange({
      ...item,
      sampleSize: Math.max(0, sampleSize)
    });
  };

  return (
    <Box className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* Specialty Selection */}
      <div className="flex-1 min-w-0">
        <Autocomplete
          value={item.specialty}
          onChange={(_: any, newValue: string | null) => handleSpecialtyChange(_, newValue)}
          options={availableSpecialties}
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
      </div>

      {/* Percentage Input */}
      <div className="w-24">
        <TextField
          label="%"
          type="number"
          value={item.percentage}
          onChange={handlePercentageChange}
          size="small"
          inputProps={{
            min: 0,
            max: 100,
            step: 0.1
          }}
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            },
          }}
        />
      </div>

      {/* Weight Input (for weighted blending) */}
      <div className="w-20">
        <TextField
          label="Weight"
          type="number"
          value={item.weight}
          onChange={handleWeightChange}
          size="small"
          inputProps={{
            min: 0.1,
            step: 0.1
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            },
          }}
        />
      </div>

      {/* Sample Size Input (optional) */}
      <div className="w-20">
        <TextField
          label="N"
          type="number"
          value={item.sampleSize || ''}
          onChange={handleSampleSizeChange}
          size="small"
          placeholder="0"
          inputProps={{
            min: 0
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            },
          }}
        />
      </div>

      {/* Remove Button */}
      {canRemove && (
        <IconButton
          onClick={onRemove}
          size="small"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          title="Remove specialty"
        >
          <XMarkIcon className="w-4 h-4" />
        </IconButton>
      )}
    </Box>
  );
};

export default SpecialtyBlendItemComponent;
