import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box
} from '@mui/material';
import { ISurveyRow } from '../types/survey';

interface SurveyTableProps {
  data: ISurveyRow[];
}

export const SurveyTable: React.FC<SurveyTableProps> = ({ data }) => {
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('');
  const [providerTypeFilter, setProviderTypeFilter] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('');

  const uniqueSpecialties = useMemo(() => 
    Array.from(new Set(data.map(row => row.normalizedSpecialty))).sort(),
    [data]
  );

  const uniqueProviderTypes = useMemo(() => 
    Array.from(new Set(data.map(row => row.providerType))).sort(),
    [data]
  );

  const uniqueRegions = useMemo(() => 
    Array.from(new Set(data.map(row => row.geographicRegion))).sort(),
    [data]
  );

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchesSpecialty = !specialtyFilter || row.normalizedSpecialty === specialtyFilter;
      const matchesProviderType = !providerTypeFilter || row.providerType === providerTypeFilter;
      const matchesRegion = !regionFilter || row.geographicRegion === regionFilter;
      return matchesSpecialty && matchesProviderType && matchesRegion;
    });
  }, [data, specialtyFilter, providerTypeFilter, regionFilter]);

  const handleSpecialtyChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setSpecialtyFilter(e.target.value as string);
  };

  const handleProviderTypeChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setProviderTypeFilter(e.target.value as string);
  };

  const handleRegionChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setRegionFilter(e.target.value as string);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Specialty</InputLabel>
          <Select
            value={specialtyFilter}
            onChange={handleSpecialtyChange}
            label="Specialty"
          >
            <MenuItem value="">All</MenuItem>
            {uniqueSpecialties.map(specialty => (
              <MenuItem key={specialty} value={specialty}>{specialty}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Provider Type</InputLabel>
          <Select
            value={providerTypeFilter}
            onChange={handleProviderTypeChange}
            label="Provider Type"
          >
            <MenuItem value="">All</MenuItem>
            {uniqueProviderTypes.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Region</InputLabel>
          <Select
            value={regionFilter}
            onChange={handleRegionChange}
            label="Region"
          >
            <MenuItem value="">All</MenuItem>
            {uniqueRegions.map(region => (
              <MenuItem key={region} value={region}>{region}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Specialty</TableCell>
              <TableCell>Provider Type</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>TCC P25</TableCell>
              <TableCell>TCC P50</TableCell>
              <TableCell>TCC P75</TableCell>
              <TableCell>TCC P90</TableCell>
              <TableCell>wRVU P25</TableCell>
              <TableCell>wRVU P50</TableCell>
              <TableCell>wRVU P75</TableCell>
              <TableCell>wRVU P90</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.normalizedSpecialty}</TableCell>
                <TableCell>{row.providerType}</TableCell>
                <TableCell>{row.geographicRegion}</TableCell>
                <TableCell>{row.tcc_p25}</TableCell>
                <TableCell>{row.tcc_p50}</TableCell>
                <TableCell>{row.tcc_p75}</TableCell>
                <TableCell>{row.tcc_p90}</TableCell>
                <TableCell>{row.wrvu_p25}</TableCell>
                <TableCell>{row.wrvu_p50}</TableCell>
                <TableCell>{row.wrvu_p75}</TableCell>
                <TableCell>{row.wrvu_p90}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}; 