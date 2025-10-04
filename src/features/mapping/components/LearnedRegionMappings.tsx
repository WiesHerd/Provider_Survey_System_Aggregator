import React from 'react';
import {
  TextField,
  Typography,
  InputAdornment
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon
} from '@heroicons/react/24/outline';
import { MappedRegionItem } from './MappedRegionItem';

interface LearnedRegionMappingsProps {
  learnedMappings: Record<string, string>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRemoveMapping: (original: string) => void;
}

export const LearnedRegionMappings: React.FC<LearnedRegionMappingsProps> = ({
  learnedMappings,
  searchTerm,
  onSearchChange,
  onRemoveMapping
}) => {
  // Group learned mappings by standardized name (like specialty mapping)
  const groupedMappings = Object.entries(learnedMappings).reduce((acc, [original, standardized]) => {
    if (!acc[standardized]) {
      acc[standardized] = [];
    }
    acc[standardized].push(original);
    return acc;
  }, {} as Record<string, string[]>);

  // Transform learned mappings into the same format as MappedRegionItem expects
  const learnedMappingsList = Object.entries(groupedMappings).map(([standardizedName, originalNames]) => ({
    id: standardizedName,
    standardizedName,
    sourceRegions: originalNames.map(original => ({
      region: original,
      surveySource: 'Custom' as any, // Learned mappings are always 'Custom'
      frequency: 1
    })),
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  return (
    <div className="space-y-4">
      {/* Header with Search */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 mr-4">
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
      </div>

      {/* Learned Mappings List - Reuse MappedRegionItem! */}
      <div className="space-y-4">
        {learnedMappingsList.map((mapping) => (
          <MappedRegionItem
            key={mapping.id}
            mapping={mapping}
            onDelete={() => {
              if (window.confirm('Remove this learned mapping?')) {
                onRemoveMapping(mapping.standardizedName);
              }
            }}
          />
        ))}

        {/* Empty State - Consistent enterprise pattern */}
        {Object.keys(learnedMappings).length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Learned Mappings Yet</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No learned mappings match your search criteria.' : 'Learned mappings will appear here after you create region mappings.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



