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
      
      {/* Empty State */}
      {mappingEntries.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Typography variant="body2" color="textSecondary" className="text-sm">
            {searchTerm 
              ? "No learned mappings match your search"
              : "No learned mappings yet"
            }
          </Typography>
        </div>
      )}
    </div>
  );
};


