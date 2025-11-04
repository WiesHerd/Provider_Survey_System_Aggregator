import React from 'react';
import {
  TextField,
  Typography,
  Paper,
  Button,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  ExclamationTriangleIcon as WarningIcon,
  BoltIcon,
  XMarkIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { RectangleStackIcon as RectangleStackIconSolid } from '@heroicons/react/24/solid';
import { IUnmappedVariable } from '../types/mapping';
import { VariableCard } from './VariableCard';
import { getSurveySourceColor } from '../utils/mappingCalculations';

interface UnmappedVariablesProps {
  unmappedVariables: IUnmappedVariable[];
  selectedVariables: IUnmappedVariable[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onVariableSelect: (variable: IUnmappedVariable) => void;
  onClearSelection?: () => void;
  onRefresh: () => void;
  showAllCategories?: boolean;
  onToggleCategoryFilter?: () => void;
}

/**
 * UnmappedVariables component for displaying and managing unmapped variables
 * Matches the structure of UnmappedSpecialties exactly
 */
export const UnmappedVariables: React.FC<UnmappedVariablesProps> = ({
  unmappedVariables,
  selectedVariables,
  searchTerm,
  onSearchChange,
  onVariableSelect,
  onClearSelection,
  onRefresh,
  showAllCategories = false,
  onToggleCategoryFilter
}) => {
  // Group variables by survey source
  const variablesBySurvey = new Map<string, typeof unmappedVariables>();
  unmappedVariables.forEach(variable => {
    const current = variablesBySurvey.get(variable.surveySource) || [];
    variablesBySurvey.set(variable.surveySource, [...current, variable]);
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

      {/* Selection Counter and View Controls */}
      <div className="mb-4 flex items-center justify-between">
        {selectedVariables.length > 0 ? (
          <div className="text-sm text-gray-600 font-medium">
            {selectedVariables.length} selected
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
          {/* Clear Selection - Icon Button */}
          {onClearSelection && selectedVariables.length > 0 && (
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
        </div>
      </div>

      {/* Variables Grid - Intelligent flexible layout that adapts to any number of columns */}
      {/* Fixed column width (320px) ensures consistent appearance regardless of number of columns */}
      {/* Uses flexbox for optimal horizontal scrolling with fixed-width columns */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Responsive: On mobile (flex-col), vertical stack; on larger screens (sm:flex-row), horizontal row with scroll */}
          {/* Columns grow to fill space when few columns exist, but maintain minimum width and scroll when many */}
          {Array.from(variablesBySurvey.entries()).map(([source, variables]) => {
            const color = getSurveySourceColor(source);
            
            return (
              <Paper 
                key={source} 
                className="p-3 relative overflow-hidden flex-shrink-0 sm:flex-1 border border-gray-200"
                style={{ 
                  minWidth: '320px',
                  maxWidth: '500px' // Prevent columns from becoming too wide on very large screens
                }}
              >
              <Typography variant="h6" className="mb-3 flex items-center justify-between text-sm font-medium">
                <span style={{ color }}>{source}</span>
                <Typography variant="caption" color="textSecondary" className="text-xs">
                  {variables.length} fields
                </Typography>
              </Typography>
              <div className="space-y-1.5">
                {variables.map((variable) => (
                  <VariableCard
                    key={variable.id}
                    variable={variable}
                    isSelected={selectedVariables.some(v => v.id === variable.id)}
                    onSelect={onVariableSelect}
                  />
                ))}
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1" style={{ backgroundColor: color }} />
            </Paper>
          );
        })}
        </div>
      </div>

      {/* Empty State */}
      {Array.from(variablesBySurvey.entries()).length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <WarningIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <Typography variant="h6" color="textSecondary" className="mb-2 text-sm">
            No Unmapped Fields Found
          </Typography>
          <Typography variant="body2" color="textSecondary" className="mb-3 text-sm">
            {searchTerm 
              ? "No fields match your search criteria"
              : "All fields have been mapped or no survey data is available"
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

