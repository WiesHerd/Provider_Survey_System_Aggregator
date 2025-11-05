import React, { useState, useCallback } from 'react';
import {
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Checkbox,
  Box,
  Chip
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  XMarkIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { LearnedMappingsProps } from '../types/mapping';
import { MappedSpecialtyItem } from './MappedSpecialtyItem';
import { StandardTooltip } from '../../../shared/components';
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog';

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
  onApplyAllMappings
}) => {
  // Bulk selection state
  const [selectedMappings, setSelectedMappings] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
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

  // Bulk selection handlers
  const handleToggleBulkMode = useCallback(() => {
    setIsBulkMode(!isBulkMode);
    setSelectedMappings(new Set());
  }, [isBulkMode]);

  const handleSelectMapping = useCallback((mappingId: string) => {
    setSelectedMappings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mappingId)) {
        newSet.delete(mappingId);
      } else {
        newSet.add(mappingId);
      }
      return newSet;
    });
  }, []);


  const handleBulkDelete = useCallback(() => {
    if (selectedMappings.size === 0) return;
    
    setConfirmationDialog({
      isOpen: true,
      title: 'Delete Learned Mappings',
      message: `Are you sure you want to delete ${selectedMappings.size} learned mapping(s)? This action cannot be undone and will affect data processing for future survey uploads.`,
      onConfirm: () => {
        selectedMappings.forEach(mappingId => {
          onRemoveLearnedMapping(mappingId);
        });
        setSelectedMappings(new Set());
        setIsBulkMode(false);
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [selectedMappings, onRemoveLearnedMapping, learnedMappingsList]);

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
        
        <div className="flex items-center space-x-3 whitespace-nowrap">
          {/* Bulk Selection Controls */}
          {isBulkMode && (
            <>
              <Chip 
                label={`${selectedMappings.size} selected`} 
                size="small" 
                color="primary"
                variant="outlined"
              />
              <button
                onClick={handleBulkDelete}
                disabled={selectedMappings.size === 0}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete selected mappings"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete Selected
              </button>
            </>
          )}
          
          <button
            onClick={handleToggleBulkMode}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isBulkMode 
                ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 border border-blue-600' 
                : 'text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500 border border-gray-300 hover:border-gray-400'
            }`}
            title={isBulkMode ? 'Exit bulk selection mode' : 'Enter bulk selection mode'}
          >
            {isBulkMode ? (
              <>
                <CheckIcon className="h-4 w-4 mr-2" />
                Exit Bulk Mode
              </>
            ) : (
              'Bulk Select'
            )}
          </button>
        </div>
      </div>

      {/* Learned Mappings List - Now Grouped! */}
      <div className="space-y-4">
        {learnedMappingsList.map((mapping) => (
          <div key={mapping.id} className="flex items-start space-x-3">
            {/* Bulk Selection Checkbox */}
            {isBulkMode && (
              <Checkbox
                checked={selectedMappings.has(mapping.id)}
                onChange={() => handleSelectMapping(mapping.id)}
                size="small"
                sx={{ 
                  padding: '4px',
                  '&.Mui-checked': {
                    color: '#3b82f6'
                  }
                }}
              />
            )}
            
            {/* Mapping Item */}
            <div className="flex-1">
              <MappedSpecialtyItem
                mapping={mapping}
                onDelete={() => {
                  // Show single confirmation dialog for deleting all source specialties
                  setConfirmationDialog({
                    isOpen: true,
                    title: 'Remove Learned Mapping',
                    message: `Are you sure you want to remove the learned mapping for "${mapping.standardizedName}"? This will remove ${mapping.sourceSpecialties.length} mapping(s).`,
                    onConfirm: () => {
                      // Remove all source specialties for this standardized name
                      // No need for individual confirmations - user already confirmed once
                      mapping.sourceSpecialties.forEach(source => {
                        onRemoveLearnedMapping(source.specialty);
                      });
                      setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
                    }
                  });
                }}
              />
            </div>
          </div>
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
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationDialog.onConfirm}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};
