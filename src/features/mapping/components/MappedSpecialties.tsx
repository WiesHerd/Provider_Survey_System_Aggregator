import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import {
  TextField,
  Typography,
  InputAdornment
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon
} from '@heroicons/react/24/outline';
import { MappedSpecialtiesProps } from '../types/mapping';
import { MappedSpecialtyItem } from './MappedSpecialtyItem';

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
          }}
        />
      </div>

      {/* Mappings List */}
      <div className="space-y-3">
        {mappings.map((mapping) => (
          <MappedSpecialtyItem
            key={mapping.id}
            mapping={mapping}
            onDelete={() => handleDeleteMapping(mapping.id)}
            onEdit={onEditMapping ? () => handleEditMapping(mapping) : undefined}
          />
        ))}
      </div>
      
      {/* Empty State */}
      {mappings.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Typography variant="body2" color="textSecondary" className="text-sm">
            {searchTerm 
              ? "No mapped specialties match your search"
              : "No mapped specialties yet"
            }
          </Typography>
        </div>
      )}
    </div>
  );
});

MappedSpecialties.displayName = 'MappedSpecialties';
