import React, { useState, useCallback } from 'react';
import {
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Checkbox,
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  XMarkIcon,
  TrashIcon as DeleteIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { MappedRegionItem } from './MappedRegionItem';

interface LearnedRegionMappingsProps {
  learnedMappings: Record<string, string>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRemoveMapping: (original: string) => void;
  onApplyAllMappings?: () => void;
}

export const LearnedRegionMappings: React.FC<LearnedRegionMappingsProps> = ({
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
    open: boolean;
    title: string;
    message: string;
    items: string[];
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    items: [],
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
      open: true,
      title: 'Delete Selected Mappings',
      message: `Are you sure you want to delete ${selectedItems.length} learned mapping(s)? This action cannot be undone.`,
      items: selectedItems,
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
        setConfirmationDialog(prev => ({ ...prev, open: false }));
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

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationDialog.open}
        onClose={() => setConfirmationDialog(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{confirmationDialog.title}</DialogTitle>
        <DialogContent>
          <p className="text-gray-600 mb-4">{confirmationDialog.message}</p>
          {confirmationDialog.items.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Selected items:</p>
              <div className="space-y-1">
                {confirmationDialog.items.map((item, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmationDialog(prev => ({ ...prev, open: false }))}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={confirmationDialog.onConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};



