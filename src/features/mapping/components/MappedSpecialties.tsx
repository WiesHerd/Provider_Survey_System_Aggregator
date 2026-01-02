import React, { memo, useCallback, useState } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  XMarkIcon,
  TrashIcon,
  RectangleStackIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { 
  RectangleStackIcon as RectangleStackIconSolid
} from '@heroicons/react/24/solid';
import { MappedSpecialtiesProps } from '../types/mapping';
import { MappedSpecialtyItem } from './MappedSpecialtyItem';
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog';

/**
 * MappedSpecialties component for displaying mapped specialties with search
 * 
 * @param mappings - List of mapped specialties
 * @param searchTerm - Current search term
 * @param onSearchChange - Callback when search term changes
 * @param onDeleteMapping - Callback when a mapping is deleted
 * @param onEditMapping - Optional callback when a mapping is edited
 */
export const MappedSpecialties: React.FC<MappedSpecialtiesProps> = memo(({
  mappings,
  searchTerm,
  onSearchChange,
  onDeleteMapping,
  onEditMapping
}) => {
  // Selection state and bulk mode toggle
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

  // Simple search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  // Memoize the delete handler to prevent unnecessary re-renders
  const handleDeleteMapping = useCallback((mappingId: string) => {
    onDeleteMapping(mappingId);
  }, [onDeleteMapping]);

  // Memoize the edit handler to prevent unnecessary re-renders
  const handleEditMapping = useCallback((mapping: any) => {
    if (onEditMapping) {
      onEditMapping(mapping);
    }
  }, [onEditMapping]);

  // Bulk mode toggle handler
  const handleToggleBulkMode = useCallback(() => {
    setIsBulkMode(prev => !prev);
    if (isBulkMode) {
      // Clear selections when exiting bulk mode
      setSelectedMappings(new Set());
    }
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

  // Handle Select All - selects all visible mappings if none selected, deselects all if some/all selected
  const handleSelectAll = useCallback(() => {
    if (selectedMappings.size === 0 || selectedMappings.size < mappings.length) {
      // Select all visible mappings
      const allIds = new Set(mappings.map(m => m.id));
      setSelectedMappings(allIds);
    } else {
      // Deselect all
      setSelectedMappings(new Set());
    }
  }, [selectedMappings, mappings]);

  const handleBulkDelete = useCallback(() => {
    if (selectedMappings.size === 0) return;
    
    setConfirmationDialog({
      isOpen: true,
      title: 'Delete Selected Mappings',
      message: `Are you sure you want to delete ${selectedMappings.size} mapping(s)? This action cannot be undone.`,
      onConfirm: () => {
        selectedMappings.forEach(mappingId => {
          onDeleteMapping(mappingId);
        });
        setSelectedMappings(new Set());
        setIsBulkMode(false);
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [selectedMappings, onDeleteMapping]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="mb-4">
        <TextField
          fullWidth
          placeholder="Search mapped specialties..."
          value={searchTerm}
          onChange={handleSearchChange}
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

      {/* Bulk Action Bar - Buttons below search bar (matching region/provider types screens) */}
      {isBulkMode && (
        <div className="mb-4 flex items-center justify-end">
          <div className="flex items-center gap-2">
            {/* Save Button */}
            <div className="relative group">
              <button
                onClick={() => {
                  // Save functionality - could save selected mappings or export
                  console.log('Save selected mappings:', Array.from(selectedMappings));
                }}
                disabled={selectedMappings.size === 0}
                className="p-1.5 rounded-full border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Save selected mappings"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  Save
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>

            {/* Delete Selected Button */}
            <div className="relative group">
              <button
                onClick={handleBulkDelete}
                disabled={selectedMappings.size === 0}
                className="p-1.5 rounded-full border border-red-200 hover:border-red-300 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Exit Bulk Mode Button */}
            <div className="relative group">
              <button
                onClick={handleToggleBulkMode}
                className="p-1.5 rounded-full border border-red-200 hover:border-red-300 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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

      {/* Bulk Select Toggle Button */}
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
            <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                Bulk Select
                <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mappings List */}
      <div className="space-y-4">
        {mappings.map((mapping) => (
          <MappedSpecialtyItem
            key={mapping.id}
            mapping={mapping}
            isSelected={selectedMappings.has(mapping.id)}
            isBulkMode={isBulkMode}
            onSelect={() => handleSelectMapping(mapping.id)}
            onDelete={() => {
              setConfirmationDialog({
                isOpen: true,
                title: 'Delete Mapping',
                message: `Are you sure you want to delete the mapping for "${mapping.standardizedName}"? This action cannot be undone.`,
                onConfirm: () => {
                  handleDeleteMapping(mapping.id);
                  setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
                }
              });
            }}
            onEdit={onEditMapping ? () => handleEditMapping(mapping) : undefined}
          />
        ))}
      </div>
      
      {/* Empty State - Consistent enterprise pattern */}
      {mappings.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mapped Specialties Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'No mapped specialties match your search criteria.'
                : 'Create specialty mappings to organize and standardize your survey data.'
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
});

MappedSpecialties.displayName = 'MappedSpecialties';
