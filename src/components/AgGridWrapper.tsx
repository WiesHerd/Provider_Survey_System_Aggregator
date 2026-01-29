import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '../styles/ag-grid-custom.css';
import { ModernPagination } from '../shared/components/ModernPagination';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface AgGridWrapperProps {
  rowData: any[];
  columnDefs: any[];
  onGridReady?: (params: any) => void;
  pagination?: boolean;
  paginationPageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  domLayout?: 'normal' | 'autoHeight' | 'print';
  suppressRowHoverHighlight?: boolean;
  rowHeight?: number;
  suppressColumnVirtualisation?: boolean;
  suppressHorizontalScroll?: boolean;
  className?: string;
  defaultColDef?: any;
  suppressRowClickSelection?: boolean;
  rowSelection?: 'single' | 'multiple';
  suppressRowDeselection?: boolean;
  components?: any;
}

const AgGridWrapper: React.FC<AgGridWrapperProps> = ({
  rowData,
  columnDefs,
  onGridReady,
  pagination = true,
  paginationPageSize = 25,
  onPageChange,
  onPageSizeChange,
  domLayout = 'autoHeight',
  suppressRowHoverHighlight = true,
  rowHeight = 48,
  suppressColumnVirtualisation = false,
  suppressHorizontalScroll = false,
  className = 'ag-theme-alpine',
  defaultColDef,
  suppressRowClickSelection,
  rowSelection,
  suppressRowDeselection,
  components
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(paginationPageSize);
  const [gridApi, setGridApi] = useState<any>(null);
  const [totalRows, setTotalRows] = useState(rowData?.length || 0);

  // Update page size when external paginationPageSize changes
  useEffect(() => {
    setPageSize(paginationPageSize);
  }, [paginationPageSize]);

  // Handle grid ready
  const handleGridReady = useCallback((params: any) => {
    setGridApi(params.api);
    setTotalRows(rowData?.length || 0);
    onGridReady?.(params);
  }, [onGridReady, rowData]);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    if (!pagination || !rowData) return rowData;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return rowData.slice(startIndex, endIndex);
  }, [rowData, currentPage, pageSize, pagination]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    onPageChange?.(page);
  }, [onPageChange]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    onPageSizeChange?.(newPageSize);
  }, [onPageSizeChange]);

  // Update total rows when data changes
  useEffect(() => {
    setTotalRows(rowData?.length || 0);
    // Force grid to refresh when data changes
    if (gridApi && rowData) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        if (gridApi.setRowData) {
          gridApi.setRowData(paginatedData || rowData);
        }
      }, 0);
    }
  }, [rowData, gridApi, paginatedData]);

  // Handle page size changes for autoHeight layout
  useEffect(() => {
    if (domLayout === 'autoHeight' && gridApi && paginatedData.length > 0) {
      // Force AG Grid to recalculate its height after page size changes
      setTimeout(() => {
        try {
          gridApi.redrawRows();
          gridApi.sizeColumnsToFit();
        } catch (error) {
          console.log('Grid height recalculation failed:', error);
        }
      }, 100);
    }
  }, [domLayout, gridApi, paginatedData.length, pageSize]);

  // Debug logging
  useEffect(() => {
    console.log('AgGridWrapper received:', { 
      rowDataLength: rowData?.length, 
      columnDefsLength: columnDefs?.length,
      pagination,
      totalRows
    });
  }, [rowData, columnDefs, pagination, totalRows]);

  // Calculate total pages
  const totalPages = Math.ceil(totalRows / pageSize);

  return (
    <div className="flex flex-col h-full w-full">
      <style>
        {`
          .ag-theme-quartz {
            border-radius: ${pagination && totalRows > 0 ? '8px 8px 0 0' : '8px'} !important;
            overflow: ${domLayout === 'autoHeight' ? 'visible' : 'hidden'} !important;
          }
          .ag-theme-quartz .ag-root-wrapper {
            border-radius: ${pagination && totalRows > 0 ? '8px 8px 0 0' : '8px'} !important;
            overflow: ${domLayout === 'autoHeight' ? 'visible' : 'hidden'} !important;
          }
          .ag-theme-quartz .ag-root {
            border-radius: ${pagination && totalRows > 0 ? '8px 8px 0 0' : '8px'} !important;
            overflow: ${domLayout === 'autoHeight' ? 'visible' : 'hidden'} !important;
          }
          
          /* Remove bold from specialty column */
          .ag-theme-quartz .ag-cell[col-id="specialty"],
          .ag-theme-quartz .ag-header-cell[col-id="specialty"] {
            font-weight: normal !important;
          }
          
          /* Remove bold from all cells and headers */
          .ag-theme-quartz .ag-cell,
          .ag-theme-quartz .ag-header-cell {
            font-weight: normal !important;
          }
          
          /* Remove bold from header text specifically */
          .ag-theme-quartz .ag-header-cell-text {
            font-weight: normal !important;
          }
          
          /* Remove bold from all header elements */
          .ag-theme-quartz .ag-header-cell * {
            font-weight: normal !important;
          }
          
          /* Completely hide AG Grid's built-in pagination panel */
          .ag-theme-quartz .ag-paging-panel {
            display: none !important;
          }
          
          .ag-theme-quartz .ag-paging-row-summary-panel,
          .ag-theme-quartz .ag-paging-page-summary-panel {
            display: none !important;
          }
        `}
      </style>
              <div 
        className={`ag-theme-quartz ${className} w-full`} 
        style={{ 
          // COMPLETELY NEW MODERN DESIGN - matches the image exactly
          borderRadius: pagination && totalRows > 0 ? '8px 8px 0 0' : '8px',
          overflow: domLayout === 'autoHeight' ? 'visible' : 'hidden',
          border: '1px solid #e5e7eb',
          borderBottom: pagination && totalRows > 0 ? 'none' : '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          height: domLayout === 'autoHeight' ? 'auto' : '500px', // Dynamic height for autoHeight, fixed for normal
          margin: '0 8px', // Add horizontal margin
          width: 'calc(100% - 16px)', // Account for margins
          
          // QUARTZ THEME COLUMN SEPARATORS - Built-in support
          '--ag-borders': 'solid 1px',
          '--ag-border-color': '#e2e8f0',
          '--ag-header-column-separator-display': 'block',
          '--ag-header-column-separator-height': '100%',
          '--ag-header-column-separator-width': '1px',
          '--ag-header-column-separator-color': '#cbd5e1',
          
          // Override AG Grid's default border radius
          '--ag-border-radius': '0px',
          '--ag-cell-border-radius': '0px',
          
          // Header styling - EXACTLY like the image
          '--ag-header-height': '44px',
          '--ag-header-background-color': '#f1f5f9',
          '--ag-header-foreground-color': '#1e293b',
          '--ag-header-cell-hover-background-color': '#e2e8f0',
          '--ag-header-cell-horizontal-border': 'solid #cbd5e1',
          
          // Grid lines - much more subtle like the image
          '--ag-cell-horizontal-border': 'solid #f3f4f6',
          '--ag-row-border-color': '#f3f4f6',
          
          // Typography - smaller and cleaner
          '--ag-font-size': '12px',
          '--ag-font-family': '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          
          // Row colors - EXACTLY like the image
          '--ag-row-hover-color': '#f8fafc',
          '--ag-selected-row-background-color': '#eff6ff',
          '--ag-odd-row-background-color': '#ffffff',
          '--ag-even-row-background-color': '#f8fafc',
          
          // Cell padding - tighter like the image
          '--ag-cell-horizontal-padding': '10px',
          '--ag-cell-vertical-padding': '6px',
          '--ag-header-cell-horizontal-padding': '10px',
          '--ag-header-cell-vertical-padding': '10px',
          
          // Focus states - minimal
          '--ag-focus-border-color': '#3b82f6',
          '--ag-focus-border-width': '1px',
          
          // Scrollbar - thin and modern
          '--ag-scrollbar-track-color': '#f1f5f9',
          '--ag-scrollbar-thumb-color': '#cbd5e1',
          '--ag-scrollbar-thumb-hover-color': '#94a3b8',
          
          // Menu styling - clean
          '--ag-menu-background-color': '#ffffff',
          '--ag-menu-border-color': '#e5e7eb',
          '--ag-menu-border-radius': '6px',
          '--ag-menu-box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          
          // Icons - subtle
          '--ag-icon-color': '#6b7280',
          '--ag-icon-hover-color': '#374151',
          '--ag-icon-selected-color': '#3b82f6',
          
          // Input styling - minimal
          '--ag-input-border-color': '#d1d5db',
          '--ag-input-border-radius': '4px',
          '--ag-input-background-color': '#ffffff',
          '--ag-input-hover-border-color': '#9ca3af',
          '--ag-input-focus-border-color': '#3b82f6',
          '--ag-input-focus-box-shadow': '0 0 0 1px #3b82f6',
          
          // Button styling - clean
          '--ag-button-background-color': '#ffffff',
          '--ag-button-border-color': '#d1d5db',
          '--ag-button-border-radius': '4px',
          '--ag-button-hover-background-color': '#f9fafb',
          '--ag-button-hover-border-color': '#9ca3af',
          
          // Row height - compact like the image
          '--ag-row-height': '36px',
          
          // Ensure no internal border radius conflicts
          '--ag-row-border-style': 'none',
          '--ag-cell-border-style': 'none',
        } as React.CSSProperties}
      >
        <AgGridReact
          theme="legacy"
          rowData={paginatedData}
          columnDefs={columnDefs}
          onGridReady={handleGridReady}
          domLayout={domLayout}
          suppressRowHoverHighlight={suppressRowHoverHighlight}
          rowHeight={rowHeight}
          suppressColumnVirtualisation={suppressColumnVirtualisation}
          suppressHorizontalScroll={suppressHorizontalScroll}
          defaultColDef={{
          sortable: true,
          filter: true,
          resizable: true,
          minWidth: 100,
          suppressMenu: false,
          ...defaultColDef
        }}
          suppressRowClickSelection={suppressRowClickSelection}
          components={components}
          // Suppress default pagination panel to use our custom one
          suppressPaginationPanel={true}
          // Better performance
          suppressMovableColumns={false}
          suppressMenuHide={false}
          // EXACT styling matching the image
          headerHeight={44}
          rowSelection={rowSelection || "single"}
          animateRows={false}
                  // Excel-like cell selection and navigation (native AG Grid)
        // enableRangeSelection={true} // Removed - requires enterprise module
          suppressRowDeselection={suppressRowDeselection}
          suppressCellFocus={false}
          enableCellTextSelection={true}
          // Alternating row colors - EXACTLY like the image
          getRowStyle={(params) => {
            return {
              backgroundColor: params.node.rowIndex !== null && params.node.rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
              borderBottom: '1px solid #f3f4f6'
            };
          }}
        />
      </div>
      
      {/* Modern pagination component */}
      {pagination && totalRows > 0 && (
        <div style={{ 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e5e7eb',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          marginTop: '-1px', // Ensure seamless connection
          marginLeft: '8px', // Match AG Grid left margin
          marginRight: '8px', // Match AG Grid right margin
          width: 'calc(100% - 16px)', // Account for left and right margins
          boxSizing: 'border-box' // Include borders in width calculation
        }}>
          <ModernPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRows={totalRows}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </div>
      )}
    </div>
  );
};

export default AgGridWrapper;
