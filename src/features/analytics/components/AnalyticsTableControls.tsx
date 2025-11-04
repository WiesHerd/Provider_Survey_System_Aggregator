/**
 * Analytics Table Controls Component
 * 
 * Control buttons for the analytics table (export, etc.)
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import { ArrowDownTrayIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface AnalyticsTableControlsProps {
  onExport: () => void;
  onFormatVariables: () => void;
  isExporting?: boolean;
}

/**
 * AnalyticsTableControls component for table control buttons
 * 
 * @param onExport - Export callback function
 * @param onFormatVariables - Format variables callback function
 * @param isExporting - Export loading state
 */
export const AnalyticsTableControls: React.FC<AnalyticsTableControlsProps> = memo(({
  onExport,
  onFormatVariables,
  isExporting = false
}) => {
  return (
    <div className="flex justify-end gap-2 mb-2">
      {/* Format Variables - Icon Button */}
      <div className="relative group">
        <button
          onClick={onFormatVariables}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
          aria-label="Format variables"
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </button>
        {/* Tooltip */}
        <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
            Format Variables
            <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        </div>
      </div>

      {/* Export Data - Icon Button */}
      <div className="relative group">
        <button
          onClick={onExport}
          disabled={isExporting}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isExporting ? "Exporting data" : "Export data"}
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
        </button>
        {/* Tooltip */}
        <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
            {isExporting ? 'Exporting...' : 'Export Data'}
            <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        </div>
      </div>
    </div>
  );
});

AnalyticsTableControls.displayName = 'AnalyticsTableControls';
