import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Stack
} from '@mui/material';
import { formatSpecialtyForDisplay } from '../shared/utils/formatters';
import Autocomplete from '@mui/material/Autocomplete';
import { filterSpecialtyOptions } from '../shared/utils/specialtyMatching';
import { SpecialtyAutocomplete } from '../shared/components/SpecialtyAutocomplete';

interface TableFiltersProps {
  specialties: string[];
  providerTypes: string[];
  regions: string[];
  filters: {
    specialty: string;
    providerType: string;
    region: string;
  };
  onFilterChange: (filterName: string, value: string) => void;
}

export const TableFilters: React.FC<TableFiltersProps> = ({
  specialties,
  providerTypes,
  regions,
  filters,
  onFilterChange,
}) => {
  const handleChange = (
    event: React.ChangeEvent<{ name?: string; value: unknown }> | React.ChangeEvent<HTMLInputElement>
  ) => {
    const name = (event.target as any).name as string;
    const value = (event.target as any).value as string;
    onFilterChange(name, value);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2,
        }}
      >
        <FormControl fullWidth>
          <SpecialtyAutocomplete
            value={filters.specialty}
            options={[...specialties]}
            onChange={(val) => onFilterChange('specialty', val)}
          />
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="provider-type-label">Provider Type</InputLabel>
          <Select
            labelId="provider-type-label"
            id="providerType"
            name="providerType"
            value={filters.providerType}
            label="Provider Type"
            onChange={handleChange}
          >
            <MenuItem value="">All Provider Types</MenuItem>
            {providerTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="region-label">Geographic Region</InputLabel>
          <Select
            labelId="region-label"
            id="region"
            name="region"
            value={filters.region}
            label="Geographic Region"
            onChange={handleChange}
          >
            <MenuItem value="">All Regions</MenuItem>
            {regions.map((region) => (
              <MenuItem key={region} value={region}>
                {region}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
}; 