import React from 'react';
import {
  TextField,
  Typography,
  InputAdornment,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  TrashIcon as DeleteIcon
} from '@heroicons/react/24/outline';

interface LearnedColumnMappingsProps {
  learnedMappings: Record<string, string>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRemoveMapping: (original: string) => void;
}

/**
 * LearnedColumnMappings component for displaying learned column mappings
 * 
 * @param learnedMappings - Record of learned mappings (original -> corrected)
 * @param searchTerm - Current search term
 * @param onSearchChange - Callback when search term changes
 * @param onRemoveMapping - Callback when a learned mapping is removed
 */
export const LearnedColumnMappings: React.FC<LearnedColumnMappingsProps> = ({
  learnedMappings,
  searchTerm,
  onSearchChange,
  onRemoveMapping
}) => {
  // Convert learned mappings to filterable array
  const learnedMappingsList = Object.entries(learnedMappings)
    .filter(([original, corrected]) => 
      !searchTerm || 
      original.toLowerCase().includes(searchTerm.toLowerCase()) ||
      corrected.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="mb-4">
        <TextField
          fullWidth
          placeholder="Search learned column mappings..."
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

      {/* Learned Mappings List */}
      <div className="space-y-3">
        {learnedMappingsList.map(([original, corrected]) => (
          <Paper 
            key={original}
            className="p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <Typography variant="subtitle2" className="font-medium text-gray-900 text-sm">
                      {original}
                    </Typography>
                    <Typography variant="caption" className="text-gray-500 text-xs">
                      Original column name
                    </Typography>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="h-px w-6 bg-gray-300"></div>
                    <span className="text-gray-400 text-xs">→</span>
                    <div className="h-px w-6 bg-gray-300"></div>
                  </div>
                  
                  <div className="flex-1">
                    <Typography variant="subtitle2" className="font-medium text-indigo-900 text-sm">
                      {corrected}
                    </Typography>
                    <Typography variant="caption" className="text-indigo-600 text-xs">
                      Learned mapping
                    </Typography>
                  </div>
                </div>
              </div>
              
              <div className="ml-4">
                <Tooltip title="Remove learned mapping">
                  <IconButton 
                    onClick={() => onRemoveMapping(original)}
                    size="small"
                    className="text-gray-400 hover:text-red-500"
                  >
                    <DeleteIcon className="h-4 w-4" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          </Paper>
        ))}

        {/* Empty State */}
        {Object.keys(learnedMappings).length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <SearchIcon className="w-6 h-6 text-gray-500" />
            </div>
            <Typography variant="body1" className="text-gray-500 mb-2">
              No learned column mappings yet
            </Typography>
            <Typography variant="body2" className="text-gray-400 text-xs">
              The system will learn from your manual mappings to improve future auto-mapping suggestions
            </Typography>
          </div>
        )}

        {/* No search results */}
        {Object.keys(learnedMappings).length > 0 && learnedMappingsList.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Typography variant="body1" className="text-gray-500">
              No learned mappings match your search
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnedColumnMappings;
