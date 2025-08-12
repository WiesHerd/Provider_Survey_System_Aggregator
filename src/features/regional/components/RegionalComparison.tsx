import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions } from 'ag-grid-community';
import { Box, Typography, Alert } from '@mui/material';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { RegionalComparisonProps, RegionalData } from '../types/regional';
import { REGIONAL_METRICS, PERCENTILES } from '../utils/regionalCalculations';

/**
 * Regional Comparison component for displaying regional data in AG Grid tables
 * 
 * @param data - Regional data array
 * @param onRegionClick - Callback when a region is clicked
 * @param onMetricClick - Callback when a metric is clicked
 * @param className - Additional CSS classes
 */
export const RegionalComparison: React.FC<RegionalComparisonProps> = ({
  data,
  onRegionClick,
  onMetricClick,
  className = ''
}) => {
  const regionNames = data.map(region => region.region);

  // Helper function to get min/max values for highlighting
  const getMinMax = (values: number[]) => {
    let min = Math.min(...values);
    let max = Math.max(...values);
    return { min, max };
  };

  // Create AG Grid column definitions for each metric
  const createColumnDefs = (metric: typeof REGIONAL_METRICS[0]): ColDef[] => {
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
        flex: 1,
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
  const createRowData = (metric: typeof REGIONAL_METRICS[0]) => {
    return PERCENTILES.map(p => {
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
    suppressColumnVirtualisation: true,
    suppressHorizontalScroll: true,
  };

  // Early return if no data
  if (!data || data.length === 0) {
    return (
      <Alert severity="info" className="mt-4">
        No regional data available. Please select a specialty to view regional comparisons.
      </Alert>
    );
  }

  return (
    <Box className={`space-y-8 ${className}`}>
      <Typography variant="h5" component="h2" className="text-gray-800 mb-6">
        Regional Comparison Tables
      </Typography>

      {REGIONAL_METRICS.map(metric => (
        <Box key={metric.key} className="bg-white rounded-lg shadow-lg p-6">
          <Typography variant="h6" component="h3" className="text-xl font-semibold mb-6 text-gray-800">
            {metric.label}
          </Typography>
          <div className="ag-theme-alpine w-full overflow-visible">
            <AgGridReact
              columnDefs={createColumnDefs(metric)}
              rowData={createRowData(metric)}
              gridOptions={gridOptions}
              suppressCellFocus={true}
              suppressRowClickSelection={true}
            />
          </div>
        </Box>
      ))}
    </Box>
  );
};
