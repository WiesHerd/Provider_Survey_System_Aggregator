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
import { IUnmappedRegion } from '../types/mapping';
import { RegionCard } from './RegionCard';
import { getSurveySourceColor } from '../utils/mappingCalculations';

interface UnmappedRegionsProps {
  unmappedRegions: IUnmappedRegion[];
  selectedRegions: IUnmappedRegion[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRegionSelect: (region: IUnmappedRegion) => void;
  onRefresh: () => void;
}

/**
 * UnmappedRegions component for displaying and managing unmapped regions
 * Matches the structure of UnmappedSpecialties exactly
 */
export const UnmappedRegions: React.FC<UnmappedRegionsProps> = ({
  unmappedRegions,
  selectedRegions,
  searchTerm,
  onSearchChange,
  onRegionSelect,
  onRefresh
}) => {
  // Group regions by survey source
  const regionsBySurvey = new Map<string, typeof unmappedRegions>();
  unmappedRegions.forEach(region => {
    const current = regionsBySurvey.get(region.surveySource) || [];
    regionsBySurvey.set(region.surveySource, [...current, region]);
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
      {selectedRegions.length > 0 && (
        <div className="mb-4 flex items-center justify-end">
          <div className="text-sm text-gray-600 font-medium">
            {selectedRegions.length} selected
          </div>
        </div>
      )}

      {/* Regions Grid - Intelligent flexible layout that adapts to any number of columns */}
      {/* Fixed column width (320px) ensures consistent appearance regardless of number of columns */}
      {/* Uses flexbox for optimal horizontal scrolling with fixed-width columns */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Responsive: On mobile (flex-col), vertical stack; on larger screens (sm:flex-row), horizontal row with scroll */}
          {/* Columns grow to fill space when few columns exist, but maintain minimum width and scroll when many */}
          {Array.from(regionsBySurvey.entries()).map(([source, regions]) => {
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
                  {regions.length} regions
                </Typography>
              </Typography>
              <div className="space-y-1.5">
                {regions.map((region) => (
                  <RegionCard
                    key={region.id}
                    region={region}
                    isSelected={selectedRegions.some(r => r.id === region.id)}
                    onSelect={onRegionSelect}
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
      {Array.from(regionsBySurvey.entries()).length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <BoltIcon className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unmapped Regions Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No regions match your search criteria.' : 'All regions are mapped, or no survey data is available.'}
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
