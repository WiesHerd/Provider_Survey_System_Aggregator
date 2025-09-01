import React from 'react';
import {
  TextField,
  Typography,
  InputAdornment
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon
} from '@heroicons/react/24/outline';
import { IRegionMapping } from '../types/mapping';
import { MappedRegionItem } from './MappedRegionItem';

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
          }}
        />
      </div>

      {/* Mappings List */}
      <div className="space-y-3">
        {mappings.map((mapping) => (
          <MappedRegionItem
            key={mapping.id}
            mapping={mapping}
            onDelete={() => onDeleteMapping(mapping.id)}
            onEdit={onEditMapping ? () => onEditMapping(mapping) : undefined}
          />
        ))}
      </div>
      
      {/* Empty State */}
      {mappings.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Typography variant="body2" color="textSecondary" className="text-sm">
            {searchTerm 
              ? "No mapped regions match your search"
              : "No mapped regions yet"
            }
          </Typography>
        </div>
      )}
    </div>
  );
};
