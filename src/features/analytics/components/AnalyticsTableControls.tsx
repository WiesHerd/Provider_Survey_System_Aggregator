/**
 * Analytics Table Controls Component
 * 
 * Control buttons for the analytics table (export, etc.)
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import { DocumentTextIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

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
      <button
        onClick={onFormatVariables}
        className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white focus:ring-green-500"
      >
        <Cog6ToothIcon className="w-4 h-4 mr-2" />
        Format Variables
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
