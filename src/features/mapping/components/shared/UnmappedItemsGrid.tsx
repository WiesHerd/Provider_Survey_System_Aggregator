import React from 'react';
import {
  TextField,
  Typography,
  Paper,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  XMarkIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { getSurveySourceColor } from '../../utils/mappingCalculations';

interface UnmappedItemsGridProps<T> {
  items: T[];
  groupByKey: (item: T) => string; // e.g., item.surveySource
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedItems: T[];
  onClearSelection?: () => void;
  onRefresh: () => void;
  renderCard: (item: T, isSelected: boolean) => React.ReactNode;
  emptyMessage?: string;
  entityName: string; // "specialties", "provider types", "regions", "variables", "columns"
}

/**
 * UnmappedItemsGrid component - Reusable grid layout for unmapped items
 * Provides consistent 3-column responsive grid with survey source grouping
 * 
 * @param items - Array of unmapped items
 * @param groupByKey - Function to extract survey source from item
 * @param searchTerm - Current search term
 * @param onSearchChange - Callback when search changes
 * @param selectedItems - Currently selected items
 * @param onClearSelection - Callback to clear all selections
 * @param onRefresh - Callback to refresh data
 * @param renderCard - Function to render individual item card
 * @param emptyMessage - Custom empty state message
 * @param entityName - Name of entity for display (plural)
 */
export const UnmappedItemsGrid = <T,>({
  items,
  groupByKey,
  searchTerm,
  onSearchChange,
  selectedItems,
  onClearSelection,
  onRefresh,
  renderCard,
  emptyMessage,
  entityName
}: UnmappedItemsGridProps<T>) => {
  // Group items by survey source
  const itemsBySurvey = new Map<string, T[]>();
  items.forEach(item => {
    const surveySource = groupByKey(item);
    const current = itemsBySurvey.get(surveySource) || [];
    itemsBySurvey.set(surveySource, [...current, item]);
  });

  return (
    <>
      {/* Search Bar */}
      <div className="mb-4">
        <TextField
          fullWidth
          placeholder={`Search across all surveys...`}
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

      {/* Selection Counter */}
      {selectedItems.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600 font-medium">
            {selectedItems.length} selected
            {searchTerm && (
              <span className="text-gray-400 ml-2">
                (may include hidden items)
              </span>
            )}
          </div>
          {onClearSelection && (
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.confirm('Clear all selections?')) {
                  onClearSelection();
                }
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear Selection
            </button>
          )}
        </div>
      )}

      {/* Items Grid - Consistent Fixed Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from(itemsBySurvey.entries()).map(([source, surveyItems]) => {
          const color = getSurveySourceColor(source);
          
          return (
            <Paper key={source} className="p-3 relative overflow-hidden">
              <Typography variant="h6" className="mb-3 flex items-center justify-between text-sm font-medium">
                <span style={{ color }}>{source}</span>
                <Typography variant="caption" color="textSecondary" className="text-xs">
                  {surveyItems.length} {entityName}
                </Typography>
              </Typography>
              <div className="space-y-1.5">
                {surveyItems.map((item, index) => {
                  const isSelected = selectedItems.includes(item);
                  return (
                    <div key={index}>
                      {renderCard(item, isSelected)}
                    </div>
                  );
                })}
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1" style={{ backgroundColor: color }} />
            </Paper>
          );
        })}
      </div>

      {/* Empty State - Consistent enterprise pattern */}
      {Array.from(itemsBySurvey.entries()).length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <BoltIcon className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unmapped {entityName.charAt(0).toUpperCase() + entityName.slice(1)} Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? `No ${entityName} match your search criteria.`
                : `All ${entityName} are mapped, or no survey data is available.`
              }
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
