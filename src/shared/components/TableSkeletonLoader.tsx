/**
 * TableSkeletonLoader - Unified loading state for analysis tools
 *
 * Matches the Chart & Report Builder pattern: white card, status message,
 * and grey animated table-placeholder rows. Use anywhere a data table will
 * appear so all analysis screens (Benchmarking, Regional, Custom Blending,
 * Chart & Report Builder, FMV) load in the same way.
 */

import React from 'react';

export interface TableSkeletonLoaderProps {
  /** Accessible loading message (e.g. "Loading analytics data…") */
  message: string;
  /** Number of skeleton rows (default 6) */
  rowCount?: number;
  /** Number of skeleton columns per row (default 4). Supports 4 or 5. */
  columnCount?: number;
  /** Optional class for the outer card */
  className?: string;
}

const PULSE_CLASS = 'bg-gray-200 rounded animate-pulse';

export const TableSkeletonLoader: React.FC<TableSkeletonLoaderProps> = ({
  message,
  rowCount = 6,
  columnCount = 4,
  className = '',
}) => {
  const rows = Array.from({ length: rowCount }, (_, i) => i + 1);

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`.trim()}
    >
      <p
        className="mb-4 text-sm text-gray-500"
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        {rows.map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 last:border-b-0"
          >
            <div className={`h-4 w-4 ${PULSE_CLASS}`} />
            <div className={`h-4 flex-1 max-w-[200px] ${PULSE_CLASS}`} />
            <div className={`h-4 w-24 ${PULSE_CLASS}`} />
            <div className={`h-4 w-28 ${PULSE_CLASS}`} />
            {columnCount >= 5 && (
              <div className={`h-4 w-20 ${PULSE_CLASS}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSkeletonLoader;
