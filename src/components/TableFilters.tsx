import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  SelectChangeEvent,
  Stack
} from '@mui/material';

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
  const handleChange = (event: SelectChangeEvent | React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange(event.target.name, event.target.value);
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
          <InputLabel id="specialty-label">Specialty</InputLabel>
          <Select
            labelId="specialty-label"
            id="specialty"
            name="specialty"
            value={filters.specialty}
            label="Specialty"
            onChange={handleChange}
          >
            <MenuItem value="">All Specialties</MenuItem>
            {specialties.map((specialty) => (
              <MenuItem key={specialty} value={specialty}>
                {specialty}
              </MenuItem>
            ))}
          </Select>
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