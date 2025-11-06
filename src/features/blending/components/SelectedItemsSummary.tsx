/**
 * Selected Items Summary Component
 * 
 * Shows a sticky summary bar with selected items count and quick actions
 * Always visible when items are selected
 */

import React from 'react';
import { XMarkIcon, CheckCircleIcon, TrashIcon, ArrowPathIcon, FunnelIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';

interface SelectedItemsSummaryProps {
  selectedRows: number[];
  filteredSurveyData: any[];
  onClearAll: () => void;
  onSelectAll: () => void;
  onRemoveItem: (index: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSelectBySurvey?: (survey: string) => void;
  onSelectByYear?: (year: string) => void;
  onSelectByRegion?: (region: string) => void;
  availableSurveys?: string[];
  availableYears?: string[];
  availableRegions?: string[];
}

export const SelectedItemsSummary: React.FC<SelectedItemsSummaryProps> = ({
  selectedRows,
  filteredSurveyData,
  onClearAll,
  onSelectAll,
  onRemoveItem,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onSelectBySurvey,
  onSelectByYear,
  onSelectByRegion,
  availableSurveys = [],
  availableYears = [],
  availableRegions = []
}) => {
  if (selectedRows.length === 0) {
    return null;
  }

  const selectedItems = selectedRows
    .map(index => filteredSurveyData[index])
    .filter(Boolean)
    .slice(0, 5); // Show first 5 for preview

  const totalRecords = selectedRows.reduce((sum, index) => {
    const row = filteredSurveyData[index];
    return sum + (row?.tcc_n_orgs || row?.n_orgs || 0);
  }, 0);

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm mb-6">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Selection Info */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-900">
                {selectedRows.length} {selectedRows.length === 1 ? 'item' : 'items'} selected
              </span>
              {totalRecords > 0 && (
                <span className="text-xs text-gray-500">
                  • {totalRecords.toLocaleString()} total records
                </span>
              )}
            </div>

            {/* Selected Items Preview */}
            {selectedItems.length > 0 && (
              <div className="hidden md:flex items-center space-x-2 flex-1 min-w-0 overflow-hidden">
                <span className="text-xs text-gray-500">Preview:</span>
                {selectedItems.map((item, idx) => {
                  const actualIndex = selectedRows[idx];
                  return (
                    <div
                      key={actualIndex}
                      className="flex items-center space-x-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs font-medium max-w-[200px]"
                    >
                      <span className="truncate">
                        {formatSpecialtyForDisplay(item.surveySpecialty)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(actualIndex);
                        }}
                        className="ml-1 hover:bg-indigo-100 rounded p-0.5 transition-colors"
                        aria-label={`Remove ${item.surveySpecialty}`}
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {selectedRows.length > 5 && (
                  <span className="text-xs text-gray-500">
                    +{selectedRows.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center space-x-2">
            {/* Undo/Redo */}
            {(canUndo || canRedo) && (
              <div className="flex items-center space-x-1 border-r border-gray-200 pr-2 mr-2">
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
            {(availableSurveys.length > 0 || availableYears.length > 0 || availableRegions.length > 0) && (
              <div className="relative group">
                <button
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-300 transition-colors"
                  title="Bulk selection options"
                >
                  <FunnelIcon className="w-3.5 h-3.5 mr-1.5" />
                  Select by...
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <div className="py-1">
                    {availableSurveys.length > 0 && onSelectBySurvey && (
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                        Survey
                      </div>
                    )}
                    {availableSurveys.slice(0, 5).map(survey => (
                      <button
                        key={survey}
                        onClick={() => onSelectBySurvey?.(survey)}
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {survey}
                      </button>
                    ))}
                    {availableYears.length > 0 && onSelectByYear && (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase border-t border-gray-100 mt-1">
                          Year
                        </div>
                        {availableYears.slice(0, 5).map(year => (
                          <button
                            key={year}
                            onClick={() => onSelectByYear?.(year)}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            {year}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Select All */}
            <button
              onClick={onSelectAll}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-300 transition-colors"
              title="Select all visible items (Ctrl+A)"
            >
              <Squares2X2Icon className="w-3.5 h-3.5 mr-1.5" />
              Select All
            </button>

            {/* Clear All */}
            <button
              onClick={onClearAll}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-300 transition-colors"
              title="Clear all selections (Esc)"
            >
              <TrashIcon className="w-3.5 h-3.5 mr-1.5" />
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

