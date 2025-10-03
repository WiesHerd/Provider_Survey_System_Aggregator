import React from 'react';
import {
  TextField,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  InputAdornment
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  TrashIcon as DeleteIcon
} from '@heroicons/react/24/outline';

interface LearnedProviderTypeMappingsProps {
  learnedMappings: Record<string, string>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRemoveMapping: (original: string) => void;
}

/**
 * LearnedProviderTypeMappings component for displaying automatically learned mappings
 * Matches the structure of LearnedMappings exactly
 */
export const LearnedProviderTypeMappings: React.FC<LearnedProviderTypeMappingsProps> = ({
  learnedMappings,
  searchTerm,
  onSearchChange,
  onRemoveMapping
}) => {
  const mappingEntries = Object.entries(learnedMappings);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="mb-4">
        <TextField
          fullWidth
          placeholder="Search learned mappings..."
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

      {/* Mappings List */}
      <div className="space-y-3">
        {mappingEntries.map(([original, standardized]) => (
          <Paper key={original} className="p-3 relative bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-md">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
                    {original}
                  </Typography>
                  <Typography variant="body2" className="text-gray-500 text-sm">
                    →
                  </Typography>
                  <Typography variant="subtitle1" className="font-medium text-indigo-600 text-sm">
                    {standardized}
                  </Typography>
                </div>
                <Typography variant="caption" className="text-gray-500 text-xs">
                  Automatically learned mapping
                </Typography>
              </div>
              <Tooltip title="Remove learned mapping">
                <IconButton onClick={() => onRemoveMapping(original)} size="small">
                  <DeleteIcon className="h-4 w-4 text-gray-500" />
                </IconButton>
              </Tooltip>
            </div>
          </Paper>
        ))}
      </div>
      
      {/* Empty State - Consistent enterprise pattern */}
      {mappingEntries.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Learned Mappings Yet</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'No learned mappings match your search criteria.'
                : 'Learned mappings will appear here after you create provider type mappings.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};



