import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

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
  },
  {
    key: 'cf',
    label: 'Conversion Factor (CF)',
    format: (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
  },
  {
    key: 'wrvus',
    label: 'Work RVUs (wRVUs)',
    format: (v: number) => new Intl.NumberFormat('en-US').format(v),
  },
];

const getMinMax = (values: number[]) => {
  let min = Math.min(...values);
  let max = Math.max(...values);
  return { min, max };
};



const RegionalComparison: React.FC<RegionalComparisonProps> = ({ data }) => {
  const regionNames = data.map(region => region.region);

  // Create AG Grid column definitions for each metric
  const createColumnDefs = (metric: typeof metricConfigs[0]): ColDef[] => {
    const baseColDef: ColDef = {
      sortable: true,
      filter: true,
      resizable: true,
      headerClass: 'font-semibold text-gray-700',
    };

    const cols: ColDef[] = [
      {
        headerName: 'Percentile',
        field: 'percentile',
        pinned: 'left',
        width: 150,
        cellClass: 'font-medium text-gray-600',
        ...baseColDef,
      },
    ];

    // Add region columns
    regionNames.forEach(region => {
      cols.push({
        headerName: region,
        field: region,
        flex: 1, // Make columns flex to fill available space
                 cellRenderer: (params: any) => {
           const value = params.value;
           const values = data.map(r => r[`${metric.key}_${params.data.percentileKey}` as keyof RegionalData] as number);
           const { min, max } = getMinMax(values);
           
           let cellClass = '';
           let tooltip = '';
           
           if (value === max) {
             cellClass = 'bg-green-50 font-bold';
             tooltip = 'Highest value';
           } else if (value === min) {
             cellClass = 'bg-red-50 font-bold';
             tooltip = 'Lowest value';
           }
           
           return (
             <div className={`${cellClass}`} title={tooltip}>
               <div>{metric.format(value)}</div>
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

  // Grid options
  const gridOptions: GridOptions = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
    },
    domLayout: 'autoHeight',
    suppressRowHoverHighlight: false,
    rowHeight: 50,
    suppressColumnVirtualisation: true, // Ensure all columns are rendered
    suppressHorizontalScroll: true, // Prevent horizontal scrollbar
  };

  return (
    <div className="space-y-8">
      {metricConfigs.map(metric => (
        <div key={metric.key} className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">{metric.label}</h3>
          <div className="ag-theme-alpine w-full overflow-visible">
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