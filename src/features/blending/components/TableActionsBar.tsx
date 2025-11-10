/**
 * Table Actions Bar Component
 * 
 * Provides bulk selection actions directly above the data table
 * for immediate visual feedback when selections are made
 */

import React, { useState, useRef, useEffect } from 'react';
import { FunnelIcon, Squares2X2Icon, TrashIcon } from '@heroicons/react/24/outline';

interface TableActionsBarProps {
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectBySurvey?: (survey: string) => void;
  onSelectByYear?: (year: string) => void;
  availableSurveys?: string[];
  availableYears?: string[];
  selectedCount: number;
  totalCount: number;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const TableActionsBar: React.FC<TableActionsBarProps> = ({
  onSelectAll,
  onClearAll,
  onSelectBySurvey,
  onSelectByYear,
  availableSurveys = [],
  availableYears = [],
  selectedCount,
  totalCount,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleSelectBySurvey = (survey: string) => {
    onSelectBySurvey?.(survey);
    setDropdownOpen(false);
  };

  const handleSelectByYear = (year: string) => {
    onSelectByYear?.(year);
    setDropdownOpen(false);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
      {/* Left: Selection count */}
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount > 0 ? (
            <>
              <span className="text-indigo-600 font-semibold">{selectedCount}</span>
              {' '}of{' '}
              <span className="text-gray-900">{totalCount}</span>
              {' '}selected
            </>
          ) : (
            <span className="text-gray-500">No items selected</span>
          )}
        </span>
      </div>

      {/* Right: Bulk Actions */}
      <div className="flex items-center space-x-2">
        {/* Undo/Redo */}
        {(canUndo || canRedo) && (
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-2">
            {canUndo && onUndo && (
              <button
                onClick={onUndo}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            )}
            {canRedo && onRedo && (
              <button
                onClick={onRedo}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Bulk Selection Dropdown */}
        {(availableSurveys.length > 0 || availableYears.length > 0) && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-xl border border-gray-300 transition-colors shadow-sm"
              title="Bulk selection options"
            >
              <FunnelIcon className="w-3.5 h-3.5 mr-1.5" />
              Select by...
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="py-1">
                  {availableSurveys.length > 0 && onSelectBySurvey && (
                    <>
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                        Survey
                      </div>
                      {availableSurveys.slice(0, 8).map(survey => (
                        <button
                          key={survey}
                          onClick={() => handleSelectBySurvey(survey)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          {survey}
                        </button>
                      ))}
                    </>
                  )}
                  {availableYears.length > 0 && onSelectByYear && (
                    <>
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase border-t border-gray-100 border-b border-gray-100 mt-1">
                        Year
                      </div>
                      {availableYears.slice(0, 8).map(year => (
                        <button
                          key={year}
                          onClick={() => handleSelectByYear(year)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          {year}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Select All */}
        <button
          onClick={onSelectAll}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-xl border border-gray-300 transition-colors shadow-sm"
          title="Select all visible items (Ctrl+A)"
        >
          <Squares2X2Icon className="w-3.5 h-3.5 mr-1.5" />
          Select All
        </button>

        {/* Clear All */}
        {selectedCount > 0 && (
          <button
            onClick={onClearAll}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-white hover:bg-red-50 rounded-xl border border-red-300 transition-colors shadow-sm"
            title="Clear all selections (Esc)"
          >
            <TrashIcon className="w-3.5 h-3.5 mr-1.5" />
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};

