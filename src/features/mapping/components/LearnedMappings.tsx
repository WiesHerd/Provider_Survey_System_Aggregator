import React from 'react';
import {
  TextField,
  Typography,
  InputAdornment
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon
} from '@heroicons/react/24/outline';
import { LearnedMappingsProps } from '../types/mapping';
import { MappedSpecialtyItem } from './MappedSpecialtyItem';

/**
 * LearnedMappings component for displaying learned mappings
 * 
 * @param learnedMappings - Record of learned mappings (original -> corrected)
 * @param searchTerm - Current search term
 * @param onSearchChange - Callback when search term changes
 * @param onRemoveMapping - Callback when a learned mapping is removed
 */
export const LearnedMappings: React.FC<LearnedMappingsProps> = ({
  learnedMappings,
  searchTerm,
  onSearchChange,
  onRemoveMapping
}) => {
  // Group learned mappings by standardized name (like Mapped Specialties screen)
  const groupedMappings = Object.entries(learnedMappings)
    .filter(([original, corrected]) => 
      !searchTerm || 
      original.toLowerCase().includes(searchTerm.toLowerCase()) ||
      corrected.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .reduce((groups, [original, corrected]) => {
      if (!groups[corrected]) {
        groups[corrected] = [];
      }
      groups[corrected].push(original);
      return groups;
    }, {} as Record<string, string[]>);

  // Convert grouped mappings to the format expected by MappedSpecialtyItem
  const learnedMappingsList = Object.entries(groupedMappings).map(([standardizedName, originalNames]) => ({
    id: standardizedName,
    standardizedName,
    sourceSpecialties: originalNames.map(original => ({
      id: crypto.randomUUID(),
      specialty: original,
      originalName: original,
      surveySource: 'Custom' as const,
      mappingId: standardizedName
    })),
    createdAt: new Date(),
    updatedAt: new Date()
  }));

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

      {/* Learned Mappings List - Now Grouped! */}
      <div className="space-y-4">
        {learnedMappingsList.map((mapping) => (
          <MappedSpecialtyItem
            key={mapping.id}
            mapping={mapping}
            onDelete={() => {
              // Remove all learned mappings for this standardized name
              mapping.sourceSpecialties.forEach(source => {
                onRemoveMapping(source.originalName);
              });
            }}
          />
        ))}

        {/* Empty State */}
        {Object.keys(learnedMappings).length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Typography variant="body1" className="text-gray-500">
              No learned mappings yet
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
};
