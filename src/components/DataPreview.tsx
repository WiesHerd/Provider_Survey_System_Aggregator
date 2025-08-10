import React, { useState, useEffect, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Box
} from '@mui/material';
import BackendService from '../services/BackendService';
// removed toggle UI
// AG Grid (advanced table)
// @ts-ignore - types provided by package
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
// Types from ag-grid-community can be used if available. Fallback to any to avoid build-time type resolution issues.

// Custom header component for pinning columns
const CustomHeader = (props: any) => {
  const { displayName, onPinColumn, colId, isSpecialty } = props;
  const [isPinned, setIsPinned] = useState(false);
  
  const handlePinClick = () => {
    setIsPinned(!isPinned);
    onPinColumn(colId);
  };

  return (
    <div className="flex items-center justify-between w-full">
      <span className={`truncate ${isSpecialty ? 'font-semibold' : ''}`}>{displayName}</span>
      <button
        onClick={handlePinClick}
        className={`ml-2 p-1 rounded hover:bg-gray-100 transition-colors ${
          isPinned ? 'text-indigo-600' : 'text-gray-400'
        }`}
        title={isPinned ? 'Unfreeze column' : 'Freeze column'}
      >
        {isPinned ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        )}
      </button>
    </div>
  );
};

interface DataPreviewProps {
  file: {
    id: string;
    fileName: string;
    surveyType: string;
    surveyYear: string;
    uploadDate: Date;
    fileContent?: string;
  };
  onError: (message: string) => void;
  globalFilters: {
    specialty: string;
    providerType: string;
    region: string;
  };
  onFilterChange: (filterName: string, value: string) => void;
}

interface FileStats {
  columnNames: string[];
  totalRows: number;
  uniqueSpecialties: number;
  totalDataPoints: number;
}

const DataPreview: React.FC<DataPreviewProps> = ({ file, onError, globalFilters, onFilterChange }) => {
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; pages: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const rowsPerPage = 10;
  const [gridApi, setGridApi] = useState<any | null>(null);
  const [columnApi, setColumnApi] = useState<any | null>(null);
  // Removed table-level quick search to rely on existing dropdown filters
  const selectableHeaders = useMemo(() => (previewData[0] || []) as string[], [previewData]);
  const [pinColumnId, setPinColumnId] = useState<string>('');

  const [serverSpecialties, setServerSpecialties] = useState<string[]>([]);
  const [serverProviderTypes, setServerProviderTypes] = useState<string[]>([]);
  const [serverRegions, setServerRegions] = useState<string[]>([]);

  const handleFilterChange = (
    event: React.ChangeEvent<{ name?: string; value: unknown }> | any
  ) => {
    onFilterChange(event.target.name, event.target.value);
  };

  useEffect(() => {
    let isCancelled = false;
    const loadSurveyData = async () => {
      try {
        // Only show loading on initial load or page change, not filter changes
        if (currentPage === 1 && !originalData.length) {
          setIsLoading(true);
        }
        
        const backendService = BackendService.getInstance();
        
        // Pass current filters to server for server-side filtering
        const filters = {
          specialty: globalFilters.specialty || undefined,
          providerType: globalFilters.providerType || undefined,
          region: globalFilters.region || undefined
        };
        
        const { rows: surveyData, pagination } = await backendService.getSurveyData(
          file.id,
          filters,
          { page: currentPage, limit: pageSize }
        );
        
        if (!isCancelled && surveyData.length > 0) {
          // Store original data for filtering
          setOriginalData(surveyData);
          
          // Prefer original CSV header order from survey metadata if available
          let headers: string[] = [];
          try {
            const meta = await BackendService.getInstance().getSurveyMeta(file.id);
            if (Array.isArray(meta.columns) && meta.columns.length > 0) {
              headers = meta.columns;
            } else {
              headers = Object.keys(surveyData[0]);
            }
          } catch {
            headers = Object.keys(surveyData[0]);
          }
          // Hide db identifiers from preview
          headers = headers.filter(h => h.toLowerCase() !== 'id' && h.toLowerCase() !== 'surveyid');
          const rows = surveyData.map(row => headers.map(header => String(row[header as keyof typeof row] || '')));
          
          setStats({
            columnNames: headers,
            totalRows: surveyData.length,
            uniqueSpecialties: new Set(surveyData.map(row => row.specialty)).size,
            totalDataPoints: surveyData.length * headers.length
          });
          setPreviewData([headers, ...rows]);
        }
        if (!isCancelled && pagination) {
          setPagination(pagination);
        }
        if (!isCancelled) setIsLoading(false);
      } catch (error) {
        console.error('Error loading survey data:', error);
        onError('Error loading survey data from backend');
        if (!isCancelled) setIsLoading(false);
      }
    };

    if (file.id) {
      loadSurveyData();
    }
    return () => {
      isCancelled = true;
    };
  }, [file.id, currentPage, pageSize]); // Removed globalFilters dependency to prevent flickering

  // Separate effect for filter changes with debouncing
  useEffect(() => {
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout;
    
    const loadFilteredData = async () => {
      try {
        setIsRefreshing(true);
        const backendService = BackendService.getInstance();
        
        const filters = {
          specialty: globalFilters.specialty || undefined,
          providerType: globalFilters.providerType || undefined,
          region: globalFilters.region || undefined
        };
        
        const { rows: surveyData, pagination } = await backendService.getSurveyData(
          file.id,
          filters,
          { page: 1, limit: pageSize } // Reset to page 1 when filters change
        );
        
        if (!isCancelled && surveyData.length > 0) {
          setOriginalData(surveyData);
          
          // Reuse existing headers if available
          let headers: string[] = [];
          if (previewData[0] && previewData[0].length > 0) {
            headers = previewData[0];
          } else {
            try {
              const meta = await BackendService.getInstance().getSurveyMeta(file.id);
              if (Array.isArray(meta.columns) && meta.columns.length > 0) {
                headers = meta.columns;
              } else {
                headers = Object.keys(surveyData[0]);
              }
            } catch {
              headers = Object.keys(surveyData[0]);
            }
          }
          
          headers = headers.filter(h => h.toLowerCase() !== 'id' && h.toLowerCase() !== 'surveyid');
          const rows = surveyData.map(row => headers.map(header => String(row[header as keyof typeof row] || '')));
          
          setStats({
            columnNames: headers,
            totalRows: surveyData.length,
            uniqueSpecialties: new Set(surveyData.map(row => row.specialty)).size,
            totalDataPoints: surveyData.length * headers.length
          });
          setPreviewData([headers, ...rows]);
          setCurrentPage(1); // Reset to first page
        }
        if (!isCancelled && pagination) {
          setPagination(pagination);
        }
        if (!isCancelled) setIsRefreshing(false);
      } catch (error) {
        console.error('Error loading filtered data:', error);
        onError('Error loading filtered data from backend');
        if (!isCancelled) setIsRefreshing(false);
      }
    };

    // Debounce filter changes to prevent rapid API calls
    timeoutId = setTimeout(() => {
      if (file.id) {
        loadFilteredData();
      }
    }, 300); // 300ms debounce

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [globalFilters.specialty, globalFilters.providerType, globalFilters.region, file.id, pageSize]);

  // Load global filter options from server (not paginated)
  useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      try {
        const f = await BackendService.getInstance().getAvailableFiltersForSurvey(file.id);
        if (cancelled) return;
        setServerSpecialties((f.specialties || []).sort());
        setServerProviderTypes((f.providerTypes || []).sort());
        setServerRegions((f.regions || []).sort());
      } catch {}
    };
    if (file.id) loadFilters();
    return () => { cancelled = true; };
  }, [file.id]);

  // Cascading filter options based on current selections
  const cascadingFilterOptions = useMemo(() => {
    // Use server-side filter options which have access to the full dataset
    // Only apply cascading logic if we have server options
    if (!serverSpecialties.length && !serverProviderTypes.length && !serverRegions.length) {
      return {
        specialties: [],
        providerTypes: [],
        regions: []
      };
    }

    // For now, return all server options until we implement proper server-side cascading
    // The server /filters endpoint already has access to the full dataset
    return {
      specialties: serverSpecialties,
      providerTypes: serverProviderTypes,
      regions: serverRegions
    };
  }, [serverSpecialties, serverProviderTypes, serverRegions]);

  const filteredData = useMemo(() => {
    if (!originalData.length || !stats) return [];

    // Server is now handling the filtering, so just convert to display format
    if (originalData.length > 0 && previewData[0]) {
      const headers = previewData[0];
      return originalData.map(row => headers.map(header => String(row[header as keyof typeof row] || '')));
    }

    return [];
  }, [originalData, stats, previewData]);

  const totalPages = pagination?.pages ?? 1;

  // Formatting helpers
  const formatCurrency = (value: any, decimals: number) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(num)) return value ?? '';
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };
  const formatNumber = (value: any, decimals: number) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(num)) return value ?? '';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const createColumnDefs = () => {
    // If we have the server-derived headers, use them; otherwise fall back to previewData detection
    const headers = previewData[0] || [];
    return headers
      .filter((header: string) => {
        const lower = String(header).toLowerCase();
        return lower !== 'id' && lower !== 'surveyid';
      })
      .map((header: string) => {
      const key = header;
      const lower = header.toLowerCase();
      const isTcc = lower.startsWith('tcc_') || lower.includes('total_cash') || lower.includes('tcc');
      const isCf = lower.startsWith('cf_') || lower.includes('conversion');
      const isWrvu = lower.includes('wrvu');
      const isCount = lower === 'n_orgs' || lower === 'n_incumbents';
      const isNumeric = isTcc || isCf || isWrvu || isCount;
      const isSpecialty = lower.includes('specialty');

      return {
        headerName: header,
        field: key,
        sortable: true,
        filter: isNumeric ? 'agNumberColumnFilter' : 'agTextColumnFilter',
        resizable: true,
        cellClass: isNumeric ? 'ag-right-aligned-cell' : (isSpecialty ? 'font-semibold' : undefined),
        headerClass: isNumeric ? 'ag-right-aligned-header' : undefined,
        headerComponent: 'CustomHeader',
        headerComponentParams: {
          onPinColumn: (colId: string) => {
            if (!columnApi) return;
            const column = columnApi.getColumn(colId);
            const isPinned = column?.getColDef().pinned === 'left';
            columnApi.applyColumnState({
              state: [{ colId, pinned: isPinned ? null : 'left' }]
            });
          },
          isSpecialty: isSpecialty
        },
        valueGetter: (params: any) => {
          const raw = params.data[key];
          if (isNumeric) {
            const num = parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
            return Number.isNaN(num) ? null : num;
          }
          return raw;
        },
        valueFormatter: (params: any) => {
          const raw = params.value ?? params.data?.[key];
          if (raw === undefined || raw === null) return '';
          if (isTcc) return formatCurrency(raw, 0);
          if (isCf) return formatCurrency(raw, 2);
          if (isWrvu || isCount) return formatNumber(raw, 0);
          return raw;
        },
      } as any;
    });
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white shadow-sm">
        {/* Keep the filter controls visible during loading */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider'
        }}>
          {/* Header with Clear Filter Button */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Survey Preview</h3>
            <button
              disabled
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
              title="Clear all filters"
            >
              <div className="relative w-4 h-4 mr-2">
                <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
                </svg>
              </div>
              <span className="text-xs">Clear Filters</span>
            </button>
          </div>

          {/* Filter Dropdowns - Disabled during loading */}
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded-md"></div>
              </div>
            ))}
          </div>
        </Box>

        {/* Data Table Loading State */}
        <div className="ag-theme-alpine" style={{ height: 520, width: '100%' }}>
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 mb-2"></div>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 mb-1"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white shadow-sm">
      {/* Filter Controls */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider'
      }}>
        {/* Header with Clear Filter Button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Survey Preview</h3>
          <button
            onClick={() => {
              onFilterChange('specialty', '');
              onFilterChange('providerType', '');
              onFilterChange('region', '');
              setCurrentPage(1);
            }}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
            title="Clear all filters"
          >
            <div className="relative w-4 h-4 mr-2">
              {/* Funnel Icon */}
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
              </svg>
              {/* X Overlay - Only show when filters are active */}
              {(globalFilters.specialty || globalFilters.providerType || globalFilters.region) && (
                <svg className="absolute -top-1 -right-1 w-3 h-3 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-xs">Clear Filters</span>
          </button>
        </div>

        {/* Filter Dropdowns - Perfectly Aligned */}
        <div className="grid grid-cols-3 gap-4">
          <FormControl fullWidth size="small">
            <InputLabel className="text-sm font-medium text-gray-700 mb-2">Specialty</InputLabel>
            <Select
              name="specialty"
              value={globalFilters.specialty}
              onChange={handleFilterChange}
              label="Specialty"
              className="h-10"
            >
              <MenuItem value="">All</MenuItem>
              {cascadingFilterOptions.specialties.map(specialty => (
                <MenuItem key={specialty} value={specialty}>{specialty}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel className="text-sm font-medium text-gray-700 mb-2">Provider Type</InputLabel>
            <Select
              name="providerType"
              value={globalFilters.providerType}
              onChange={handleFilterChange}
              label="Provider Type"
              className="h-10"
            >
              <MenuItem value="">All</MenuItem>
              {cascadingFilterOptions.providerTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel className="text-sm font-medium text-gray-700 mb-2">Geographic Region</InputLabel>
            <Select
              name="region"
              value={globalFilters.region}
              onChange={handleFilterChange}
              label="Geographic Region"
              className="h-10"
            >
              <MenuItem value="">All</MenuItem>
              {cascadingFilterOptions.regions.map(region => (
                <MenuItem key={region} value={region}>{region}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </Box>

      {/* Data Table - AG Grid as primary */}
      <div className="ag-theme-alpine relative" style={{ height: 520, width: '100%' }}>
        {/* Subtle refreshing overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              <span className="text-sm">Updating data...</span>
            </div>
          </div>
        )}
        <AgGridReact
          onGridReady={(params: any) => {
            setGridApi(params.api);
            setColumnApi(params.columnApi);
          }}
          rowData={filteredData.map((row) => {
            const obj: Record<string, string> = {};
            (previewData[0] || []).forEach((header, idx) => {
              obj[header] = row[idx];
            });
            return obj;
          })}
          columnDefs={createColumnDefs()}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          suppressRowClickSelection={true}
          components={{
            CustomHeader: CustomHeader
          }}
        />
      </div>
      {/* Modern Server-side pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          {/* Left side - Page info and page size */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Showing page <span className="font-medium text-gray-900">{currentPage}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
            </div>
            <div className="text-sm text-gray-500">
              ({pagination?.total?.toLocaleString() || 0} total records)
            </div>
          </div>

          {/* Center - Page navigation */}
          <div className="flex items-center space-x-2">
            {/* First page */}
            <button
              className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              title="Go to first page"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 9H17a1 1 0 110 2h-5.586l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Previous page */}
            <button
              className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              title="Previous page"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Page input */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= totalPages) {
                    setCurrentPage(value);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const value = parseInt(e.currentTarget.value);
                    if (value >= 1 && value <= totalPages) {
                      setCurrentPage(value);
                    }
                  }
                }}
                className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                title={`Enter page number (1-${totalPages})`}
              />
              <span className="text-sm text-gray-500">of {totalPages}</span>
            </div>

            {/* Next page */}
            <button
              className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              title="Next page"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Last page */}
            <button
              className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              title="Go to last page"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 11H3a1 1 0 110-2h5.586L4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Right side - Quick navigation */}
          <div className="flex items-center space-x-2">
            {/* Quick jump buttons */}
            {currentPage > 5 && (
              <button
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
                onClick={() => setCurrentPage(1)}
              >
                1
              </button>
            )}
            {currentPage > 5 && (
              <span className="text-gray-400">...</span>
            )}
            
            {/* Page numbers around current page */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  className={`px-2 py-1 text-xs rounded transition-colors duration-200 ${
                    pageNum === currentPage
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {currentPage < totalPages - 4 && (
              <span className="text-gray-400">...</span>
            )}
            {currentPage < totalPages - 4 && (
              <button
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
                onClick={() => setCurrentPage(totalPages)}
              >
                {totalPages}
              </button>
            )}
          </div>
        </div>
      )}
      
    </div>
  );
};

export default DataPreview; 