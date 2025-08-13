import React from 'react';
// @ts-ignore - types provided by package
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface AgGridWrapperProps {
  rowData: any[];
  columnDefs: any[];
  onGridReady?: (params: any) => void;
  pagination?: boolean;
  paginationPageSize?: number;
  domLayout?: 'normal' | 'autoHeight' | 'print';
  suppressRowHoverHighlight?: boolean;
  rowHeight?: number;
  suppressColumnVirtualisation?: boolean;
  suppressHorizontalScroll?: boolean;
  className?: string;
  defaultColDef?: any;
  suppressRowClickSelection?: boolean;
  components?: any;
}

const AgGridWrapper: React.FC<AgGridWrapperProps> = ({
  rowData,
  columnDefs,
  onGridReady,
  pagination = true,
  paginationPageSize = 100,
  domLayout = 'autoHeight',
  suppressRowHoverHighlight = true,
  rowHeight = 40,
  suppressColumnVirtualisation = false,
  suppressHorizontalScroll = false,
  className = 'ag-theme-alpine',
  defaultColDef,
  suppressRowClickSelection,
  components
}) => {
  return (
    <div className={`${className} w-full`} style={{ height: '600px' }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        onGridReady={onGridReady}
        pagination={pagination}
        paginationPageSize={paginationPageSize}
        domLayout={domLayout}
        suppressRowHoverHighlight={suppressRowHoverHighlight}
        rowHeight={rowHeight}
        suppressColumnVirtualisation={suppressColumnVirtualisation}
        suppressHorizontalScroll={suppressHorizontalScroll}
        defaultColDef={defaultColDef}
        suppressRowClickSelection={suppressRowClickSelection}
        components={components}
      />
    </div>
  );
};

export default AgGridWrapper;
