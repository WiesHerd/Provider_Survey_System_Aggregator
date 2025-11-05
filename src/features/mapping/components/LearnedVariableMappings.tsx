import React, { useState, useCallback } from 'react';
import {
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Checkbox,
  Box,
  Chip,
  Paper
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  XMarkIcon,
  TrashIcon as DeleteIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog';

interface LearnedVariableMappingsProps {
  learnedMappings: Record<string, string>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRemoveMapping: (original: string) => void;
  onApplyAllMappings?: () => void;
}

/**
 * LearnedVariableMappings component for displaying automatically learned mappings
 * Matches the structure of other learned mappings components
 */
export const LearnedVariableMappings: React.FC<LearnedVariableMappingsProps> = ({
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

  // Group learned mappings by standardized name (like other learned mappings screens)
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

  // Convert grouped mappings to the format expected by MappedVariableItem
  const learnedMappingsList = Object.entries(groupedMappings).map(([standardizedName, originalNames]) => ({
    id: standardizedName,
    standardizedName,
    sourceVariables: originalNames.map(original => ({
      variable: original,
      surveySource: 'Custom' as any, // Learned mappings are always 'Custom'
      frequency: 1
    })),
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  const mappingEntries = Object.entries(learnedMappings);

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
            mapping.sourceVariables.forEach(source => {
              onRemoveMapping(source.variable);
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
                    edge="end"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </IconButton>
                </InputAdornment>
              )
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

      {/* Learned Mappings List - Grouped by Standardized Name (Like Specialty Mapping) */}
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
            
            {/* Mapping Item - Use same pattern as Specialty Mapping */}
            <div className="flex-1">
              <Paper className="p-3 relative bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-md">
                {/* Header with standardized name and actions */}
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
                      {mapping.standardizedName}
                    </Typography>
                    <Typography variant="caption" className="text-gray-500 text-xs">
                      Last updated: {mapping.updatedAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Typography>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // Show single confirmation dialog for deleting all source variables
                        setConfirmationDialog({
                          isOpen: true,
                          title: 'Remove Learned Mapping',
                          message: `Are you sure you want to remove the learned mapping for "${mapping.standardizedName}"? This will remove ${mapping.sourceVariables.length} mapping(s).`,
                          onConfirm: () => {
                            // Remove all source variables for this standardized name
                            mapping.sourceVariables.forEach(source => {
                              onRemoveMapping(source.variable);
                            });
                            setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                      title="Remove learned mapping"
                    >
                      <DeleteIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Connected variables display */}
                <div className="relative mt-2">
                  {/* Source variables in horizontal layout */}
                  <div className="flex flex-wrap gap-2 ml-6">
                    {mapping.sourceVariables.map((source, index) => (
                      <div key={index} className="relative">
                        {/* Connector line to main variable */}
                        {index > 0 && (
                          <div className="absolute -left-1 top-1/2 h-0.5 w-2 bg-gray-200" />
                        )}
                        
                        {/* Variable card */}
                        <div 
                          className="p-2 rounded border border-gray-200 min-w-0 bg-white hover:bg-gray-50 transition-colors duration-150 shadow-sm hover:shadow-md"
                          style={{ 
                            borderLeftColor: '#9CA3AF', // Learned color
                            borderLeftWidth: '3px' 
                          }}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <Typography className="font-medium text-sm truncate">
                              {source.variable}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              style={{ color: '#9CA3AF' }} 
                              className="text-xs font-medium whitespace-nowrap"
                            >
                              {source.surveySource}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Paper>
            </div>
          </div>
        ))}
      </div>
      
      {/* Empty State - Consistent enterprise pattern */}
      {learnedMappingsList.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Learned Mappings Yet</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No learned mappings match your search criteria.' : 'Learned mappings will appear here after you create variable mappings.'}
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
