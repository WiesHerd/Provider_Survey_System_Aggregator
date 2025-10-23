/**
 * Survey Data Table Component
 * 
 * Handles the survey data table with selection, sorting, and pagination
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ModernPagination } from '../../../shared/components/ModernPagination';
import { UnifiedLoadingSpinner } from '../../../shared/components/UnifiedLoadingSpinner';
import { EmptyState } from '../../mapping/components/shared/EmptyState';
import { BoltIcon } from '@heroicons/react/24/outline';
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
  
  // Column resizing state
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 50,
    specialty: 200,
    survey: 120,
    year: 80,
    region: 150,
    provider: 120,
    tcc: 120,
    wrvu: 120,
    cf: 100,
    records: 80
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
      <UnifiedLoadingSpinner
        message="Loading survey data..."
        recordCount={data.length}
        progress={progress}
        showProgress={true}
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
          <h3 className="text-sm font-medium text-gray-900">
            Survey Data ({data.length} records)
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {selectedRows.length} selected
            </span>
            <span className="text-xs text-gray-400">
              Use checkboxes to select rows
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-b-xl">
        <div className="overflow-x-auto max-w-full overflow-y-visible">
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative" style={{ width: `${columnWidths.checkbox}px` }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
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
                      className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                      className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                      className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                      className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('region', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
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
                      className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('provider', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                  style={{ width: `${columnWidths.tcc}px` }}
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
                      className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('tcc', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                  style={{ width: `${columnWidths.wrvu}px` }}
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
                      className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('wrvu', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                  style={{ width: `${columnWidths.cf}px` }}
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
                      className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('cf', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                  style={{ width: `${columnWidths.records}px` }}
                  onClick={() => handleSort('tcc_n_orgs')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span>Records</span>
                      {sortConfig?.key === 'tcc_n_orgs' && (
                        <span className="text-purple-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown('records', e)}
                      title="Resize column"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
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
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
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
                  <td className="px-2 py-3 text-sm text-gray-500" style={{ width: `${columnWidths.provider}px` }}>
                    <div className="truncate" title={row.providerType}>
                      {capitalizeWords(row.providerType || '')}
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.tcc}px` }}>
                    {row.tcc_p50 ? `$${parseFloat(row.tcc_p50.toString()).toLocaleString()}` : 'N/A'}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.wrvu}px` }}>
                    {row.wrvu_p50 ? parseFloat(row.wrvu_p50.toString()).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.cf}px` }}>
                    {row.cf_p50 ? `$${parseFloat(row.cf_p50.toString()).toLocaleString()}` : 'N/A'}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.records}px` }}>
                    {(row.tcc_n_orgs || 0).toLocaleString()}
                  </td>
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
