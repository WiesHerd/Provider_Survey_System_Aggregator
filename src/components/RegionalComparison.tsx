import React from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface RegionalData {
  region: string;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  wrvus_p25: number;
  wrvus_p50: number;
  wrvus_p75: number;
  wrvus_p90: number;
}

interface RegionalComparisonProps {
  data: RegionalData[];
}

const percentiles = [
  { key: 'p25', label: '25th Percentile' },
  { key: 'p50', label: '50th Percentile' },
  { key: 'p75', label: '75th Percentile' },
  { key: 'p90', label: '90th Percentile' },
];

const metricConfigs = [
  {
    key: 'tcc',
    label: 'Total Cash Compensation (TCC)',
    format: (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v),
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
    color: 'blue'
  },
  {
    key: 'cf',
    label: 'Conversion Factor (CF)',
    format: (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
    icon: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    color: 'emerald'
  },
  {
    key: 'wrvus',
    label: 'Work RVUs (wRVUs)',
    format: (v: number) => new Intl.NumberFormat('en-US').format(v),
    icon: (
      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'purple'
  },
];

const getMinMax = (values: number[]) => {
  let min = Math.min(...values);
  let max = Math.max(...values);
  return { min, max };
};

const RegionalComparison: React.FC<RegionalComparisonProps> = ({ data }) => {
  console.log('📊 RegionalComparison received data:', data);
  const regionNames = data.map(region => region.region);

  // Create AG Grid column definitions for each metric
  const createColumnDefs = (metric: typeof metricConfigs[0]): ColDef[] => {
    const baseColDef: ColDef = {
      sortable: true,
      filter: true,
      resizable: true,
      headerClass: 'font-semibold text-gray-700 bg-gray-50',
      cellClass: 'text-sm',
    };

    const cols: ColDef[] = [
      {
        headerName: 'Percentile',
        field: 'percentile',
        pinned: 'left',
        width: 150,
        cellClass: 'font-medium text-gray-600 bg-gray-50',
        headerClass: 'font-semibold text-gray-700 bg-gray-100',
        ...baseColDef,
      },
    ];

    // Add region columns
    regionNames.forEach(region => {
      cols.push({
        headerName: region,
        field: region,
        flex: 1,
        cellRenderer: (params: any) => {
          const value = params.value;
          const values = data.map(r => r[`${metric.key}_${params.data.percentileKey}` as keyof RegionalData] as number);
          const { min, max } = getMinMax(values);
          
          let cellClass = 'p-3 rounded-lg transition-all duration-200 min-h-[60px] flex items-center justify-center';
          let tooltip = '';
          
          if (value === max) {
            cellClass += ' bg-green-50 border border-green-200 font-bold text-green-800';
            tooltip = 'Highest value';
          } else if (value === min) {
            cellClass += ' bg-red-50 border border-red-200 font-bold text-red-800';
            tooltip = 'Lowest value';
          } else {
            cellClass += ' bg-white hover:bg-gray-50';
          }
          
          return (
            <div className={cellClass} title={tooltip} style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="text-center text-sm font-medium whitespace-nowrap overflow-visible">
                {metric.format(value)}
              </div>
            </div>
          );
        },
        ...baseColDef,
      });
    });

    return cols;
  };

  // Create row data for each metric
  const createRowData = (metric: typeof metricConfigs[0]) => {
    return percentiles.map(p => {
      const row: any = {
        percentile: p.label,
        percentileKey: p.key,
      };
      
      regionNames.forEach(region => {
        const regionData = data.find(d => d.region === region);
        if (regionData) {
          row[region] = regionData[`${metric.key}_${p.key}` as keyof RegionalData] as number;
        }
      });
      
      return row;
    });
  };

  // Grid options with modern styling
  const gridOptions: GridOptions = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
    },
    domLayout: 'autoHeight',
    suppressRowHoverHighlight: false,
    rowHeight: 60,
    suppressColumnVirtualisation: true,
    suppressHorizontalScroll: true,
    headerHeight: 50,
    suppressRowClickSelection: true,
    suppressCellFocus: true,
    // Custom styling
    getRowClass: () => 'hover:bg-gray-50 transition-colors duration-150',
  };

  return (
    <div className="space-y-8">
      {metricConfigs.map(metric => (
        <div key={metric.key} className="bg-white/50 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 bg-${metric.color}-100 rounded-lg flex items-center justify-center`}>
                {metric.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{metric.label}</h3>
                <p className="text-sm text-gray-600">Regional comparison across percentiles</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {regionNames.length} Regions
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {percentiles.length} Percentiles
              </span>
            </div>
          </div>
          
          <div 
            className="ag-theme-alpine w-full overflow-visible rounded-xl border border-gray-200 shadow-sm"
            style={{
              '--ag-header-background-color': 'rgba(249, 250, 251, 0.8)',
              '--ag-header-foreground-color': '#374151',
              '--ag-header-cell-hover-background-color': 'rgba(243, 244, 246, 0.8)',
              '--ag-row-hover-color': 'rgba(249, 250, 251, 0.5)',
              '--ag-selected-row-background-color': 'rgba(59, 130, 246, 0.1)',
              '--ag-font-size': '14px',
              '--ag-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              '--ag-border-color': 'rgba(229, 231, 235, 0.5)',
              '--ag-cell-horizontal-border': 'solid rgba(229, 231, 235, 0.3)',
              '--ag-row-border-color': 'rgba(229, 231, 235, 0.3)',
              '--ag-header-column-separator-color': 'rgba(229, 231, 235, 0.5)',
              '--ag-header-column-separator-height': '30px',
              '--ag-header-column-resize-handle-color': 'rgba(59, 130, 246, 0.3)',
              '--ag-header-column-resize-handle-height': '30px',
              '--ag-header-column-resize-handle-width': '2px',
              '--ag-header-column-resize-handle-display': 'block',
              '--ag-header-column-resize-handle-hover-color': 'rgba(59, 130, 246, 0.6)',
              '--ag-header-column-resize-handle-hover-width': '3px',
              '--ag-header-column-resize-handle-hover-height': '30px',
              '--ag-header-column-resize-handle-hover-display': 'block',
              '--ag-header-column-resize-handle-hover-transition': 'all 0.2s ease',
              '--ag-header-column-resize-handle-hover-cursor': 'col-resize',
              '--ag-header-column-resize-handle-hover-z-index': '1000',
              '--ag-header-column-resize-handle-hover-position': 'absolute',
              '--ag-header-column-resize-handle-hover-top': '0',
              '--ag-header-column-resize-handle-hover-bottom': '0',
              '--ag-header-column-resize-handle-hover-left': '50%',
              '--ag-header-column-resize-handle-hover-transform': 'translateX(-50%)',
              '--ag-header-column-resize-handle-hover-background-color': 'rgba(59, 130, 246, 0.6)',
              '--ag-header-column-resize-handle-hover-border-radius': '2px',
              '--ag-header-column-resize-handle-hover-box-shadow': '0 0 4px rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              overflow: 'hidden',
            } as React.CSSProperties}
          >
            <AgGridReact
              columnDefs={createColumnDefs(metric)}
              rowData={createRowData(metric)}
              gridOptions={gridOptions}
              suppressCellFocus={true}
              suppressRowClickSelection={true}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default RegionalComparison; 