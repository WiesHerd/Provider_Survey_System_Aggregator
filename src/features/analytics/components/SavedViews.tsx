/**
 * Analytics Feature - Saved Views Component
 * 
 * Manages saved filter configurations for the benchmarking screen.
 * Matches the exact UI pattern from CustomReports saved reports.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  IconButton,
  TextField
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { 
  BookmarkIcon, 
  BookmarkSlashIcon
} from '@heroicons/react/24/outline';
import { AnalyticsFilters } from '../types/analytics';

export interface SavedView {
  id: string;
  name: string;
  filters: AnalyticsFilters;
  selectedVariables: string[];
  created: Date;
  lastUsed?: Date;
}

interface SavedViewsProps {
  filters: AnalyticsFilters;
  selectedVariables: string[];
  onLoadView: (view: SavedView) => void;
  // For the name input field - now in modal
  viewName: string;
  onViewNameChange: (name: string) => void;
  showSaveModal: boolean;
  onShowSaveModal: (show: boolean) => void;
}

const STORAGE_KEY = 'analytics_saved_views';

export const SavedViews: React.FC<SavedViewsProps> = ({
  filters,
  selectedVariables,
  onLoadView,
  viewName,
  onViewNameChange,
  showSaveModal,
  onShowSaveModal
}) => {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  // Load saved views from DataService
  useEffect(() => {
    const loadSavedViews = async () => {
      try {
        const { getDataService } = await import('../../../services/DataService');
        const dataService = getDataService();
        const saved = await dataService.getUserPreference(STORAGE_KEY);
        if (saved && Array.isArray(saved)) {
          const views = saved.map((view: any) => ({
            ...view,
            created: view.created ? new Date(view.created) : new Date(),
            lastUsed: view.lastUsed ? new Date(view.lastUsed) : undefined
          }));
          setSavedViews(views);
        }
      } catch (error) {
        console.error('Failed to load saved views:', error);
      }
    };

    loadSavedViews();
  }, []);

  // Save views to DataService
  const saveToStorage = useCallback(async (views: SavedView[]) => {
    try {
      const { getDataService } = await import('../../../services/DataService');
      const dataService = getDataService();
      await dataService.saveUserPreference(STORAGE_KEY, views);
    } catch (error) {
      console.error('Failed to save views:', error);
    }
  }, []);

  // Save current view - opens modal first, then saves
  const handleSaveViewClick = useCallback(() => {
    onShowSaveModal(true);
  }, [onShowSaveModal]);

  // Save current view - called from modal
  const handleSaveView = useCallback(async () => {
    if (!viewName.trim()) {
      alert('Please enter a view name');
      return;
    }

    // Check for duplicate names
    if (savedViews.some(view => view.name.toLowerCase() === viewName.trim().toLowerCase())) {
      alert('A view with this name already exists');
      return;
    }

    try {
      const newView: SavedView = {
        id: `view-${Date.now()}`,
        name: viewName.trim(),
        filters: { ...filters },
        selectedVariables: [...selectedVariables],
        created: new Date()
      };

      const updatedViews = [...savedViews, newView];
      setSavedViews(updatedViews);
      await saveToStorage(updatedViews);
      
      // Clear the name field and close modal
      onViewNameChange('');
      onShowSaveModal(false);
    } catch (error) {
      console.error('Failed to save view:', error);
      alert('Failed to save view');
    }
  }, [viewName, filters, selectedVariables, savedViews, saveToStorage, onViewNameChange, onShowSaveModal]);

  // Load a saved view from dropdown
  const handleLoadViewFromDropdown = useCallback(async (viewId: string) => {
    try {
      const view = savedViews.find(v => v.id === viewId);
      if (!view) return;

      // Update lastUsed timestamp
      const updatedViews = savedViews.map(v => 
        v.id === view.id ? { ...v, lastUsed: new Date() } : v
      );
      setSavedViews(updatedViews);
      await saveToStorage(updatedViews);
      
      onLoadView(view);
    } catch (error) {
      console.error('Failed to load view:', error);
      alert('Failed to load view');
    }
  }, [savedViews, onLoadView, saveToStorage]);

  // Delete a saved view
  const handleDeleteView = useCallback(async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from closing
    if (window.confirm('Are you sure you want to delete this saved view?')) {
      try {
        const updatedViews = savedViews.filter(v => v.id !== viewId);
        setSavedViews(updatedViews);
        await saveToStorage(updatedViews);
      } catch (error) {
        console.error('Failed to delete view:', error);
        alert('Failed to delete view');
      }
    }
  }, [savedViews, saveToStorage]);

  return (
    <>
      {/* Save View Button - Opens modal */}
      <button
        onClick={handleSaveViewClick}
        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <BookmarkIcon className="h-4 w-4 mr-2" />
        Save View
      </button>
      
      {/* Save View Modal */}
      {showSaveModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            onViewNameChange('');
            onShowSaveModal(false);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save View</h3>
            <TextField
              fullWidth
              size="small"
              label="View Name"
              placeholder="Enter view name..."
              value={viewName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onViewNameChange(e.target.value)}
              autoFocus
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' && viewName.trim()) {
                  handleSaveView();
                }
                if (e.key === 'Escape') {
                  onShowSaveModal(false);
                }
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  onViewNameChange('');
                  onShowSaveModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveView}
                disabled={!viewName.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Views Dropdown - Matches CustomReports exact styling */}
      {savedViews.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value=""
            onChange={(e: SelectChangeEvent<string>) => {
              const viewId = e.target.value;
              if (viewId) {
                handleLoadViewFromDropdown(viewId);
              }
            }}
            displayEmpty
            sx={{
              backgroundColor: 'white',
              borderRadius: '8px',
              fontSize: '0.875rem',
              border: '1px solid #d1d5db',
              '&:hover': {
                borderColor: '#6366f1',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
              },
              '&.Mui-focused': {
                backgroundColor: 'white',
                boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                borderColor: '#6366f1',
              }
            }}
          >
            <MenuItem value="" disabled>
              <em>📁 Saved Views</em>
            </MenuItem>
            {savedViews
              .sort((a, b) => {
                // Sort by lastUsed if available, otherwise by created date
                const aDate = a.lastUsed || a.created;
                const bDate = b.lastUsed || b.created;
                return bDate.getTime() - aDate.getTime();
              })
              .map((view) => (
              <MenuItem 
                key={view.id} 
                value={view.id} 
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div className="font-medium text-gray-900">{view.name}</div>
                  <div className="text-xs text-gray-500">
                    {view.filters.specialty && `${view.filters.specialty} • `}
                    {view.selectedVariables.length} variable{view.selectedVariables.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <IconButton 
                  size="small" 
                  onClick={(e: React.MouseEvent) => handleDeleteView(view.id, e)}
                  sx={{ 
                    color: '#ef4444',
                    '&:hover': { backgroundColor: '#fee2e2' }
                  }}
                >
                  <BookmarkSlashIcon className="h-3 w-3" />
                </IconButton>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </>
  );
};

