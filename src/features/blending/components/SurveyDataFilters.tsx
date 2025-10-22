/**
 * Survey Data Filters Component
 * 
 * Handles cascading filter logic for survey data
 */

import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { formatRegionForDisplay, capitalizeWords } from '../../../shared/utils/formatters';

interface SurveyDataFiltersProps {
  selectedSurvey: string;
  selectedYear: string;
  selectedRegion: string;
  selectedProviderType: string;
  specialtySearch: string;
  onSurveyChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onProviderTypeChange: (value: string) => void;
  onSpecialtySearchChange: (value: string) => void;
  filterOptions: {
    surveys: string[];
    years: string[];
    regions: string[];
    providerTypes: string[];
  };
}

export const SurveyDataFilters: React.FC<SurveyDataFiltersProps> = ({
  selectedSurvey,
  selectedYear,
  selectedRegion,
  selectedProviderType,
  specialtySearch,
  onSurveyChange,
  onYearChange,
  onRegionChange,
  onProviderTypeChange,
  onSpecialtySearchChange,
  filterOptions
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Specialty Search */}
      <div>
        <TextField
          fullWidth
          size="small"
          label="Search Specialties"
          value={specialtySearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSpecialtySearchChange(e.target.value)}
          placeholder="Type to search specialties"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
              borderRadius: '8px !important',
              height: '40px',
              border: '1px solid #d1d5db !important',
              '&:hover': { 
                borderColor: '#9ca3af !important',
                borderWidth: '1px !important'
              },
              '&.Mui-focused': { 
                boxShadow: 'none', 
                borderColor: '#3b82f6 !important',
                borderWidth: '1px !important'
              },
              '& fieldset': {
                border: 'none !important',
                borderRadius: '8px !important'
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderRadius: '8px !important'
              }
            },
            '& .MuiInputLabel-root': {
              backgroundColor: 'white',
              paddingLeft: '4px',
              paddingRight: '4px',
              '&.Mui-focused': {
                color: '#3b82f6'
              }
            }
          }}
        />
      </div>
       
      {/* Survey Source */}
      <div>
        <FormControl fullWidth size="small">
          <InputLabel>Survey Source</InputLabel>
          <Select
            value={selectedSurvey}
            label="Survey Source"
            onChange={(e: SelectChangeEvent) => {
              onSurveyChange(e.target.value);
              onSpecialtySearchChange('');
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: '8px',
                height: '40px',
                border: '1px solid #d1d5db !important',
                '&:hover': { 
                  borderColor: '#9ca3af !important',
                  borderWidth: '1px !important'
                },
                '&.Mui-focused': { 
                  boxShadow: 'none', 
                  borderColor: '#3b82f6 !important',
                  borderWidth: '1px !important'
                },
                '& fieldset': {
                  border: 'none !important'
                }
              }
            }}
          >
            <MenuItem value="">All Surveys</MenuItem>
            {filterOptions.surveys.map(survey => (
              <MenuItem key={survey} value={survey}>{survey}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
       
      {/* Year */}
      <div>
        <FormControl fullWidth size="small">
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
            label="Year"
            onChange={(e: SelectChangeEvent) => {
              onYearChange(e.target.value);
              onSpecialtySearchChange('');
            }}
            disabled={!selectedSurvey}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: selectedSurvey ? 'white' : '#f9fafb',
                borderRadius: '8px',
                height: '40px',
                border: '1px solid #d1d5db !important',
                '&:hover': { 
                  borderColor: '#9ca3af !important',
                  borderWidth: '1px !important'
                },
                '&.Mui-focused': { 
                  boxShadow: 'none', 
                  borderColor: '#3b82f6 !important',
                  borderWidth: '1px !important'
                },
                '& fieldset': {
                  border: 'none !important'
                }
              }
            }}
          >
            <MenuItem value="">All Years</MenuItem>
            {filterOptions.years.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
       
      {/* Region */}
      <div>
        <FormControl fullWidth size="small">
          <InputLabel>Region</InputLabel>
          <Select
            value={selectedRegion}
            label="Region"
            onChange={(e: SelectChangeEvent) => {
              onRegionChange(e.target.value);
              onSpecialtySearchChange('');
            }}
            disabled={!selectedYear}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: selectedYear ? 'white' : '#f9fafb',
                borderRadius: '8px',
                height: '40px',
                border: '1px solid #d1d5db !important',
                '&:hover': { 
                  borderColor: '#9ca3af !important',
                  borderWidth: '1px !important'
                },
                '&.Mui-focused': { 
                  boxShadow: 'none', 
                  borderColor: '#3b82f6 !important',
                  borderWidth: '1px !important'
                },
                '& fieldset': {
                  border: 'none !important'
                }
              }
            }}
          >
            <MenuItem value="">All Regions</MenuItem>
            {filterOptions.regions.map(region => (
              <MenuItem key={region} value={region}>
                {formatRegionForDisplay(region)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
       
      {/* Provider Type */}
      <div>
        <FormControl fullWidth size="small">
          <InputLabel>Provider Type</InputLabel>
          <Select
            value={selectedProviderType}
            label="Provider Type"
            onChange={(e: SelectChangeEvent) => {
              onProviderTypeChange(e.target.value);
              onSpecialtySearchChange('');
            }}
            disabled={!selectedSurvey}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: selectedSurvey ? 'white' : '#f9fafb',
                borderRadius: '8px',
                height: '40px',
                border: '1px solid #d1d5db !important',
                '&:hover': { 
                  borderColor: '#9ca3af !important',
                  borderWidth: '1px !important'
                },
                '&.Mui-focused': { 
                  boxShadow: 'none', 
                  borderColor: '#3b82f6 !important',
                  borderWidth: '1px !important'
                },
                '& fieldset': {
                  border: 'none !important'
                }
              }
            }}
          >
            <MenuItem value="">All Provider Types</MenuItem>
            {filterOptions.providerTypes.map(providerType => {
              const normalized = providerType === 'Staff Physician' ? 'Physician' : capitalizeWords(providerType);
              return (
                <MenuItem key={providerType} value={providerType}>
                  {normalized}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </div>
    </div>
  );
};
