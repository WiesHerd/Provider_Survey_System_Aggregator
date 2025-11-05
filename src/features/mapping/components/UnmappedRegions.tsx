import React, { useState, useEffect } from 'react';
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
  XMarkIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { RectangleStackIcon as RectangleStackIconSolid } from '@heroicons/react/24/solid';
import { IUnmappedRegion } from '../types/mapping';
import { RegionCard } from './RegionCard';
import { getSurveySourceColor } from '../utils/mappingCalculations';

interface UnmappedRegionsProps {
  unmappedRegions: IUnmappedRegion[];
  selectedRegions: IUnmappedRegion[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRegionSelect: (region: IUnmappedRegion) => void;
  onClearSelection?: () => void;
  onRefresh: () => void;
  showAllCategories?: boolean;
  onToggleCategoryFilter?: () => void;
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
  onClearSelection,
  onRefresh,
  showAllCategories = false,
  onToggleCategoryFilter
}) => {
  // State for hidden survey columns
  const [hiddenSurveys, setHiddenSurveys] = useState<Set<string>>(new Set());

  // Reset hidden surveys when "Show All Surveys" toggle changes
  useEffect(() => {
    setHiddenSurveys(new Set());
  }, [showAllCategories]);

  // Handler to hide a survey column
  const handleHideSurvey = (source: string) => {
    setHiddenSurveys(prev => {
      const newSet = new Set(prev);
      newSet.add(source);
      return newSet;
    });
  };

  // Group regions by survey source
  const regionsBySurvey = new Map<string, typeof unmappedRegions>();
  unmappedRegions.forEach(region => {
    const current = regionsBySurvey.get(region.surveySource) || [];
    regionsBySurvey.set(region.surveySource, [...current, region]);
  });

  // Filter out hidden surveys
  const visibleSurveys = Array.from(regionsBySurvey.entries()).filter(
    ([source]) => !hiddenSurveys.has(source)
  );

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

      {/* Selection Counter and View Controls */}
      <div className="mb-4 flex items-center justify-between">
        {selectedRegions.length > 0 ? (
          <div className="text-sm text-gray-600 font-medium">
            {selectedRegions.length} selected
            {searchTerm && (
              <span className="text-gray-400 ml-2">
                (may include hidden items)
              </span>
            )}
          </div>
        ) : (
          <div></div>
        )}
        
        <div className="flex items-center gap-2">
          {/* Show All Survey Types Toggle - View Control */}
          {onToggleCategoryFilter && (
            <div className="relative group">
              <button
                onClick={onToggleCategoryFilter}
                className={`p-1.5 rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  showAllCategories
                    ? 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 hover:border-indigo-300 focus:ring-indigo-500'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 border-gray-200 hover:border-gray-400 focus:ring-gray-500'
                }`}
                aria-label={showAllCategories ? 'Show all survey types' : 'Filter by Data View'}
              >
                {showAllCategories ? (
                  <RectangleStackIconSolid className="h-4 w-4" />
                ) : (
                  <RectangleStackIcon className="h-4 w-4" />
                )}
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  {showAllCategories 
                    ? 'Show All Survey Types'
                    : 'Filtered by Data View'}
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Clear Selection - Icon Button */}
          {onClearSelection && selectedRegions.length > 0 && (
            <div className="relative group">
              <button
                onClick={onClearSelection}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full border border-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                aria-label="Clear all selections"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  Clear Selection
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Regions Grid - Intelligent flexible layout that adapts to any number of columns */}
      {/* Fixed column width (320px) ensures consistent appearance regardless of number of columns */}
      {/* Uses flexbox for optimal horizontal scrolling with fixed-width columns */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Responsive: On mobile (flex-col), vertical stack; on larger screens (sm:flex-row), horizontal row with scroll */}
          {/* Columns grow to fill space when few columns exist, but maintain minimum width and scroll when many */}
          {visibleSurveys.map(([source, regions]) => {
            const color = getSurveySourceColor(source);
            
            return (
              <Paper 
                key={source} 
                className="p-3 relative overflow-hidden flex-shrink-0 sm:flex-1 border border-gray-200 transition-all duration-200"
                style={{ 
                  minWidth: '320px',
                  maxWidth: '500px' // Prevent columns from becoming too wide on very large screens
                }}
              >
              <Typography variant="h6" className="mb-3 flex items-center justify-between text-sm font-medium relative">
                <span style={{ color }}>{source}</span>
                <div className="flex items-center gap-2">
                  <Typography variant="caption" color="textSecondary" className="text-xs">
                    {regions.length} regions
                  </Typography>
                  {/* Close button to hide survey column */}
                  <div className="relative group">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHideSurvey(source);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                      aria-label="Hide this survey column"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                        Hide this survey column
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                      </div>
                    </div>
                  </div>
                </div>
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
      {visibleSurveys.length === 0 && (
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
