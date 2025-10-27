import React, { useState, useEffect, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Box,
  Autocomplete,
  TextField
} from '@mui/material';
import { getDataService } from '../services/DataService';
import { formatSpecialtyForDisplay, formatNormalizedValue } from '../shared/utils/formatters';
import { filterSpecialtyOptions } from '../shared/utils/specialtyMatching';
import { UnifiedLoadingSpinner } from '../shared/components/UnifiedLoadingSpinner';
import { useSmoothProgress } from '../shared/hooks/useSmoothProgress';
import AgGridWrapper from './AgGridWrapper';

// Custom header component for pinning columns
const CustomHeader = (props: any) => {
  const { displayName, onPinColumn, colId, isSpecialty, isNumeric } = props;
  const [isPinned, setIsPinned] = useState(false);
  
  const handlePinClick = () => {
    setIsPinned(!isPinned);
    onPinColumn(colId);
  };

  return (
    <div className={`flex items-center w-full ${isNumeric ? 'justify-end' : 'justify-between'}`}>
      <span className={`truncate ${isSpecialty ? 'font-semibold' : ''} ${isNumeric ? 'text-right' : ''}`}>{displayName}</span>
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
    variable: string;
  };
  onFilterChange: (filterName: string, value: string) => void;
  onGridReady?: (api: any) => void;
}

interface FileStats {
  columnNames: string[];
  totalRows: number;
  uniqueSpecialties: number;
  totalDataPoints: number;
}

const DataPreview: React.FC<DataPreviewProps> = ({ file, onError, globalFilters, onFilterChange, onGridReady }) => {
  const dataService = getDataService();
  
  // Use smooth progress for dynamic loading
  const { progress, startProgress, completeProgress } = useSmoothProgress({
    duration: 3000,
    maxProgress: 90,
    intervalMs: 100
  });
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [gridApi, setGridApi] = useState<any | null>(null);
  const [columnApi, setColumnApi] = useState<any | null>(null);
  // Removed table-level quick search to rely on existing dropdown filters
  const selectableHeaders = useMemo(() => previewHeaders, [previewHeaders]);
  const [pinColumnId, setPinColumnId] = useState<string>('');

  const [serverSpecialties, setServerSpecialties] = useState<string[]>([]);
  const [serverProviderTypes, setServerProviderTypes] = useState<string[]>([]);
  const [serverRegions, setServerRegions] = useState<string[]>([]);
  const [serverVariables, setServerVariables] = useState<string[]>([]);

  const handleFilterChange = (
    event: React.ChangeEvent<{ name?: string; value: unknown }> | any
  ) => {
    // Filter change logging removed for performance
    
    // Simple filter change - no cascading reset for now
    // This ensures basic filtering works without interference
    onFilterChange(event.target.name, event.target.value);
  };



  // Consolidated data loading effect to prevent race conditions
  useEffect(() => {
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout;
    
    console.log('Data loading effect triggered:', {
      fileId: file.id,
      specialty: globalFilters.specialty,
      providerType: globalFilters.providerType,
      region: globalFilters.region,
      variable: globalFilters.variable
    });
    
    const loadSurveyData = async () => {
      try {
        // Show loading only on initial load or when switching surveys
        if (!originalData.length || !previewData.length) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
        
        // Pass current filters to server for server-side filtering
        const filters = {
          specialty: globalFilters.specialty || undefined,
          providerType: globalFilters.providerType || undefined,
          region: globalFilters.region || undefined,
          variable: globalFilters.variable || undefined
        };
        
        console.log('Loading survey data with filters:', filters);
        
        const { rows: surveyData } = await dataService.getSurveyData(
          file.id,
          filters,
          { limit: 10000 } // Fetch all data (up to 10,000 rows)
        );
        
        console.log('Survey data returned:', {
          rowCount: surveyData.length,
          sampleRows: surveyData.slice(0, 3),
          sampleSpecialties: [...new Set(surveyData.map(row => row.specialty))].slice(0, 5)
        });
        
        if (!isCancelled) {
          // Store original data for filtering
          setOriginalData(surveyData);
          
          // Get headers from the first row
          let headers: string[] = [];
          if (surveyData.length > 0) {
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
          setPreviewHeaders(headers);
          setPreviewData(rows);
        }

        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      } catch (error) {
        console.error('Error loading survey data:', error);
        onError('Error loading survey data from backend');
        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    // Debounce to prevent rapid API calls when filters change
    timeoutId = setTimeout(() => {
      if (file.id) {
        loadSurveyData();
      }
    }, 100); // Reduced debounce time for better responsiveness

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [file.id, globalFilters.specialty, globalFilters.providerType, globalFilters.region, globalFilters.variable]);

  // Load global filter options from server (not paginated)
  useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      try {
        console.log('Loading filter options for file:', file.id);
        // For IndexedDB, we'll extract filter options from the data
        const { rows } = await dataService.getSurveyData(file.id);
        if (cancelled) return;
        
        console.log('Raw data for filter extraction:', rows.slice(0, 3));
        console.log('Available field names:', Object.keys(rows[0] || {}));
        
        // More robust field name detection
        const firstRow = rows[0] || {};
        const fieldNames = Object.keys(firstRow);
        
        // Find specialty field
        const specialtyField = fieldNames.find(field => 
          field.toLowerCase().includes('specialty') || 
          field.toLowerCase().includes('speciality')
        ) || 'specialty';
        
        // Find provider type field
        const providerTypeField = fieldNames.find(field => 
          field.toLowerCase().includes('provider') || 
          field.toLowerCase().includes('type')
        ) || 'providerType';
        
        // Find region field
        const regionField = fieldNames.find(field => 
          field.toLowerCase().includes('region') || 
          field.toLowerCase().includes('geographic')
        ) || 'geographicRegion';
        
        // Find variable field
        const variableField = fieldNames.find(field => 
          field.toLowerCase().includes('variable') || 
          field.toLowerCase().includes('metric') ||
          field.toLowerCase().includes('compensation')
        ) || 'variable';
        
        console.log('Detected field names:', {
          specialtyField,
          providerTypeField,
          regionField,
          variableField
        });
        
        const specialties = [...new Set(rows.map(row => String(row[specialtyField] || '')).filter(Boolean))].sort();
        const providerTypes = [...new Set(rows.map(row => String(row[providerTypeField] || '')).filter(Boolean))].sort();
        const regions = [...new Set(rows.map(row => String(row[regionField] || '')).filter(Boolean))].sort();
        const variables = [...new Set(rows.map(row => String(row[variableField] || '')).filter(Boolean))].sort();
        
        console.log('Extracted filter options:', {
          specialties: specialties.slice(0, 10),
          providerTypes: providerTypes.slice(0, 10),
          regions: regions.slice(0, 10),
          variables: variables.slice(0, 10),
          totalSpecialties: specialties.length,
          totalProviderTypes: providerTypes.length,
          totalRegions: regions.length,
          totalVariables: variables.length
        });
        
        setServerSpecialties(specialties);
        setServerProviderTypes(providerTypes);
        setServerRegions(regions);
        setServerVariables(variables);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };
    if (file.id) loadFilters();
    return () => { cancelled = true; };
  }, [file.id]);

  // Simple filter options - disable cascading for now to fix basic filtering
  const cascadingFilterOptions = useMemo(() => {
    // Use server-side filter options which have access to the full dataset
    // Only apply cascading logic if we have server options
    if (!serverSpecialties.length && !serverProviderTypes.length && !serverRegions.length && !serverVariables.length) {
      return {
        specialties: [],
        providerTypes: [],
        regions: [],
        variables: []
      };
    }

    // For now, return all server options to ensure basic filtering works
    // TODO: Implement proper cascading logic once basic filtering is stable
    return {
      specialties: serverSpecialties,
      providerTypes: serverProviderTypes,
      regions: serverRegions,
      variables: serverVariables
    };
  }, [serverSpecialties, serverProviderTypes, serverRegions, serverVariables]);

  // Since we now have server-side filtering, we don't need client-side filtering
  // The filteredData will just be the previewData from the server
  const filteredData = useMemo(() => {
    if (!previewData[0]) return [];
    
    console.log('Using server-filtered data:', previewData.length - 1, 'rows');
    return previewData;
  }, [previewData]);



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

  // Google-style intelligent column sizing
  useEffect(() => {
    if (gridApi && filteredData.length > 0) {
      const intelligentSizing = () => {
        try {
          if (gridApi) {
            // Step 1: Auto-size based on content to get natural widths
            if (gridApi.autoSizeAllColumns) {
              gridApi.autoSizeAllColumns();
            }
            
            // Step 2: Get the grid's available width
            const gridWidth = gridApi.getDisplayedColumns().reduce((total: number, col: any) => {
              return total + (col.getActualWidth() || 0);
            }, 0);
            
            // Step 3: If we have extra space, distribute it intelligently
            const containerWidth = gridApi.getDisplayedColumns().length > 0 ? 
              gridApi.getDisplayedColumns()[0].getGridApi().getDisplayedColumns().reduce((total: number, col: any) => {
                return total + (col.getActualWidth() || 0);
              }, 0) : 0;
            
            // Step 4: Use sizeColumnsToFit to fill remaining space intelligently
            if (gridApi.sizeColumnsToFit) {
              gridApi.sizeColumnsToFit();
            }
            
            console.log('Google-style intelligent sizing applied');
          }
        } catch (error) {
          console.log('Intelligent sizing failed:', error);
        }
      };
      
      // Multiple attempts with progressive delays for more reliable rendering
      intelligentSizing(); // Immediate
      setTimeout(intelligentSizing, 100);
      setTimeout(intelligentSizing, 300);
      setTimeout(intelligentSizing, 500);
      setTimeout(intelligentSizing, 800);
      setTimeout(intelligentSizing, 1200);
    }
  }, [gridApi, filteredData, file]);

  const createColumnDefs = () => {
    // Use the stored headers
    const headers = previewHeaders;
    console.log('Creating column defs for headers:', headers);
    
    // Check if this is normalized format data
    const isNormalizedFormat = headers.some(header => 
      ['p25', 'p50', 'p75', 'p90', 'variable'].includes(header.toLowerCase())
    );
    
    return headers
      .filter((header: string) => {
        const lower = String(header).toLowerCase();
        return lower !== 'id' && lower !== 'surveyid';
      })
      .map((header: string) => {
      const key = header;
      const lower = header.toLowerCase();
      
      // Handle both wide and normalized formats
      const isTcc = lower.startsWith('tcc_') || lower.includes('total_cash') || lower.includes('tcc');
      const isCf = lower.startsWith('cf_') || lower.includes('conversion');
      const isWrvu = lower.includes('wrvu');
      const isCount = lower === 'n_orgs' || lower === 'n_incumbents';
      
      // For normalized format, check if this is a percentile column
      const isPercentile = isNormalizedFormat && ['p25', 'p50', 'p75', 'p90'].includes(lower);
      const isVariable = isNormalizedFormat && lower === 'variable';
      
      const isNumeric = isTcc || isCf || isWrvu || isCount || isPercentile;
      const isSpecialty = lower.includes('specialty');

      return {
        headerName: header,
        field: key,
        sortable: true,
        filter: isNumeric ? 'agNumberColumnFilter' : 'agTextColumnFilter',
        resizable: true,
        // Google-style intelligent column sizing
        minWidth: isSpecialty ? 250 : isVariable ? 200 : isNumeric ? 90 : 130,
        maxWidth: isSpecialty ? 400 : isVariable ? 300 : isNumeric ? 120 : 200,
        // Smart flex ratios based on content importance and typical length
        flex: isSpecialty ? 3 : isVariable ? 2.5 : isNumeric ? 1 : 1.5,
        // Enable text wrapping for long content
        wrapText: isSpecialty || isVariable,
        autoHeight: isSpecialty || isVariable,
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
          isSpecialty: isSpecialty,
          isNumeric: isNumeric
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
          
          // Handle normalized format percentiles
          if (isNormalizedFormat && isPercentile) {
            const variable = params.data?.variable;
            if (variable) {
              return formatNormalizedValue(parseFloat(raw), variable);
            }
          }
          
          // Handle wide format
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
            <h3 className="text-lg font-normal text-gray-600">Survey Preview</h3>
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

  // Early return if file is undefined or null
  if (!file || !file.id) {
    return (
      <div className="p-4 text-center text-gray-500">
        No survey selected or survey data not available.
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
          <h3 className="text-lg font-normal text-gray-600">Survey Preview</h3>
          <button
              onClick={() => {
                onFilterChange('specialty', '');
                onFilterChange('providerType', '');
                onFilterChange('region', '');
                onFilterChange('variable', '');
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
              {(globalFilters.specialty || globalFilters.providerType || globalFilters.region || globalFilters.variable) && (
                <svg className="absolute -top-1 -right-1 w-3 h-3 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-xs">Clear Filters</span>
          </button>
        </div>

        {/* Filter Dropdowns - Perfectly Aligned */}
        <div className="grid grid-cols-4 gap-4">
          <FormControl fullWidth size="small">
            <Autocomplete
              value={globalFilters.specialty}
              onChange={(event: any, newValue: string | null) => {
                const syntheticEvent = {
                  target: {
                    name: 'specialty',
                    value: newValue || ''
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              options={cascadingFilterOptions.specialties}
              getOptionLabel={(option: string) => option ? formatSpecialtyForDisplay(option) : ''}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  placeholder="All Specialties"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      height: '40px',
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
                />
              )}
              filterOptions={(options: string[], { inputValue }: { inputValue: string }) => filterSpecialtyOptions(options, inputValue)}
              clearOnBlur={false}
              blurOnSelect={true}
            />
          </FormControl>

          <FormControl fullWidth size="small">
            <Select
              value={globalFilters.providerType}
              onChange={(event: any) => {
                const syntheticEvent = {
                  target: {
                    name: 'providerType',
                    value: event.target.value
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  height: '40px',
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
            >
              <MenuItem value="" sx={{ color: '#6b7280' }}>
                All Provider Types
              </MenuItem>
              {cascadingFilterOptions.providerTypes.map((providerType) => (
                <MenuItem key={providerType} value={providerType}>
                  {providerType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <Select
              value={globalFilters.region}
              onChange={(event: any) => {
                const syntheticEvent = {
                  target: {
                    name: 'region',
                    value: event.target.value
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  height: '40px',
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
            >
              <MenuItem value="" sx={{ color: '#6b7280' }}>
                All Regions
              </MenuItem>
              {cascadingFilterOptions.regions.map((region) => (
                <MenuItem key={region} value={region}>
                  {region}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <Select
              value={globalFilters.variable}
              onChange={(event: any) => {
                const syntheticEvent = {
                  target: {
                    name: 'variable',
                    value: event.target.value
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  height: '40px',
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
            >
              <MenuItem value="" sx={{ color: '#6b7280' }}>
                All Variables
              </MenuItem>
              {cascadingFilterOptions.variables.map((variable) => (
                <MenuItem key={variable} value={variable}>
                  {variable}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </Box>

      {/* Data Table - AG Grid as primary */}
      <div className="relative mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm" style={{ width: '100%', height: '600px' }}>
        {/* Subtle refreshing overlay - positioned above the grid */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 bg-white bg-opacity-90 flex items-center justify-center z-10 py-4">
            <UnifiedLoadingSpinner
              message="Updating data..."
              recordCount={0}
              progress={progress}
              showProgress={true}
            />
          </div>
        )}
        <AgGridWrapper
            onGridReady={(params: any) => {
              setGridApi(params.api);
              setColumnApi(params.columnApi);
              
              // Pass grid API to parent component immediately
              if (onGridReady) {
                onGridReady(params.api);
                console.log('Grid API passed to parent component');
              }
              
              // Google-style intelligent sizing when grid is ready
              if (params.api) {
                const intelligentSizing = () => {
                  try {
                    // Step 1: Auto-size based on content
                    if (params.api.autoSizeAllColumns) {
                      params.api.autoSizeAllColumns();
                    }
                    // Step 2: Size to fit container intelligently
                    if (params.api.sizeColumnsToFit) {
                      params.api.sizeColumnsToFit();
                    }
                    console.log('Initial intelligent sizing successful');
                  } catch (error) {
                    console.log('Initial intelligent sizing failed:', error);
                  }
                };
                
                // Multiple attempts with progressive delays for more reliable sizing
                setTimeout(intelligentSizing, 100);
                setTimeout(intelligentSizing, 300);
                setTimeout(intelligentSizing, 600);
                setTimeout(intelligentSizing, 1000);
              }
            }}
            rowData={filteredData.map((row) => {
              const obj: Record<string, string> = {};
              previewHeaders.forEach((header, idx) => {
                obj[header] = row[idx];
              });
              return obj;
            })}
            columnDefs={createColumnDefs()}
            pagination={filteredData.length > 0}
            defaultColDef={{ sortable: true, filter: true, resizable: true }}
            suppressRowClickSelection={true}
            components={{
              CustomHeader: CustomHeader
            }}
            domLayout="normal"
            suppressRowHoverHighlight={true}
            rowHeight={36}
            suppressColumnVirtualisation={false}
            suppressHorizontalScroll={false}
          />
      </div>
    </div>
  );
};

export default DataPreview; 