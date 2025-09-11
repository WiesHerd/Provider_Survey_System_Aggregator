import React from 'react';
import {
  TextField,
  Typography,
  Paper,
  Button,
  InputAdornment,
  Alert
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  ExclamationTriangleIcon as WarningIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { IUnmappedProviderType } from '../types/mapping';
import { ProviderTypeCard } from './ProviderTypeCard';
import { getSurveySourceColor } from '../utils/mappingCalculations';

interface UnmappedProviderTypesProps {
  unmappedProviderTypes: IUnmappedProviderType[];
  selectedProviderTypes: IUnmappedProviderType[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onProviderTypeSelect: (providerType: IUnmappedProviderType) => void;
  onRefresh: () => void;
}

/**
 * UnmappedProviderTypes component for displaying and managing unmapped provider types
 * Matches the structure of UnmappedSpecialties exactly
 */
export const UnmappedProviderTypes: React.FC<UnmappedProviderTypesProps> = ({
  unmappedProviderTypes,
  selectedProviderTypes,
  searchTerm,
  onSearchChange,
  onProviderTypeSelect,
  onRefresh
}) => {
  // Group provider types by survey source
  const providerTypesBySurvey = new Map<string, typeof unmappedProviderTypes>();
  unmappedProviderTypes.forEach(providerType => {
    const current = providerTypesBySurvey.get(providerType.surveySource) || [];
    providerTypesBySurvey.set(providerType.surveySource, [...current, providerType]);
  });

  return (
    <>
      {/* Search Bar */}
      <div className="mb-4">
        <TextField
          fullWidth
          placeholder="Search across all surveys..."
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

      {/* Selection Counter */}
      {selectedProviderTypes.length > 0 && (
        <div className="mb-4 flex items-center justify-end">
          <div className="text-sm text-gray-600 font-medium">
            {selectedProviderTypes.length} selected
          </div>
        </div>
      )}

      {/* Provider Types Grid - Consistent Fixed Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from(providerTypesBySurvey.entries()).map(([source, providerTypes]) => {
          const color = getSurveySourceColor(source);
          
          return (
            <Paper key={source} className="p-3 relative overflow-hidden">
              <Typography variant="h6" className="mb-3 flex items-center justify-between text-sm font-medium">
                <span style={{ color }}>{source}</span>
                <Typography variant="caption" color="textSecondary" className="text-xs">
                  {providerTypes.length} provider types
                </Typography>
              </Typography>
              <div className="space-y-1.5">
                {providerTypes.map((providerType) => (
                  <ProviderTypeCard
                    key={providerType.id}
                    providerType={providerType}
                    isSelected={selectedProviderTypes.some(p => p.id === providerType.id)}
                    onSelect={onProviderTypeSelect}
                  />
                ))}
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1" style={{ backgroundColor: color }} />
            </Paper>
          );
        })}
      </div>

      {/* Empty State - Consistent enterprise pattern */}
      {Array.from(providerTypesBySurvey.entries()).length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <BoltIcon className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unmapped Provider Types Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No provider types match your search criteria.' : 'All provider types are mapped, or no survey data is available.'}
            </p>
            {!searchTerm && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <BoltIcon className="h-4 w-4 mr-2" />
                Refresh Data
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
