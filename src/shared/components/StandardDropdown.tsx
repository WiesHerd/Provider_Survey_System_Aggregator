/**
 * Standard Dropdown Component
 * 
 * A reusable dropdown component that provides consistent styling across the application.
 * Matches the upload screen styling with proper Material-UI integration.
 */

import React, { memo } from 'react';
import {
  FormControl,
  Autocomplete,
  TextField
} from '@mui/material';

export interface StandardDropdownProps {
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Available options */
  options: string[];
  /** Label for the dropdown */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Whether the dropdown is loading */
  loading?: boolean;
  /** Custom formatter for option display */
  getOptionLabel?: (option: string) => string;
  /** Custom filter function for options */
  filterOptions?: (options: string[], inputValue: string) => string[];
  /** Whether to use Autocomplete (searchable) or Select (simple dropdown) */
  variant?: 'autocomplete' | 'select';
  /** Additional CSS classes */
  className?: string;
  /** Size of the dropdown */
  size?: 'small' | 'medium';
}

/**
 * Standard Dropdown component with consistent styling
 * 
 * @param value - Current selected value
 * @param onChange - Callback when value changes
 * @param options - Available options
 * @param label - Label for the dropdown
 * @param placeholder - Placeholder text
 * @param disabled - Whether the dropdown is disabled
 * @param loading - Whether the dropdown is loading
 * @param getOptionLabel - Custom formatter for option display
 * @param filterOptions - Custom filter function for options
 * @param variant - Whether to use Autocomplete or Select
 * @param className - Additional CSS classes
 * @param size - Size of the dropdown
 */
export const StandardDropdown: React.FC<StandardDropdownProps> = memo(({
  value,
  onChange,
  options,
  label,
  placeholder,
  disabled = false,
  loading = false,
  getOptionLabel = (option: string) => option,
  filterOptions,
  variant = 'autocomplete',
  className = '',
  size = 'small'
}) => {
  
  // Always use Autocomplete - EXACT match to upload screen
  return (
    <FormControl fullWidth size={size} className={className}>
      <Autocomplete
        value={value}
        onChange={(event: any, newValue: string | null) => {
          onChange(newValue || '');
        }}
        options={options}
        getOptionLabel={getOptionLabel}
        loading={loading}
        disabled={disabled}
        renderInput={(params: any) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder || `Search ${label.toLowerCase()}...`}
            size={size}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: '8px',
                height: size === 'small' ? '40px' : '56px',
                border: '1px solid #d1d5db',
                '&:hover': { 
                  borderColor: '#9ca3af' 
                },
                '&.Mui-focused': { 
                  boxShadow: 'none', 
                  borderColor: '#3b82f6' 
                }
              },
              '& .MuiInputLabel-root': {
                '&.Mui-focused': {
                  color: '#3b82f6',
                },
                '&.MuiInputLabel-shrink': {
                  transform: 'translate(14px, -9px) scale(0.75)',
                  backgroundColor: 'white',
                  padding: '0 6px',
                  zIndex: 1,
                }
              }
            }}
          />
        )}
        filterOptions={filterOptions ? (options: string[], { inputValue }: { inputValue: string }) => 
          filterOptions(options, inputValue) : undefined}
        clearOnBlur={false}
        blurOnSelect={true}
        noOptionsText="No options found"
        loadingText="Loading options..."
      />
    </FormControl>
  );
});

StandardDropdown.displayName = 'StandardDropdown';
