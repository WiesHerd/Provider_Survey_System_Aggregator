/**
 * Analytics Table Controls Component
 * 
 * Control buttons for the analytics table (export, freeze columns, etc.)
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface AnalyticsTableControlsProps {
  onExport: () => void;
  freezeLeftColumns: boolean;
  onToggleFreeze: () => void;
  isExporting?: boolean;
}

/**
 * AnalyticsTableControls component for table control buttons
 * 
 * @param onExport - Export callback function
 * @param freezeLeftColumns - Current freeze state
 * @param onToggleFreeze - Toggle freeze callback
 * @param isExporting - Export loading state
 */
export const AnalyticsTableControls: React.FC<AnalyticsTableControlsProps> = memo(({
  onExport,
  freezeLeftColumns,
  onToggleFreeze,
  isExporting = false
}) => {
  return (
    <div className="flex justify-end gap-2 mb-2">
      <button
        onClick={onToggleFreeze}
        className={`inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl ${
          freezeLeftColumns 
            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white focus:ring-green-500' 
            : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white focus:ring-gray-500'
        }`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {freezeLeftColumns ? 'Unfreeze Left Columns' : 'Freeze Left Columns'}
      </button>
      <button
        onClick={onExport}
        disabled={isExporting}
        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <DocumentTextIcon className="w-4 h-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Export Data'}
      </button>
    </div>
  );
});

AnalyticsTableControls.displayName = 'AnalyticsTableControls';
