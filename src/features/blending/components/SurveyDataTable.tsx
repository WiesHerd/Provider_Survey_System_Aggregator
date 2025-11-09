/**
 * Survey Data Table Component
 * 
 * Handles the survey data table with selection, sorting, and pagination
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ModernPagination } from '../../../shared/components/ModernPagination';
import { EnterpriseLoadingSpinner } from '../../../shared/components/EnterpriseLoadingSpinner';
import { EmptyState } from '../../mapping/components/shared/EmptyState';
import { BoltIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import { formatSpecialtyForDisplay, formatRegionForDisplay, capitalizeWords } from '../../../shared/utils/formatters';

interface SurveyDataTableProps {
  data: any[];
  selectedRows: number[];
  onRowSelectionChange: (rows: number[]) => void;
  isLoading: boolean;
  progress: number;
}

export const SurveyDataTable: React.FC<SurveyDataTableProps> = ({
  data,
  selectedRows,
  onRowSelectionChange,
  isLoading,
  progress
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Toggle state for showing all percentiles vs P50 only
  const [showAllPercentiles, setShowAllPercentiles] = useState(false);
  
  // Column resizing state
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 50,
    specialty: 200,
    survey: 120,
    year: 80,
    region: 150,
    provider: 120,
    tcc_p25: 90,
    tcc_p50: 90,
    tcc_p75: 90,
    tcc_p90: 90,
    wrvu_p25: 90,
    wrvu_p50: 90,
    wrvu_p75: 90,
    wrvu_p90: 90,
    cf_p25: 80,
    cf_p50: 80,
    cf_p75: 80,
    cf_p90: 80
  });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Paginated data for better performance
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setItemsPerPage(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  // Column resizing handlers
  const handleMouseDown = useCallback((column: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(column);
    
    const startX = e.clientX;
    const startWidth = columnWidths[column as keyof typeof columnWidths];
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX); // Minimum width of 50px
      setColumnWidths(prev => ({
        ...prev,
        [column]: newWidth
      }));
    };
    
    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  // Sorting handlers
  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => {
      if (!prev || prev.key !== column) {
        return { key: column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: column, direction: 'desc' };
      }
      return null; // Clear sorting
    });
  }, []);

  // Handle row selection
  const handleRowClick = useCallback((actualIndex: number) => {
    if (selectedRows.includes(actualIndex)) {
      onRowSelectionChange(selectedRows.filter(i => i !== actualIndex));
    } else {
      onRowSelectionChange([...selectedRows, actualIndex]);
    }
  }, [selectedRows, onRowSelectionChange]);

  // Handle checkbox selection
  const handleCheckboxChange = useCallback((actualIndex: number, checked: boolean) => {
    if (checked) {
      onRowSelectionChange([...selectedRows, actualIndex]);
    } else {
      onRowSelectionChange(selectedRows.filter(i => i !== actualIndex));
    }
  }, [selectedRows, onRowSelectionChange]);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      onRowSelectionChange(data.map((_, index) => index));
    } else {
      onRowSelectionChange([]);
    }
  }, [data, onRowSelectionChange]);

  if (isLoading) {
    return (
      <EnterpriseLoadingSpinner
        message="Loading survey data..."
        recordCount="auto"
        data={data}
        progress={progress}
        variant="inline"
        loading={isLoading}
      />
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-b-xl">
        <EmptyState
          icon={<BoltIcon className="h-6 w-6 text-gray-500" />}
          title="No Survey Data Found"
          message="Try adjusting your filters or check if data is loaded. Upload surveys first to create blends."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Survey Data ({data.length} records)
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-500">
                {selectedRows.length} selected
              </span>
              <span className="text-xs text-gray-400">
                Use checkboxes to select rows
              </span>
            </div>
          </div>
          <div className="relative group">
            <button
              onClick={() => setShowAllPercentiles(!showAllPercentiles)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 flex-shrink-0"
              aria-label={showAllPercentiles ? "Show only P50 percentiles" : "Show all percentiles (P25, P50, P75, P90)"}
            >
              {showAllPercentiles ? (
                <ArrowsPointingInIcon className="h-4 w-4" />
              ) : (
                <ArrowsPointingOutIcon className="h-4 w-4" />
              )}
            </button>
            {/* Tooltip */}
            <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                {showAllPercentiles ? "Show only P50 percentiles" : "Show all percentiles (P25, P50, P75, P90)"}
                <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-b-xl">
        <div className="overflow-x-auto max-w-full overflow-y-visible">
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative" style={{ width: `${columnWidths.checkbox}px` }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded accent-purple-600"
                    aria-label="Select all rows"
                    title="Select all rows"
                  />
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                  style={{ width: `${columnWidths.specialty}px` }}
                  onClick={() => handleSort('surveySpecialty')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span>Specialty</span>
                      {sortConfig?.key === 'surveySpecialty' && (
                        <span className="text-purple-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('specialty', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                  style={{ width: `${columnWidths.survey}px` }}
                  onClick={() => handleSort('surveySource')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span>Survey</span>
                      {sortConfig?.key === 'surveySource' && (
                        <span className="text-purple-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('survey', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                  style={{ width: `${columnWidths.year}px` }}
                  onClick={() => handleSort('surveyYear')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span>Year</span>
                      {sortConfig?.key === 'surveyYear' && (
                        <span className="text-purple-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('year', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                  style={{ width: `${columnWidths.region}px` }}
                  onClick={() => handleSort('geographicRegion')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span>Region</span>
                      {sortConfig?.key === 'geographicRegion' && (
                        <span className="text-purple-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('region', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none border-r-2 border-gray-300" 
                  style={{ width: `${columnWidths.provider}px` }}
                  onClick={() => handleSort('providerType')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span>Provider</span>
                      {sortConfig?.key === 'providerType' && (
                        <span className="text-purple-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('provider', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                {/* TCC Percentiles */}
                {showAllPercentiles && (
                  <th 
                    className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                    style={{ width: `${columnWidths.tcc_p25}px` }}
                    onClick={() => handleSort('tcc_p25')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <span>TCC P25</span>
                        {sortConfig?.key === 'tcc_p25' && (
                          <span className="text-purple-600">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div 
                        className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                        onMouseDown={(e) => handleMouseDown('tcc_p25', e)}
                        title="Resize column"
                      />
                    </div>
                  </th>
                )}
                <th 
                  className={`px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none ${showAllPercentiles ? '' : 'border-r-2 border-gray-300'}`}
                  style={{ width: `${columnWidths.tcc_p50}px` }}
                  onClick={() => handleSort('tcc_p50')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span>TCC P50</span>
                      {sortConfig?.key === 'tcc_p50' && (
                        <span className="text-purple-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('tcc_p50', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                {showAllPercentiles && (
                  <>
                    <th 
                      className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: `${columnWidths.tcc_p75}px` }}
                      onClick={() => handleSort('tcc_p75')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span>TCC P75</span>
                          {sortConfig?.key === 'tcc_p75' && (
                            <span className="text-purple-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                        <div 
                          className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                          onMouseDown={(e) => handleMouseDown('tcc_p75', e)}
                          title="Resize column"
                        />
                      </div>
                    </th>
                    <th 
                      className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none border-r-2 border-gray-300" 
                      style={{ width: `${columnWidths.tcc_p90}px` }}
                      onClick={() => handleSort('tcc_p90')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span>TCC P90</span>
                          {sortConfig?.key === 'tcc_p90' && (
                            <span className="text-purple-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                        <div 
                          className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                          onMouseDown={(e) => handleMouseDown('tcc_p90', e)}
                          title="Resize column"
                        />
                      </div>
                    </th>
                  </>
                )}
                {/* wRVU Percentiles */}
                {showAllPercentiles && (
                  <th 
                    className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                    style={{ width: `${columnWidths.wrvu_p25}px` }}
                    onClick={() => handleSort('wrvu_p25')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <span>wRVU P25</span>
                        {sortConfig?.key === 'wrvu_p25' && (
                          <span className="text-purple-600">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div 
                        className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                        onMouseDown={(e) => handleMouseDown('wrvu_p25', e)}
                        title="Resize column"
                      />
                    </div>
                  </th>
                )}
                <th 
                  className={`px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none ${showAllPercentiles ? '' : 'border-r-2 border-gray-300'}`}
                  style={{ width: `${columnWidths.wrvu_p50}px` }}
                  onClick={() => handleSort('wrvu_p50')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span>wRVU P50</span>
                      {sortConfig?.key === 'wrvu_p50' && (
                        <span className="text-purple-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('wrvu_p50', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                {showAllPercentiles && (
                  <>
                    <th 
                      className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: `${columnWidths.wrvu_p75}px` }}
                      onClick={() => handleSort('wrvu_p75')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span>wRVU P75</span>
                          {sortConfig?.key === 'wrvu_p75' && (
                            <span className="text-purple-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                        <div 
                          className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                          onMouseDown={(e) => handleMouseDown('wrvu_p75', e)}
                          title="Resize column"
                        />
                      </div>
                    </th>
                    <th 
                      className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none border-r-2 border-gray-300" 
                      style={{ width: `${columnWidths.wrvu_p90}px` }}
                      onClick={() => handleSort('wrvu_p90')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span>wRVU P90</span>
                          {sortConfig?.key === 'wrvu_p90' && (
                            <span className="text-purple-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                        <div 
                          className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                          onMouseDown={(e) => handleMouseDown('wrvu_p90', e)}
                          title="Resize column"
                        />
                      </div>
                    </th>
                  </>
                )}
                {/* CF Percentiles */}
                {showAllPercentiles && (
                  <th 
                    className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                    style={{ width: `${columnWidths.cf_p25}px` }}
                    onClick={() => handleSort('cf_p25')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <span>CF P25</span>
                        {sortConfig?.key === 'cf_p25' && (
                          <span className="text-purple-600">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div 
                        className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                        onMouseDown={(e) => handleMouseDown('cf_p25', e)}
                        title="Resize column"
                      />
                    </div>
                  </th>
                )}
                <th 
                  className={`px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none ${showAllPercentiles ? '' : 'border-r-2 border-gray-300'}`}
                  style={{ width: `${columnWidths.cf_p50}px` }}
                  onClick={() => handleSort('cf_p50')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span>CF P50</span>
                      {sortConfig?.key === 'cf_p50' && (
                        <span className="text-purple-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('cf_p50', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                {showAllPercentiles && (
                  <>
                    <th 
                      className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: `${columnWidths.cf_p75}px` }}
                      onClick={() => handleSort('cf_p75')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span>CF P75</span>
                          {sortConfig?.key === 'cf_p75' && (
                            <span className="text-purple-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                        <div 
                          className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                          onMouseDown={(e) => handleMouseDown('cf_p75', e)}
                          title="Resize column"
                        />
                      </div>
                    </th>
                    <th 
                      className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                      style={{ width: `${columnWidths.cf_p90}px` }}
                      onClick={() => handleSort('cf_p90')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span>CF P90</span>
                          {sortConfig?.key === 'cf_p90' && (
                            <span className="text-purple-600">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                        <div 
                          className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                          onMouseDown={(e) => handleMouseDown('cf_p90', e)}
                          title="Resize column"
                        />
                      </div>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 border-t border-gray-50">
              {paginatedData.map((row, index) => {
                const actualIndex = (currentPage - 1) * itemsPerPage + index;
                return (
                <tr 
                  key={index}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    selectedRows.includes(actualIndex) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleRowClick(actualIndex)}
                >
                  <td className="px-2 py-3 whitespace-nowrap" style={{ width: `${columnWidths.checkbox}px` }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(actualIndex)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCheckboxChange(actualIndex, e.target.checked);
                      }}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded accent-purple-600"
                      aria-label={`Select row ${index + 1}`}
                      title={`Select row ${index + 1}`}
                    />
                  </td>
                  <td className="px-2 py-3 text-sm font-medium text-gray-900" style={{ width: `${columnWidths.specialty}px` }}>
                    <div className="truncate" title={row.surveySpecialty}>
                      {formatSpecialtyForDisplay(row.surveySpecialty)}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-sm text-gray-500" style={{ width: `${columnWidths.survey}px` }}>
                    <div className="truncate" title={row.surveySource}>
                      {row.surveySource}
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500" style={{ width: `${columnWidths.year}px` }}>
                    {row.surveyYear}
                  </td>
                  <td className="px-2 py-3 text-sm text-gray-500" style={{ width: `${columnWidths.region}px` }}>
                    <div className="truncate" title={row.geographicRegion}>
                      {formatRegionForDisplay(row.geographicRegion)}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-sm text-gray-500 border-r-2 border-gray-300" style={{ width: `${columnWidths.provider}px` }}>
                    <div className="truncate" title={row.providerType}>
                      {capitalizeWords(row.providerType || '')}
                    </div>
                  </td>
                  {/* TCC Percentiles */}
                  {showAllPercentiles && (
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.tcc_p25}px` }}>
                      {row.tcc_p25 ? parseFloat(row.tcc_p25.toString()).toLocaleString() : '***'}
                    </td>
                  )}
                  <td className={`px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium ${showAllPercentiles ? '' : 'border-r-2 border-gray-300'}`} style={{ width: `${columnWidths.tcc_p50}px` }}>
                    {row.tcc_p50 ? parseFloat(row.tcc_p50.toString()).toLocaleString() : '***'}
                  </td>
                  {showAllPercentiles && (
                    <>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.tcc_p75}px` }}>
                        {row.tcc_p75 ? parseFloat(row.tcc_p75.toString()).toLocaleString() : '***'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right border-r-2 border-gray-300" style={{ width: `${columnWidths.tcc_p90}px` }}>
                        {row.tcc_p90 ? parseFloat(row.tcc_p90.toString()).toLocaleString() : '***'}
                      </td>
                    </>
                  )}
                  {/* wRVU Percentiles */}
                  {showAllPercentiles && (
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.wrvu_p25}px` }}>
                      {row.wrvu_p25 ? parseFloat(row.wrvu_p25.toString()).toLocaleString() : '***'}
                    </td>
                  )}
                  <td className={`px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium ${showAllPercentiles ? '' : 'border-r-2 border-gray-300'}`} style={{ width: `${columnWidths.wrvu_p50}px` }}>
                    {row.wrvu_p50 ? parseFloat(row.wrvu_p50.toString()).toLocaleString() : '***'}
                  </td>
                  {showAllPercentiles && (
                    <>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.wrvu_p75}px` }}>
                        {row.wrvu_p75 ? parseFloat(row.wrvu_p75.toString()).toLocaleString() : '***'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right border-r-2 border-gray-300" style={{ width: `${columnWidths.wrvu_p90}px` }}>
                        {row.wrvu_p90 ? parseFloat(row.wrvu_p90.toString()).toLocaleString() : '***'}
                      </td>
                    </>
                  )}
                  {/* CF Percentiles */}
                  {showAllPercentiles && (
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.cf_p25}px` }}>
                      {row.cf_p25 ? parseFloat(row.cf_p25.toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '***'}
                    </td>
                  )}
                  <td className={`px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium ${showAllPercentiles ? '' : 'border-r-2 border-gray-300'}`} style={{ width: `${columnWidths.cf_p50}px` }}>
                    {row.cf_p50 ? parseFloat(row.cf_p50.toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '***'}
                  </td>
                  {showAllPercentiles && (
                    <>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.cf_p75}px` }}>
                        {row.cf_p75 ? parseFloat(row.cf_p75.toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '***'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.cf_p90}px` }}>
                        {row.cf_p90 ? parseFloat(row.cf_p90.toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '***'}
                      </td>
                    </>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
          
          {/* Modern Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid #e5e7eb',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              marginTop: '-1px', // Ensure seamless connection
              marginLeft: '8px', // Match table left margin
              marginRight: '8px', // Match table right margin
              width: 'calc(100% - 16px)', // Account for left and right margins
              boxSizing: 'border-box' // Include borders in width calculation
            }}>
              <ModernPagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={itemsPerPage}
                totalRows={data.length}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
