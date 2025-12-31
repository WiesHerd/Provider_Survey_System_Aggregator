/**
 * Filter Section Component
 * 
 * Wrapper for filter groups with collapsible advanced filters
 */

import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  filterCount?: number;
  onClearAll?: () => void;
  showClearAll?: boolean;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  children,
  defaultExpanded = true,
  collapsible = true,
  filterCount,
  onClearAll,
  showClearAll = false
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {filterCount !== undefined && (
              <p className="text-sm text-gray-600 mt-1">
                {filterCount} active filter{filterCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showClearAll && onClearAll && filterCount && filterCount > 0 && (
              <button
                onClick={onClearAll}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Clear all filters"
              >
                Clear All
              </button>
            )}
            {collapsible && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={expanded ? 'Collapse filters' : 'Expand filters'}
              >
                {expanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-6 py-6">
          {children}
        </div>
      )}
    </div>
  );
};

