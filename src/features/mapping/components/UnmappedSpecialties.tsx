import React from 'react';
import {
  TextField,
  Typography,
  Paper,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  BoltIcon,
  XMarkIcon
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
  onSpecialtyDeselect,
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
             endAdornment: searchTerm && (
               <InputAdornment position="end">
                 <IconButton
                   size="small"
                   onClick={() => onSearchChange('')}
                   sx={{
                     padding: '4px',
                     '&:hover': {
                       backgroundColor: 'rgba(0, 0, 0, 0.04)'
                     }
                   }}
                   aria-label="Clear search"
                 >
                   <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                 </IconButton>
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

      {/* Specialties Grid - Intelligent flexible layout that adapts to any number of columns */}
      {/* Fixed column width (320px) ensures consistent appearance regardless of number of columns */}
      {/* Automatically fits as many columns as screen width allows, horizontal scroll for overflow */}
      {/* Uses flexbox for optimal horizontal scrolling with fixed-width columns */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Responsive: On mobile (flex-col), vertical stack; on larger screens (sm:flex-row), horizontal row with scroll */}
          {/* Columns grow to fill space when few columns exist, but maintain minimum width and scroll when many */}
          {Array.from(specialtiesBySurvey.entries()).map(([source, specialties]) => {
            const color = getSurveySourceColor(source);
            
            return (
              <Paper 
                key={source} 
                className="p-3 relative overflow-hidden flex-shrink-0 sm:flex-1"
                style={{ 
                  minWidth: '320px',
                  maxWidth: '500px' // Prevent columns from becoming too wide on very large screens
                }}
              >
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
                    onDeselect={onSpecialtyDeselect}
                  />
                ))}
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1" style={{ backgroundColor: color }} />
            </Paper>
          );
        })}
        </div>
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
