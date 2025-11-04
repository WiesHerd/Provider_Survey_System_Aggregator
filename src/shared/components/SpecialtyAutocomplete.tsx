import React from 'react';
import { FormControl, TextField } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { formatSpecialtyForDisplay } from '../utils/formatters';
import { filterSpecialtyOptions } from '../utils/specialtyMatching';

export interface SpecialtyAutocompleteProps {
  value: string;
  options: string[];
  label?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

export const SpecialtyAutocomplete: React.FC<SpecialtyAutocompleteProps> = ({
  value,
  options,
  label = 'Specialty',
  placeholder = 'Search specialties...',
  onChange,
  fullWidth = true,
  size = 'small',
}) => {
  return (
    <FormControl sx={{ width: fullWidth ? '100%' : undefined }}>
      <Autocomplete<string>
        value={value}
        onChange={(event: any, newValue: string | null) => onChange(newValue || '')}
        options={options}
        getOptionLabel={(option: string) => option ? formatSpecialtyForDisplay(option) : ''}
        renderInput={(params: any) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            size={size}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: '8px',
                height: size === 'small' ? '40px' : undefined,
                border: '1px solid #d1d5db',
                '&:hover': {
                  borderColor: '#9ca3af'
                },
                '&.Mui-focused': {
                  boxShadow: 'none',
                  borderColor: '#3b82f6'
                }
              }
            }}
          />
        )}
        filterOptions={(opts: string[], { inputValue }: { inputValue: string }) => filterSpecialtyOptions(opts, inputValue, 100)}
        clearOnBlur={false}
        blurOnSelect={true}
      />
    </FormControl>
  );
};

export default SpecialtyAutocomplete;


