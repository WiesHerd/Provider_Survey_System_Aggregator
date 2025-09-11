import React from 'react';
import {
  TextField,
  Typography,
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
  onClearSelection,
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
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600 font-medium">
              {selectedSpecialties.length} selected
              {searchTerm && (
                <span className="text-gray-400 ml-2">
                  (may include hidden items)
                </span>
              )}
            </div>
            {onClearSelection && (
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.confirm('Clear all selections?')) {
                    onClearSelection();
                  }
                }}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Clear Selection
              </button>
            )}
          </div>
        )}

      {/* Specialties Grid - Consistent Fixed Layout */}
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
                {specialties.map((specialty: any) => (
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

      {/* Empty State - Consistent enterprise pattern */}
      {Array.from(specialtiesBySurvey.entries()).length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <BoltIcon className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unmapped Specialties Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No specialties match your search criteria.' : 'All specialties are mapped, or no survey data is available.'}
            </p>
            {!searchTerm && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <BoltIcon className="h-4 w-4 mr-2" />
                Refresh Data
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
