import React from 'react';
import {
  TextField,
  Typography,
  Chip,
  Paper,
  Button,
  InputAdornment,
  Alert
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  ExclamationTriangleIcon as WarningIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { UnmappedSpecialtiesProps } from '../types/mapping';
import { SpecialtyCard } from './SpecialtyCard';
import { getSurveySourceColor } from '../utils/mappingCalculations';

/**
 * UnmappedSpecialties component for displaying and managing unmapped specialties
 * 
 * @param unmappedSpecialties - List of unmapped specialties
 * @param selectedSpecialties - Currently selected specialties
 * @param searchTerm - Current search term
 * @param onSearchChange - Callback when search term changes
 * @param onSpecialtySelect - Callback when a specialty is selected/deselected
 * @param onRefresh - Callback to refresh data
 */
export const UnmappedSpecialties: React.FC<UnmappedSpecialtiesProps> = ({
  unmappedSpecialties,
  selectedSpecialties,
  searchTerm,
  onSearchChange,
  onSpecialtySelect,
  onRefresh
}) => {
  // Group specialties by survey source
  const specialtiesBySurvey = new Map<string, typeof unmappedSpecialties>();
  unmappedSpecialties.forEach(specialty => {
    const current = specialtiesBySurvey.get(specialty.surveySource) || [];
    specialtiesBySurvey.set(specialty.surveySource, [...current, specialty]);
  });

  return (
    <>
             {/* Search Bar */}
       <div className="mb-4">
         <TextField
           fullWidth
           placeholder="Search across all surveys..."
           value={searchTerm}
           onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
           size="small"
           sx={{ 
             '& .MuiOutlinedInput-root': {
               fontSize: '0.875rem',
               height: '40px'
             }
           }}
           InputProps={{
             startAdornment: (
               <InputAdornment position="start">
                 <SearchIcon className="h-4 w-4 text-gray-400" />
               </InputAdornment>
             ),
           }}
         />
       </div>

               {/* Selection Counter */}
        {selectedSpecialties.length > 0 && (
          <div className="mb-4 flex items-center justify-end">
            <div className="text-sm text-gray-600">
              {selectedSpecialties.length} selected
            </div>
          </div>
        )}

      {/* Selected Specialties Display */}
      {selectedSpecialties.length > 0 && (
        <div className="mb-4">
          <Typography variant="subtitle2" className="mb-2 text-sm">
            Selected Specialties:
          </Typography>
          <div className="flex flex-wrap gap-2">
            {selectedSpecialties.map((specialty) => (
              <Chip
                key={specialty.id}
                label={`${specialty.name} (${specialty.surveySource})`}
                onDelete={() => onSpecialtySelect(specialty)}
                color="primary"
                size="small"
                sx={{ fontSize: '0.75rem' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Specialties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from(specialtiesBySurvey.entries()).map(([source, specialties]) => {
          const color = getSurveySourceColor(source);
          
          return (
            <Paper key={source} className="p-3 relative overflow-hidden">
              <Typography variant="h6" className="mb-3 flex items-center justify-between text-sm font-medium">
                <span style={{ color }}>{source}</span>
                <Typography variant="caption" color="textSecondary" className="text-xs">
                  {specialties.length} specialties
                </Typography>
              </Typography>
              <div className="space-y-1.5">
                {specialties.map((specialty) => (
                  <SpecialtyCard
                    key={specialty.id}
                    specialty={specialty}
                    isSelected={selectedSpecialties.some(s => s.id === specialty.id)}
                    onSelect={onSpecialtySelect}
                  />
                ))}
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1" style={{ backgroundColor: color }} />
            </Paper>
          );
        })}
      </div>

      {/* Empty State */}
      {Array.from(specialtiesBySurvey.entries()).length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <WarningIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <Typography variant="h6" color="textSecondary" className="mb-2 text-sm">
            No Unmapped Specialties Found
          </Typography>
          <Typography variant="body2" color="textSecondary" className="mb-3 text-sm">
            {searchTerm 
              ? "No specialties match your search criteria"
              : "All specialties have been mapped or no survey data is available"
            }
          </Typography>
          {!searchTerm && (
            <Button
              variant="outlined"
              onClick={onRefresh}
              startIcon={<BoltIcon className="h-4 w-4" />}
              size="small"
              sx={{ fontSize: '0.875rem', textTransform: 'none' }}
            >
              Refresh Data
            </Button>
          )}
        </div>
      )}
    </>
  );
};
