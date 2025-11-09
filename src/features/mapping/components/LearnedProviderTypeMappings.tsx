import React, { useState, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  TrashIcon,
  XMarkIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { 
  RectangleStackIcon as RectangleStackIconSolid
} from '@heroicons/react/24/solid';
import { MappedProviderTypeItem } from './MappedProviderTypeItem';
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog';

interface LearnedProviderTypeMappingsProps {
  learnedMappings: Record<string, string>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRemoveMapping: (original: string) => void;
  onApplyAllMappings?: () => void;
}

/**
 * LearnedProviderTypeMappings component for displaying automatically learned mappings
 * Matches the structure of LearnedMappings exactly
 */
export const LearnedProviderTypeMappings: React.FC<LearnedProviderTypeMappingsProps> = ({
  learnedMappings,
  searchTerm,
  onSearchChange,
  onRemoveMapping,
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

  // Convert grouped mappings to the format expected by MappedProviderTypeItem
  const learnedMappingsList = Object.entries(groupedMappings).map(([standardizedName, originalNames]) => ({
    id: standardizedName,
    standardizedName,
    sourceProviderTypes: originalNames.map(original => ({
      providerType: original,
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

  const handleSelectAll = useCallback(() => {
    if (selectedMappings.size === 0 || selectedMappings.size < learnedMappingsList.length) {
      const allIds = new Set(learnedMappingsList.map(mapping => mapping.id));
      setSelectedMappings(allIds);
    } else {
      setSelectedMappings(new Set());
    }
  }, [selectedMappings, learnedMappingsList]);

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
            mapping.sourceProviderTypes.forEach(source => {
              onRemoveMapping(source.providerType);
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

      {/* Bulk Action Bar - Icon-only toolbar (matching LearnedMappings pattern) */}
      {isBulkMode && (
        <div className="mb-4 flex items-center justify-between">
          {selectedMappings.size > 0 ? (
            <div className="text-sm text-gray-600 font-medium">
              {selectedMappings.size} selected
            </div>
          ) : (
            <div></div>
          )}
          
          <div className="flex items-center gap-2">
            {/* Select All - Icon Button */}
            <div className="relative group">
              <button
                onClick={handleSelectAll}
                className={`p-1.5 rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  selectedMappings.size > 0
                    ? 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-300 hover:border-indigo-400 focus:ring-indigo-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-gray-300 hover:border-gray-400 focus:ring-gray-500'
                }`}
                aria-label={selectedMappings.size > 0 ? 'Deselect all' : 'Select all mappings'}
              >
                {selectedMappings.size > 0 ? (
                  <RectangleStackIconSolid className="h-4 w-4" />
                ) : (
                  <RectangleStackIcon className="h-4 w-4" />
                )}
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  {selectedMappings.size > 0 ? 'Deselect All' : 'Select All'}
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>

            {/* Delete Selected - Icon Button */}
            <div className="relative group">
              <button
                onClick={handleBulkDelete}
                disabled={selectedMappings.size === 0}
                className="p-1.5 rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-red-500 hover:text-red-700 hover:bg-red-50 border-red-300 hover:border-red-400 focus:ring-red-500"
                aria-label="Delete selected mappings"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  Delete Selected
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>

            {/* Exit Bulk Mode - Icon Button */}
            <div className="relative group">
              <button
                onClick={handleToggleBulkMode}
                className="p-1.5 rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-gray-300 hover:border-gray-400 focus:ring-gray-500"
                aria-label="Exit bulk selection mode"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  Exit Bulk Mode
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Select Toggle Button - Icon-only when not in bulk mode */}
      {!isBulkMode && (
        <div className="mb-4 flex items-center justify-end">
          <div className="relative group">
            <button
              onClick={handleToggleBulkMode}
              className="p-1.5 rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-gray-300 hover:border-gray-400 focus:ring-gray-500"
              aria-label="Enter bulk selection mode"
            >
              <RectangleStackIcon className="h-4 w-4" />
            </button>
            {/* Tooltip */}
            <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                Bulk Select
                <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learned Mappings List - Reuse MappedProviderTypeItem! */}
      <div className="space-y-4">
        {learnedMappingsList.map((mapping) => (
          <MappedProviderTypeItem
            key={mapping.id}
            mapping={mapping}
            isBulkMode={isBulkMode}
            isSelected={selectedMappings.has(mapping.id)}
            onSelect={() => handleSelectMapping(mapping.id)}
            onDelete={() => {
              // Show single confirmation dialog for deleting all source provider types
              setConfirmationDialog({
                isOpen: true,
                title: 'Remove Learned Mapping',
                message: `Are you sure you want to remove the learned mapping for "${mapping.standardizedName}"? This will remove ${mapping.sourceProviderTypes.length} mapping(s).`,
                onConfirm: () => {
                  // Delete all original mappings that map to this standardized name
                  // No need for individual confirmations - user already confirmed once
                  mapping.sourceProviderTypes.forEach(source => {
                    onRemoveMapping(source.providerType);
                  });
                  setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
                }
              });
            }}
          />
        ))}
      </div>
      
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
              {searchTerm 
                ? 'No learned mappings match your search criteria.'
                : 'Learned mappings will appear here after you create provider type mappings.'
              }
            </p>
          </div>
        </div>
      )}

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



