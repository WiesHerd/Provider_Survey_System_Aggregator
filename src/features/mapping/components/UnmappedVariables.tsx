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
  XMarkIcon
} from '@heroicons/react/24/outline';
import { IUnmappedVariable } from '../types/mapping';
import { VariableCard } from './VariableCard';
import { getSurveySourceColor } from '../utils/mappingCalculations';

interface UnmappedVariablesProps {
  unmappedVariables: IUnmappedVariable[];
  selectedVariables: IUnmappedVariable[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onVariableSelect: (variable: IUnmappedVariable) => void;
  onRefresh: () => void;
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
  onRefresh
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

      {/* Selection Counter */}
      {selectedVariables.length > 0 && (
        <div className="mb-4 flex items-center justify-end">
          <div className="text-sm text-gray-600 font-medium">
            {selectedVariables.length} selected
          </div>
        </div>
      )}

      {/* Variables Grid - EXACT same layout as Specialty Mapping */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from(variablesBySurvey.entries()).map(([source, variables]) => {
          const color = getSurveySourceColor(source);
          
          return (
            <Paper key={source} className="p-3 relative overflow-hidden">
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

