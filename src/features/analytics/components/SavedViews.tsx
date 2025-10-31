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
  IconButton
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
  // For the name input field - matches CustomReports pattern
  viewName: string;
  onViewNameChange: (name: string) => void;
}

const STORAGE_KEY = 'analytics_saved_views';

export const SavedViews: React.FC<SavedViewsProps> = ({
  filters,
  selectedVariables,
  onLoadView,
  viewName,
  onViewNameChange
}) => {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  // Load saved views from localStorage
  useEffect(() => {
    const loadSavedViews = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const views = parsed.map((view: any) => ({
            ...view,
            created: new Date(view.created),
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

  // Save views to localStorage
  const saveToStorage = useCallback((views: SavedView[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
    } catch (error) {
      console.error('Failed to save views:', error);
    }
  }, []);

  // Save current view - matches CustomReports pattern
  const handleSaveView = useCallback(() => {
    if (!viewName.trim()) {
      return; // Button will be disabled if no name
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
      saveToStorage(updatedViews);
      
      // Clear the name field - matches CustomReports pattern
      onViewNameChange('');
    } catch (error) {
      console.error('Failed to save view:', error);
      alert('Failed to save view');
    }
  }, [viewName, filters, selectedVariables, savedViews, saveToStorage, onViewNameChange]);

  // Load a saved view from dropdown
  const handleLoadViewFromDropdown = useCallback((viewId: string) => {
    try {
      const view = savedViews.find(v => v.id === viewId);
      if (!view) return;

      // Update lastUsed timestamp
      const updatedViews = savedViews.map(v => 
        v.id === view.id ? { ...v, lastUsed: new Date() } : v
      );
      setSavedViews(updatedViews);
      saveToStorage(updatedViews);
      
      onLoadView(view);
    } catch (error) {
      console.error('Failed to load view:', error);
      alert('Failed to load view');
    }
  }, [savedViews, onLoadView, saveToStorage]);

  // Delete a saved view
  const handleDeleteView = useCallback((viewId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from closing
    if (window.confirm('Are you sure you want to delete this saved view?')) {
      try {
        const updatedViews = savedViews.filter(v => v.id !== viewId);
        setSavedViews(updatedViews);
        saveToStorage(updatedViews);
      } catch (error) {
        console.error('Failed to delete view:', error);
        alert('Failed to delete view');
      }
    }
  }, [savedViews, saveToStorage]);

  return (
    <>
      {/* Save View Button - Matches CustomReports exact styling */}
      <button
        onClick={handleSaveView}
        disabled={!viewName.trim()}
        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <BookmarkIcon className="h-4 w-4 mr-2" />
        Save View
      </button>

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

