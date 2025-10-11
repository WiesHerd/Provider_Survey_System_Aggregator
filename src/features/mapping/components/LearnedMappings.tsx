import React from 'react';
import {
  TextField,
  Typography,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { LearnedMappingsProps } from '../types/mapping';
import { MappedSpecialtyItem } from './MappedSpecialtyItem';

/**
 * LearnedMappings component for displaying learned mappings
 * 
 * @param learnedMappings - Record of learned mappings (original -> corrected)
 * @param searchTerm - Current search term
 * @param onSearchChange - Callback when search term changes
 * @param onRemoveLearnedMapping - Callback when a learned mapping is removed
 */
export const LearnedMappings: React.FC<LearnedMappingsProps> = ({
  learnedMappings,
  learnedMappingsWithSource,
  searchTerm,
  onSearchChange,
  onRemoveLearnedMapping,
  onApplyAllMappings,
  onClearAllMappings
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
  // Use survey source data if available, otherwise fall back to 'Custom'
  const learnedMappingsList = Object.entries(groupedMappings).map(([standardizedName, originalNames]) => ({
    id: standardizedName,
    standardizedName,
    sourceSpecialties: originalNames.map(original => {
      // Find the survey source for this original specialty
      const sourceData = learnedMappingsWithSource?.find(item => 
        item.original === original && item.corrected === standardizedName
      );
      
      
      // If no source data found, try to infer from the original specialty name
      let surveySource = sourceData?.surveySource || 'Custom';
      
      // Try to infer survey source from specialty name patterns
      if (surveySource === 'Custom') {
        if (original.toLowerCase().includes('mgma') || original.toLowerCase().includes('mgma')) {
          surveySource = 'MGMA';
        } else if (original.toLowerCase().includes('sullivan') || original.toLowerCase().includes('cotter')) {
          surveySource = 'SullivanCotter';
        } else if (original.toLowerCase().includes('gallagher')) {
          surveySource = 'Gallagher';
        } else {
          // Try to extract survey source from the original specialty name
          const surveyPatterns = [
            { pattern: /mgma/i, source: 'MGMA' },
            { pattern: /sullivan/i, source: 'SullivanCotter' },
            { pattern: /cotter/i, source: 'SullivanCotter' },
            { pattern: /gallagher/i, source: 'Gallagher' }
          ];
          
          for (const { pattern, source } of surveyPatterns) {
            if (pattern.test(original)) {
              surveySource = source;
              break;
            }
          }
        }
      }
      
      return {
        id: crypto.randomUUID(),
        specialty: original,
        originalName: original,
        surveySource: surveySource as any,
        mappingId: standardizedName
      };
    }),
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  return (
    <div className="space-y-4">
      {/* Header with Search and Action Buttons */}
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
        
      </div>

      {/* Learned Mappings List - Now Grouped! */}
      <div className="space-y-4">
        {learnedMappingsList.map((mapping) => (
          <MappedSpecialtyItem
            key={mapping.id}
            mapping={mapping}
            onDelete={() => {
              console.log('🗑️ TRASH ICON CLICKED - Starting delete process');
              console.log('🗑️ Mapping to delete:', mapping);
              console.log('🗑️ Source specialties:', mapping.sourceSpecialties);
              
              // Show confirmation dialog first
              if (window.confirm('Remove this learned mapping?')) {
                console.log('🗑️ User confirmed deletion');
                onRemoveLearnedMapping(mapping.standardizedName);
              } else {
                console.log('🗑️ User cancelled deletion');
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
                {searchTerm ? 'No learned mappings match your search criteria.' : 'Learned mappings will appear here after you create specialty mappings.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
