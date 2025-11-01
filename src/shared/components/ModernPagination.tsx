import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

interface ModernPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/**
 * Modern pagination component with enterprise-grade styling
 * 
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of pages
 * @param pageSize - Number of rows per page
 * @param totalRows - Total number of rows
 * @param onPageChange - Callback when page changes
 * @param onPageSizeChange - Callback when page size changes
 * @param pageSizeOptions - Available page size options
 * @param className - Additional CSS classes
 */
export const ModernPagination: React.FC<ModernPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = ''
}) => {
  // Calculate display values
  // ENTERPRISE FIX: Prevent division by zero and handle edge cases
  // CRITICAL FIX: Handle "All" option where pageSize equals totalRows
  const safePageSize = pageSize > 0 ? pageSize : 10;
  const isShowingAll = pageSize >= totalRows && totalRows > 0;
  const startRow = totalRows > 0 ? (isShowingAll ? 1 : (currentPage - 1) * safePageSize + 1) : 0;
  const endRow = totalRows > 0 ? (isShowingAll ? totalRows : Math.min(currentPage * safePageSize, totalRows)) : 0;
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 10; // Increased from 7 to show more pages
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 5) {
        pages.push('...');
      }
      
      // Show more pages around current page
      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 4) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200 ${className}`}>
      {/* Left side - Page size selector and row info */}
      <div className="flex items-center space-x-4">
        {/* Page size selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <select
            value={pageSize === totalRows ? 'all' : pageSize}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'all') {
                // "All" option - show up to 500 rows for performance (HTML table limitation)
                // Note: AG Grid with virtualization can handle unlimited rows
                const maxRows = Math.min(totalRows, 500);
                onPageSizeChange(maxRows);
              } else {
                const newSize = Number(value);
                // CRITICAL FIX: Allow any reasonable page size, no artificial limits
                if (!isNaN(newSize) && newSize > 0) {
                  onPageSizeChange(newSize);
                } else {
                  console.warn('Invalid page size selected:', newSize);
                  // Reset to first option if invalid
                  onPageSizeChange(pageSizeOptions[0] || 10);
                }
              }
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
            aria-label="Rows per page"
            title="Select number of rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            {/* Add "All" option (capped at 500 for performance) */}
            <option value="all">All (max 500)</option>
          </select>
        </div>
        
        {/* Row info */}
        <span className="text-sm text-gray-600">
          {startRow.toLocaleString()} - {endRow.toLocaleString()} of {totalRows.toLocaleString()}
        </span>
      </div>

      {/* Right side - Pagination controls */}
      {/* CRITICAL FIX: Hide navigation buttons when showing all, but keep controls for page size change */}
      {!isShowingAll && totalPages > 1 && (
        <div className="flex items-center space-x-1">
          {/* First page button */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="inline-flex items-center justify-center w-8 h-8 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            title="First page"
          >
            <ChevronDoubleLeftIcon className="w-4 h-4" />
          </button>

          {/* Previous page button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center justify-center w-8 h-8 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            title="Previous page"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {pageNumbers.map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="px-2 py-1 text-sm text-gray-400">...</span>
                ) : (
                  <button
                    onClick={() => onPageChange(page as number)}
                    className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                      page === currentPage
                        ? 'bg-indigo-600 text-white border border-indigo-600 shadow-sm'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Next page button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center justify-center w-8 h-8 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            title="Next page"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>

          {/* Last page button */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center justify-center w-8 h-8 text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            title="Last page"
          >
            <ChevronDoubleRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ModernPagination;
