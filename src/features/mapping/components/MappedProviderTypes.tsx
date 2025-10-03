import React from 'react';
import {
  TextField,
  Typography,
  InputAdornment
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon
} from '@heroicons/react/24/outline';
import { IProviderTypeMapping } from '../types/mapping';
import { MappedProviderTypeItem } from './MappedProviderTypeItem';

interface MappedProviderTypesProps {
  mappings: IProviderTypeMapping[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onDeleteMapping: (mappingId: string) => void;
  onEditMapping?: (mapping: IProviderTypeMapping) => void;
}

/**
 * MappedProviderTypes component for displaying mapped provider types with search
 * Matches the structure of MappedSpecialties exactly
 */
export const MappedProviderTypes: React.FC<MappedProviderTypesProps> = ({
  mappings,
  searchTerm,
  onSearchChange,
  onDeleteMapping,
  onEditMapping
}) => {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="mb-4">
        <TextField
          fullWidth
          placeholder="Search mapped provider types..."
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

      {/* Mappings List */}
      <div className="space-y-3">
        {mappings.map((mapping) => (
          <MappedProviderTypeItem
            key={mapping.id}
            mapping={mapping}
            onDelete={() => onDeleteMapping(mapping.id)}
            onEdit={onEditMapping ? () => onEditMapping(mapping) : undefined}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mapped Provider Types Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'No mapped provider types match your search criteria.'
                : 'Create provider type mappings to organize and standardize your survey data.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};



