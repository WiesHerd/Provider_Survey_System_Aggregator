/**
 * ClearFilterButton Component
 * 
 * Reusable clear filter button with funnel icon and X overlay
 * Used consistently across all filter sections in the application
 */

import React from 'react';

interface ClearFilterButtonProps {
  /** Callback function to execute when button is clicked */
  onClick: () => void;
  /** Whether filters are currently active (determines if X overlay shows) */
  hasActiveFilters?: boolean;
  /** Optional custom tooltip text (defaults to "Clear Filters") */
  tooltipText?: string;
  /** Optional aria-label (defaults to "Clear all filters") */
  ariaLabel?: string;
}

/**
 * ClearFilterButton - Enterprise-grade reusable filter clear button
 * 
 * Features:
 * - Funnel icon with X overlay when filters are active
 * - Hover tooltip
 * - Consistent styling across the application
 * - Accessible with proper ARIA labels
 */
export const ClearFilterButton: React.FC<ClearFilterButtonProps> = ({
  onClick,
  hasActiveFilters = true,
  tooltipText = 'Clear Filters',
  ariaLabel = 'Clear all filters'
}) => {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full border border-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
        aria-label={ariaLabel}
      >
        <div className="relative w-4 h-4">
          {/* Funnel Icon */}
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
          </svg>
          {/* X Overlay - Only show when filters are active */}
          {hasActiveFilters && (
            <svg className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </button>
      {/* Tooltip */}
      <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
          {tooltipText}
          <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      </div>
    </div>
  );
};

