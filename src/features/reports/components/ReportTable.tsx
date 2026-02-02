/**
 * Report Table Component
 * 
 * Displays report data in AG Grid with export functionality
 */

import React, { useMemo, useState } from 'react';
import { ColDef } from 'ag-grid-community';
import { Snackbar, Alert, TextField, InputAdornment, IconButton, Tooltip, Drawer, Typography, Divider, Table, TableBody, TableCell, TableRow, TableHead } from '@mui/material';
import { MagnifyingGlassIcon as SearchIcon, XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon, ArrowDownTrayIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import AgGridWrapper from '../../../components/AgGridWrapper';
import { ReportData, ReportConfig, ReportDataRow } from '../types/reports';
import { exportToExcel, exportToPDF } from '../services/reportExportService';
import { EnterpriseLoadingSpinner } from '../../../shared/components';
import { flexibleWordMatch } from '../../../shared/utils/specialtyMatching';

interface ReportTableProps {
  data: ReportData;
  config: ReportConfig;
  loading?: boolean;
  onViewFiltersClick?: () => void;
}

/**
 * Format number (no dollar signs, comma separators, decimals only when needed)
 */
function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null || value === 0) return '-';
  
  // Check if it's a whole number
  if (value % 1 === 0) {
    return value.toLocaleString('en-US');
  }
  
  // For decimals, show up to 2 decimal places
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export const ReportTable: React.FC<ReportTableProps> = ({
  data,
  config,
  loading = false,
  onViewFiltersClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedRowForBreakdown, setSelectedRowForBreakdown] = useState<ReportDataRow | null>(null);

  // ENTERPRISE FIX: Always show distinguishing columns when multiple values are selected
  // This ensures rows with same specialty but different filter combinations are clearly distinguishable
  const shouldShowRegion = useMemo(() => {
    // Show if multiple regions selected OR any row has region data OR no region filter applied
    return config.selectedRegion.length > 1 || 
           data.rows.some(row => row.region) || 
           !config.selectedRegion || 
           config.selectedRegion.length === 0;
  }, [data.rows, config.selectedRegion]);

  // ENTERPRISE FIX: Always show provider type column when multiple values selected
  const shouldShowProviderType = useMemo(() => {
    // Show if multiple provider types selected OR any row has provider type data OR no filter applied
    return config.selectedProviderType.length > 1 || 
           data.rows.some(row => row.providerType) || 
           !config.selectedProviderType || 
           config.selectedProviderType.length === 0;
  }, [data.rows, config.selectedProviderType]);

  // ENTERPRISE FIX: Always show year column when multiple values selected
  const shouldShowYear = useMemo(() => {
    // Show if multiple years selected OR any row has year data
    return config.selectedYear.length > 1 || 
           data.rows.some(row => row.surveyYear);
  }, [data.rows, config.selectedYear]);

  // ENTERPRISE FIX: Check if survey source column should be shown
  const shouldShowSurveySource = useMemo(() => {
    // Show if multiple survey sources selected OR any row has survey source data OR filter is applied
    return config.selectedSurveySource.length > 1 ||
           data.rows.some(row => row.surveySource) ||
           (config.selectedSurveySource && config.selectedSurveySource.length > 0);
  }, [data.rows, config.selectedSurveySource]);

  // Filter rows based on search term with flexible word matching (like other screens)
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return data.rows;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return data.rows.filter(row => {
      // For specialty: use flexible word matching (order-independent, handles word order variations)
      if (row.specialty && flexibleWordMatch(row.specialty, searchTerm)) {
        return true;
      }
      
      // For other fields: use simple includes (exact substring match)
      if (row.region?.toLowerCase().includes(searchLower)) return true;
      if (row.providerType?.toLowerCase().includes(searchLower)) return true;
      if (row.surveySource?.toLowerCase().includes(searchLower)) return true;
      if (row.surveyYear?.toLowerCase().includes(searchLower)) return true;
      
      return false;
    });
  }, [data.rows, searchTerm]);

  // Create column definitions: Year → Specialty → Region → Provider Type → Survey Source → # Incumbents → # Orgs → P25–P90 → Blended
  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = [];

    // 1. Year (when shown)
    if (shouldShowYear) {
      cols.push({
        headerName: 'Year',
        field: 'surveyYear',
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        minWidth: 100,
        flex: 1,
        cellStyle: { textAlign: 'center' }
      });
    }

    // 2. Specialty
    cols.push({
      headerName: 'Specialty',
      field: 'specialty',
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true,
      minWidth: 200,
      flex: 2,
      valueFormatter: (params) => (params.value && String(params.value).trim()) ? params.value : '—',
      cellStyle: (params: any) => {
        const blended = params.data?.isBlended && (params.data?.blendBreakdown?.length ?? 0) > 0;
        return { fontWeight: 500, ...(blended ? { cursor: 'pointer' } : {}) };
      }
    });

    // 3. Region (when shown)
    if (shouldShowRegion) {
      cols.push({
        headerName: 'Region',
        field: 'region',
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        minWidth: 120,
        flex: 1.2
      });
    }

    // 4. Provider Type (when shown)
    if (shouldShowProviderType) {
      cols.push({
        headerName: 'Provider Type',
        field: 'providerType',
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        minWidth: 150,
        flex: 1.5
      });
    }

    // 5. Survey Source (when shown)
    if (shouldShowSurveySource) {
      cols.push({
        headerName: 'Survey Source',
        field: 'surveySource',
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        minWidth: 180,
        flex: 1.5
      });
    }

    // 6. # Incumbents
    cols.push({
      headerName: '# Incumbents',
      field: 'n_incumbents',
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      minWidth: 120,
      flex: 1,
      cellStyle: { textAlign: 'right' },
      headerClass: 'ag-right-aligned-header',
      valueFormatter: (params) => params.value?.toLocaleString('en-US') || '0'
    });

    // 7. # Orgs
    cols.push({
      headerName: '# Orgs',
      field: 'n_orgs',
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      minWidth: 100,
      flex: 1,
      cellStyle: { textAlign: 'right' },
      headerClass: 'ag-right-aligned-header',
      valueFormatter: (params) => params.value?.toLocaleString('en-US') || '0'
    });

    // 8. Percentile columns (P25, P50, P75, P90)
    config.selectedPercentiles.forEach(percentile => {
      cols.push({
        headerName: percentile.toUpperCase(),
        field: percentile,
        sortable: true,
        filter: 'agNumberColumnFilter',
        resizable: true,
        minWidth: 120,
        flex: 1,
        cellStyle: { textAlign: 'right' },
        headerClass: 'ag-right-aligned-header',
        valueFormatter: (params) => formatNumber(params.value)
      });
    });

    // 9. Blended
    cols.push({
      headerName: 'Blended',
      field: 'isBlended',
      sortable: true,
      filter: 'agTextColumnFilter',
      resizable: true,
      minWidth: 80,
      flex: 0.8,
      cellRenderer: (params: any) => params.value ? 'Yes' : 'No',
      cellStyle: { textAlign: 'center' }
    });

    return cols;
  }, [config, shouldShowRegion, shouldShowProviderType, shouldShowYear, shouldShowSurveySource]);

  const handleExportExcel = () => {
    try {
      exportToExcel(data, config);
      setExportSuccess(true);
      setExportError(null);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setExportError(`Failed to export to Excel: ${errorMessage}`);
      setExportSuccess(false);
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(data, config);
      setExportSuccess(true);
      setExportError(null);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setExportError(`Failed to export to PDF: ${errorMessage}`);
      setExportSuccess(false);
    }
  };

  if (loading) {
    return (
      <EnterpriseLoadingSpinner 
        message="Generating report..." 
        variant="inline"
        showProgress={false}
      />
    );
  }

  if (data.rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
        <div className="text-center max-w-lg">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Matches Your Filters</h3>
          <p className="text-sm text-gray-600 mb-6">
            We couldn't find any data that matches your current report configuration.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-left">
            <p className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5" />
              What to try next:
            </p>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Select <strong>"All"</strong> for provider type, survey source, region, or year to see more data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Check that you have <strong>uploaded survey data</strong> in the Upload section</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Verify the selected metric exists in your uploaded surveys</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Try using <strong>"Quick Generate"</strong> to see all available data</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Export Success/Error Notifications */}
      <Snackbar
        open={exportSuccess}
        autoHideDuration={3000}
        onClose={() => setExportSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setExportSuccess(false)} severity="success" sx={{ borderRadius: '8px' }}>
          Report exported successfully!
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!exportError}
        autoHideDuration={5000}
        onClose={() => setExportError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setExportError(null)} severity="error" sx={{ borderRadius: '8px' }}>
          {exportError}
        </Alert>
      </Snackbar>

      <div className="flex flex-col space-y-4">
        {/* Search, Export buttons, and View Filters */}
        <div className="flex items-center justify-between gap-4">
          {/* Search bar - using MUI TextField like rest of app */}
          <div className="flex-1 max-w-md">
            <TextField
              fullWidth
              placeholder="Search by specialty, region, provider type, or survey source..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  fontSize: '0.875rem',
                  height: '40px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db !important',
                  '&:hover': {
                    borderColor: '#9ca3af !important',
                    borderWidth: '1px !important'
                  },
                  '&.Mui-focused': {
                    boxShadow: 'none',
                    borderColor: '#3b82f6 !important',
                    borderWidth: '1px !important'
                  },
                  '& fieldset': {
                    border: 'none !important'
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className="h-4 w-4 text-gray-400" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                      sx={{
                        padding: '4px',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                      aria-label="Clear search"
                    >
                      <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </div>

          {/* Export buttons and View Filters */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export PDF
            </button>
            {onViewFiltersClick && (
              <Tooltip title="View filters" placement="top" arrow>
                <button
                  onClick={onViewFiltersClick}
                  className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
                  aria-label="View filters"
                >
                  <AdjustmentsHorizontalIcon className="w-5 h-5" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Search results count */}
        {searchTerm && (
          <div className="text-sm text-gray-600">
            Showing {filteredRows.length} of {data.rows.length} rows
          </div>
        )}

      {/* AG Grid table */}
      <AgGridWrapper
        rowData={filteredRows}
        columnDefs={columnDefs}
        onRowClicked={(params) => {
          const row = params.data as ReportDataRow;
          if (row?.isBlended && row?.blendBreakdown?.length) setSelectedRowForBreakdown(row);
        }}
        pagination={true}
        paginationPageSize={25}
        defaultColDef={{
          sortable: true,
          filter: true,
          resizable: true,
          minWidth: 100
        }}
        suppressRowClickSelection={true}
        domLayout="normal"
        suppressRowHoverHighlight={false}
        rowHeight={40}
      />

        {/* Blend breakdown drawer – click a blended row to see how it was calculated */}
        <Drawer
          anchor="right"
          open={!!selectedRowForBreakdown}
          onClose={() => setSelectedRowForBreakdown(null)}
          sx={{ '& .MuiDrawer-paper': { width: 420, maxWidth: '100%' } }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Blend breakdown
              </Typography>
              <IconButton size="small" onClick={() => setSelectedRowForBreakdown(null)} aria-label="Close">
                <XMarkIcon className="w-5 h-5" />
              </IconButton>
            </div>
            {selectedRowForBreakdown && (
              <>
                <Typography variant="body2" className="text-gray-600 mb-1">
                  {selectedRowForBreakdown.specialty}
                  {selectedRowForBreakdown.region && ` · ${selectedRowForBreakdown.region}`}
                </Typography>
                <Typography variant="body2" className="text-gray-500 mb-4">
                  Formula: {selectedRowForBreakdown.blendMethod === 'weighted'
                    ? 'Weighted by sample size (n_incumbents)'
                    : 'Equal weight per source'}
                </Typography>
                <Divider className="my-4" />
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">n</TableCell>
                      {config.selectedPercentiles.includes('p50') && <TableCell sx={{ fontWeight: 600 }} align="right">P50</TableCell>}
                      {config.selectedPercentiles.includes('p25') && <TableCell sx={{ fontWeight: 600 }} align="right">P25</TableCell>}
                      {config.selectedPercentiles.includes('p75') && <TableCell sx={{ fontWeight: 600 }} align="right">P75</TableCell>}
                      {config.selectedPercentiles.includes('p90') && <TableCell sx={{ fontWeight: 600 }} align="right">P90</TableCell>}
                      <TableCell sx={{ fontWeight: 600 }} align="right">Weight</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedRowForBreakdown.blendBreakdown?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.year}</TableCell>
                        <TableCell>{item.surveySource}</TableCell>
                        <TableCell align="right">{item.n_incumbents?.toLocaleString() ?? '-'}</TableCell>
                        {config.selectedPercentiles.includes('p50') && <TableCell align="right">{item.p50 != null ? formatNumber(item.p50) : '-'}</TableCell>}
                        {config.selectedPercentiles.includes('p25') && <TableCell align="right">{item.p25 != null ? formatNumber(item.p25) : '-'}</TableCell>}
                        {config.selectedPercentiles.includes('p75') && <TableCell align="right">{item.p75 != null ? formatNumber(item.p75) : '-'}</TableCell>}
                        {config.selectedPercentiles.includes('p90') && <TableCell align="right">{item.p90 != null ? formatNumber(item.p90) : '-'}</TableCell>}
                        <TableCell align="right">{item.weight != null ? `${(item.weight * 100).toFixed(1)}%` : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </Drawer>
      </div>
    </>
  );
};
