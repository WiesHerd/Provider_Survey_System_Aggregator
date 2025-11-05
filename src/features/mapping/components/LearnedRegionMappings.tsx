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
  TrashIcon as DeleteIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { MappedRegionItem } from './MappedRegionItem';
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog';

interface LearnedRegionMappingsProps {
  learnedMappings: Record<string, string>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRemoveMapping: (original: string) => void;
  onClearAllMappings?: () => void;
  onApplyAllMappings?: () => void;
}

export const LearnedRegionMappings: React.FC<LearnedRegionMappingsProps> = ({
  learnedMappings,
  searchTerm,
  onSearchChange,
  onRemoveMapping,
  onClearAllMappings,
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
    const selectedItems = Array.from(selectedMappings);
    setConfirmationDialog({
      isOpen: true,
      title: 'Delete Selected Mappings',
      message: `Are you sure you want to delete ${selectedItems.length} learned mapping(s)? This action cannot be undone.`,
      onConfirm: () => {
        selectedItems.forEach(mappingId => {
          // Find the original mapping key for this standardized name
          const mapping = learnedMappingsList.find(m => m.id === mappingId);
          if (mapping) {
            mapping.sourceRegions.forEach(source => {
              onRemoveMapping(source.region);
            });
          }
        });
        setSelectedMappings(new Set());
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [selectedMappings, learnedMappingsList, onRemoveMapping]);

  return (
    <div className="space-y-4">
      {/* Search Bar with Bulk Controls */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
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
          
          <div className="flex items-center space-x-3 ml-4 whitespace-nowrap">
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
                  <DeleteIcon className="h-4 w-4 mr-2" />
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
      </div>

      {/* Action Buttons - Apply All and Clear All */}
      {Object.keys(learnedMappings).length > 0 && (
        <div className="flex items-center justify-end gap-3 mb-4">
          {onApplyAllMappings && (
            <button
              onClick={onApplyAllMappings}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Apply All ({Object.keys(learnedMappings).length})
            </button>
          )}
          {onClearAllMappings && (
            <button
              onClick={() => {
                setConfirmationDialog({
                  isOpen: true,
                  title: 'Clear All Learned Mappings',
                  message: `Are you sure you want to clear all ${Object.keys(learnedMappings).length} learned mapping(s)? This action cannot be undone.`,
                  onConfirm: () => {
                    onClearAllMappings();
                    setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
                  }
                });
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
            >
              <DeleteIcon className="h-4 w-4 mr-2" />
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Learned Mappings List - Reuse MappedRegionItem! */}
      <div className="space-y-4">
        {learnedMappingsList.map((mapping) => (
          <MappedRegionItem
            key={mapping.id}
            mapping={mapping}
            onDelete={() => {
              // Show single confirmation dialog for deleting all source regions
              setConfirmationDialog({
                isOpen: true,
                title: 'Remove Learned Mapping',
                message: `Are you sure you want to remove the learned mapping for "${mapping.standardizedName}"? This will remove ${mapping.sourceRegions.length} mapping(s).`,
                onConfirm: () => {
                  // Delete all original mappings that map to this standardized name
                  // No need for individual confirmations - user already confirmed once
                  mapping.sourceRegions.forEach(source => {
                    onRemoveMapping(source.region);
                  });
                  setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
                }
              });
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



