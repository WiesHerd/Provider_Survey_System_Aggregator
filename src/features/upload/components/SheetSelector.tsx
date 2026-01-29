/**
 * Sheet Selector Component
 * Clean, minimal sheet selection for Excel files with multiple worksheets
 * 
 * Design: Apple-inspired minimal interface with radio button cards
 */

import React, { memo, useState } from 'react';
import { DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

export interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
}

export interface SheetSelectorProps {
  sheets: SheetInfo[];
  selectedSheet: string;
  onSheetSelect: (sheetName: string) => void;
  disabled?: boolean;
}

/**
 * Sheet Selector component for Excel files with multiple sheets
 * Clean, minimal design with radio button cards
 */
export const SheetSelector: React.FC<SheetSelectorProps> = memo(({
  sheets,
  selectedSheet,
  onSheetSelect,
  disabled = false
}) => {
  if (sheets.length <= 1) {
    return null; // Don't show selector if only one sheet
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-gray-900">
          Select worksheet
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          This Excel file contains {sheets.length} worksheets. Choose which one to upload.
        </p>
      </div>

      {/* Sheet Options */}
      <div className="space-y-2">
        {sheets.map((sheet) => {
          const isSelected = sheet.name === selectedSheet;
          
          return (
            <button
              key={sheet.name}
              onClick={() => !disabled && onSheetSelect(sheet.name)}
              disabled={disabled}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                ${isSelected
                  ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selection Indicator */}
              <div className="flex-shrink-0">
                {isSelected ? (
                  <CheckCircleSolid className="h-5 w-5 text-indigo-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
              </div>

              {/* Sheet Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-0.5">
                  <DocumentTextIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {sheet.name}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  {sheet.rowCount.toLocaleString()} rows · {sheet.columnCount} columns
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

SheetSelector.displayName = 'SheetSelector';

