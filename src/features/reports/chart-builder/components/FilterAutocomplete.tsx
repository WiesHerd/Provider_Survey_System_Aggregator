/**
 * Reusable Filter Autocomplete Component
 * 
 * Generic autocomplete component for filters (regions, sources, provider types, years)
 * Reduces code duplication across filter implementations
 */

import React from 'react';
import { Autocomplete, TextField, Chip, Box, FormControl, Typography } from '@mui/material';
import { getMetricDisplayVariableColor } from '../utils/reportFormatters';

export interface FilterAutocompleteProps {
  label: string;
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  chipColor?: string;
  availableCount?: number;
  noOptionsText?: string;
}

export const FilterAutocomplete: React.FC<FilterAutocompleteProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  chipColor = '#6366f1',
  availableCount,
  noOptionsText = 'No options found'
}) => {
  return (
    <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
      <Typography variant="body2" className="mb-2 text-gray-700 font-medium" sx={{ minHeight: '20px', display: 'flex', alignItems: 'center' }}>
        {label}{availableCount !== undefined ? ` (${availableCount} available)` : ''}
      </Typography>
      <Autocomplete
        multiple
        value={value}
        onChange={(event: any, newValue: string[]) => onChange(newValue)}
        options={options || []}
        getOptionLabel={(option: string) => option}
        ListboxProps={{
          style: {
            maxHeight: '300px',
            overflow: 'auto'
          }
        }}
        noOptionsText={noOptionsText}
        filterOptions={(options: string[], { inputValue }: { inputValue: string }) => {
          const filtered = options.filter((option: string) =>
            option.toLowerCase().includes(inputValue.toLowerCase())
          );
          return filtered;
        }}
        freeSolo={false}
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        renderInput={(params: any) => (
          <TextField
            {...params}
            placeholder={placeholder}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: '8px',
                fontSize: '0.875rem',
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
        renderTags={(value: string[], getTagProps: any) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {value.map((option: string, index: number) => (
              <Chip
                {...getTagProps({ index })}
                key={option}
                label={option}
                size="small"
                sx={{ 
                  backgroundColor: chipColor, 
                  color: 'white',
                  fontWeight: '500',
                  '& .MuiChip-deleteIcon': {
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { color: 'white' }
                  }
                }}
              />
            ))}
          </Box>
        )}
        sx={{
          '& .MuiAutocomplete-paper': {
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
            maxHeight: '400px',
            marginTop: '4px'
          },
          '& .MuiAutocomplete-option': {
            padding: '8px 12px',
            fontSize: '0.875rem',
            '&:hover': { backgroundColor: '#f3f4f6' },
            '&.Mui-selected': { 
              backgroundColor: '#ede9fe',
              color: '#5b21b6',
              fontWeight: 500
            }
          }
        }}
      />
    </FormControl>
  );
};









