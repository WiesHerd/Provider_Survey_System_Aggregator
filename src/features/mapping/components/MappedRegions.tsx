import React, { useState, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  XMarkIcon,
  TrashIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { 
  RectangleStackIcon as RectangleStackIconSolid
} from '@heroicons/react/24/solid';
import { IRegionMapping } from '../types/mapping';
import { MappedRegionItem } from './MappedRegionItem';
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog';

interface MappedRegionsProps {
  mappings: IRegionMapping[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onDeleteMapping: (mappingId: string) => void;
  onEditMapping?: (mapping: IRegionMapping) => void;
}

/**
 * MappedRegions component for displaying mapped regions with search
 * Matches the structure of MappedSpecialties exactly
 */
export const MappedRegions: React.FC<MappedRegionsProps> = ({
  mappings,
  searchTerm,
  onSearchChange,
  onDeleteMapping,
  onEditMapping
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

  // Handle Select All
  const handleSelectAll = useCallback(() => {
    if (selectedMappings.size === 0 || selectedMappings.size < mappings.length) {
      const allIds = new Set(mappings.map(m => m.id));
      setSelectedMappings(allIds);
    } else {
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
          placeholder="Search mapped regions..."
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

      {/* Bulk Action Bar - Icon-only toolbar */}
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
          <MappedRegionItem
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
                  onDeleteMapping(mapping.id);
                  setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
                }
              });
            }}
            onEdit={onEditMapping ? () => onEditMapping(mapping) : undefined}
          />
        ))}
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

      {/* Empty State - Consistent enterprise pattern */}
      {mappings.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mapped Regions Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'No mapped regions match your search criteria.'
                : 'Create region mappings to organize and standardize your survey data.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
