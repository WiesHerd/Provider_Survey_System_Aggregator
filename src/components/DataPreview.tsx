import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
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
import { formatSpecialtyForDisplay } from '../shared/utils/formatters';
import LoadingSpinner from './ui/loading-spinner';

// Lazy load AG Grid to reduce initial bundle size
const AgGridWrapper = lazy(() => import('./AgGridWrapper'));

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
  const dataService = getDataService();
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    console.log('Filter change:', {
      name: event.target.name,
      value: event.target.value,
      currentFilters: globalFilters
    });
    onFilterChange(event.target.name, event.target.value);
  };

  useEffect(() => {
    let isCancelled = false;
    const loadSurveyData = async () => {
      try {
        // Only show loading on initial load, not filter changes
        if (!originalData.length) {
          setIsLoading(true);
        }
        
        // Pass current filters to server for server-side filtering
        const filters = {
          specialty: globalFilters.specialty || undefined,
          providerType: globalFilters.providerType || undefined,
          region: globalFilters.region || undefined
        };
        
        const { rows: surveyData } = await dataService.getSurveyData(
          file.id,
          filters,
          { limit: 10000 } // Fetch all data (up to 10,000 rows)
        );
        
        if (!isCancelled && surveyData.length > 0) {
          // Store original data for filtering
          setOriginalData(surveyData);
          
          // Prefer original CSV header order from survey metadata if available
          let headers: string[] = [];
          try {
            // For IndexedDB, we'll use the first row's keys as headers
            headers = Object.keys(surveyData[0]);
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
  }, [file.id]); // Removed globalFilters dependency to prevent flickering

  // Separate effect for filter changes with debouncing
  useEffect(() => {
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout;
    
    console.log('Filter effect triggered:', {
      specialty: globalFilters.specialty,
      providerType: globalFilters.providerType,
      region: globalFilters.region
    });
    
    const loadFilteredData = async () => {
      try {
        setIsRefreshing(true);
        
        const filters = {
          specialty: globalFilters.specialty || undefined,
          providerType: globalFilters.providerType || undefined,
          region: globalFilters.region || undefined
        };
        
        console.log('Loading filtered data with filters:', filters);
        
        const { rows: surveyData } = await dataService.getSurveyData(
          file.id,
          filters,
          { limit: 10000 } // Fetch all data (up to 10,000 rows)
        );
        
        console.log('Filtered data returned:', {
          rowCount: surveyData.length,
          sampleRows: surveyData.slice(0, 3),
          sampleSpecialties: [...new Set(surveyData.map(row => row.specialty))].slice(0, 5)
        });
        
        if (!isCancelled && surveyData.length > 0) {
          setOriginalData(surveyData);
          
          // Reuse existing headers if available
          let headers: string[] = [];
          if (previewData[0] && previewData[0].length > 0) {
            headers = previewData[0];
          } else {
            try {
              // For IndexedDB, we'll use the first row's keys as headers
              headers = Object.keys(surveyData[0]);
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
  }, [globalFilters.specialty, globalFilters.providerType, globalFilters.region, file.id]);

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
        
        console.log('Detected field names:', {
          specialtyField,
          providerTypeField,
          regionField
        });
        
        const specialties = [...new Set(rows.map(row => String(row[specialtyField] || '')).filter(Boolean))].sort();
        const providerTypes = [...new Set(rows.map(row => String(row[providerTypeField] || '')).filter(Boolean))].sort();
        const regions = [...new Set(rows.map(row => String(row[regionField] || '')).filter(Boolean))].sort();
        
        console.log('Extracted filter options:', {
          specialties: specialties.slice(0, 10),
          providerTypes: providerTypes.slice(0, 10),
          regions: regions.slice(0, 10),
          totalSpecialties: specialties.length,
          totalProviderTypes: providerTypes.length,
          totalRegions: regions.length
        });
        
        setServerSpecialties(specialties);
        setServerProviderTypes(providerTypes);
        setServerRegions(regions);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
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

    console.log('Filtering data with current filters:', globalFilters);
    console.log('Original data count:', originalData.length);

    // Apply client-side filtering since server-side filtering isn't working
    let filteredRows = originalData;
    
    // Filter by specialty
    if (globalFilters.specialty) {
      filteredRows = filteredRows.filter(row => {
        const rowSpecialty = String(row.specialty || '').toLowerCase();
        const filterSpecialty = globalFilters.specialty.toLowerCase();
        return rowSpecialty.includes(filterSpecialty) || filterSpecialty.includes(rowSpecialty);
      });
      console.log('After specialty filter:', filteredRows.length, 'rows');
    }
    
    // Filter by provider type
    if (globalFilters.providerType) {
      filteredRows = filteredRows.filter(row => {
        const rowProviderType = String(row.providerType || row.provider_type || '').toLowerCase();
        const filterProviderType = globalFilters.providerType.toLowerCase();
        return rowProviderType.includes(filterProviderType) || filterProviderType.includes(rowProviderType);
      });
      console.log('After provider type filter:', filteredRows.length, 'rows');
    }
    
    // Filter by region
    if (globalFilters.region) {
      filteredRows = filteredRows.filter(row => {
        const rowRegion = String(row.geographicRegion || row.region || '').toLowerCase();
        const filterRegion = globalFilters.region.toLowerCase();
        return rowRegion.includes(filterRegion) || filterRegion.includes(rowRegion);
      });
      console.log('After region filter:', filteredRows.length, 'rows');
    }

    // Convert filtered data to display format
    if (filteredRows.length > 0 && previewData[0]) {
      const headers = previewData[0];
      const data = filteredRows.map(row => headers.map(header => String(row[header as keyof typeof row] || '')));
      console.log('Final filtered data:', data.length, 'rows');
      return data;
    }

    console.log('No data after filtering');
    return [];
  }, [originalData, stats, previewData, globalFilters.specialty, globalFilters.providerType, globalFilters.region]);



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
    console.log('Creating column defs for headers:', headers);
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
            <Autocomplete
              options={cascadingFilterOptions.specialties}
              value={globalFilters.specialty}
              onChange={(event: any, newValue: string | null) => {
                console.log('Autocomplete specialty change:', {
                  newValue,
                  currentFilters: globalFilters
                });
                // Use the same pattern as other dropdowns
                const syntheticEvent = {
                  target: {
                    name: 'specialty',
                    value: newValue || ''
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              filterOptions={(options: string[], { inputValue }: { inputValue: string }) => {
                return options.filter((option: string) =>
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
              }}
              getOptionLabel={(option: string) => formatSpecialtyForDisplay(option)}
              isOptionEqualToValue={(option: string, value: string) => option === value}
              clearOnBlur={false}
              selectOnFocus
              freeSolo
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Specialty"
                                     placeholder="Search specialties"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <svg className="w-4 h-4 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                    '& .MuiAutocomplete-input': {
                      padding: '8px 12px',
                    },
                    '& .MuiAutocomplete-inputRoot': {
                      padding: '0 8px',
                    },
                  }}
                />
              )}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
                '& .MuiAutocomplete-input': {
                  padding: '8px 12px',
                },
                '& .MuiAutocomplete-inputRoot': {
                  padding: '0 8px',
                },
              }}
            />
          </FormControl>

          <FormControl fullWidth size="small">
            <Autocomplete
              options={cascadingFilterOptions.providerTypes}
              value={globalFilters.providerType}
              onChange={(event: any, newValue: string | null) => {
                const syntheticEvent = {
                  target: {
                    name: 'providerType',
                    value: newValue || ''
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              filterOptions={(options: string[], { inputValue }: { inputValue: string }) => {
                return options.filter((option: string) =>
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
              }}
              getOptionLabel={(option: string) => option}
              isOptionEqualToValue={(option: string, value: string) => option === value}
              clearOnBlur={false}
              selectOnFocus
              freeSolo
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Provider Type"
                                     placeholder="Search provider types"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <svg className="w-4 h-4 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                    '& .MuiAutocomplete-input': {
                      padding: '8px 12px',
                    },
                    '& .MuiAutocomplete-inputRoot': {
                      padding: '0 8px',
                    },
                  }}
                />
              )}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
                '& .MuiAutocomplete-input': {
                  padding: '8px 12px',
                },
                '& .MuiAutocomplete-inputRoot': {
                  padding: '0 8px',
                },
              }}
            />
          </FormControl>

          <FormControl fullWidth size="small">
            <Autocomplete
              options={cascadingFilterOptions.regions}
              value={globalFilters.region}
              onChange={(event: any, newValue: string | null) => {
                const syntheticEvent = {
                  target: {
                    name: 'region',
                    value: newValue || ''
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              filterOptions={(options: string[], { inputValue }: { inputValue: string }) => {
                return options.filter((option: string) =>
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
              }}
              getOptionLabel={(option: string) => option}
              isOptionEqualToValue={(option: string, value: string) => option === value}
              clearOnBlur={false}
              selectOnFocus
              freeSolo
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Geographic Region"
                                     placeholder="Search regions"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <svg className="w-4 h-4 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                    '& .MuiAutocomplete-input': {
                      padding: '8px 12px',
                    },
                    '& .MuiAutocomplete-inputRoot': {
                      padding: '0 8px',
                    },
                  }}
                />
              )}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
                '& .MuiAutocomplete-input': {
                  padding: '8px 12px',
                },
                '& .MuiAutocomplete-inputRoot': {
                  padding: '0 8px',
                },
              }}
            />
          </FormControl>
        </div>
      </Box>

      {/* Data Table - AG Grid as primary */}
      <div className="relative mt-6 p-4" style={{ width: '100%', height: '600px' }}>
        {/* Subtle refreshing overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
            <LoadingSpinner message="Updating data..." size="sm" variant="primary" />
          </div>
        )}
        <Suspense fallback={<LoadingSpinner message="Loading data table..." size="lg" variant="primary" />}>
          <AgGridWrapper
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
        </Suspense>
      </div>
    </div>
  );
};

export default DataPreview; 