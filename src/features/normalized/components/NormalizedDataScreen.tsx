import React, { useState, useEffect, useMemo, Suspense, lazy, useCallback } from 'react';
import {
  FormControl,
  MenuItem,
  Select,
  Box
} from '@mui/material';
import { LightBulbIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getDataService } from '../../../services/DataService';
import { formatSpecialtyForDisplay, formatNormalizedValue } from '../../../shared/utils/formatters';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import { useProviderContext } from '../../../contexts/ProviderContext';

// Lazy load AG Grid to reduce initial bundle size
const AgGridWrapper = lazy(() => import('../../../components/AgGridWrapper'));

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

interface NormalizedRow {
  id: string;
  surveyId: string;
  surveyName: string;
  surveyType: string;
  surveyYear: string;
  originalSpecialty: string;
  normalizedSpecialty: string;
  originalProviderType: string;
  normalizedProviderType: string;
  originalRegion: string;
  normalizedRegion: string;
  n_orgs: number;
  n_incumbents: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  metricType: string; // TCC, wRVU, or CF
  rawData: Record<string, any>;
}

const NormalizedDataScreen: React.FC = () => {
  // Provider context
  const { selectedProviderType } = useProviderContext();
  
  // Core state
  const [data, setData] = useState<NormalizedRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<any | null>(null);
  const [columnApi, setColumnApi] = useState<any | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Filter state
  const [globalFilters, setGlobalFilters] = useState({
    surveyName: '',
    specialty: '',
    providerType: '',
    region: '',
    variable: ''
  });
  
  // Filter options
  const [cascadingFilterOptions, setCascadingFilterOptions] = useState({
    surveyNames: [] as string[],
    specialties: [] as string[],
    providerTypes: [] as string[],
    regions: [] as string[],
    variables: [] as string[]
  });

  const dataService = useMemo(() => getDataService(), []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setInitialLoading(true);
      setError(null);
      
      // Convert UI provider type to data service provider type
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      
      console.log('🔍 NormalizedDataScreen: Loading data with provider type:', { 
        selectedProviderType, 
        dataProviderType 
      });
      
      const surveys = await dataService.getAllSurveys();
      const allData: NormalizedRow[] = [];
      
      for (const survey of surveys) {
        // Filter surveys by provider type if specified
        if (dataProviderType && survey.providerType !== dataProviderType) {
          continue;
        }
        
        const surveyDataResponse = await dataService.getSurveyData(survey.id);
        const surveyData = surveyDataResponse?.rows || [];
        
        surveyData.forEach((row: any, index: number) => {
          allData.push({
            id: `${survey.id}-${index}`,
            surveyId: survey.id,
            surveyName: survey.name || survey.type || 'Unknown',
            surveyType: survey.type || 'Unknown',
            surveyYear: survey.year || 'Unknown',
            originalSpecialty: row.specialty || row.originalSpecialty || '',
            normalizedSpecialty: row.normalizedSpecialty || row.specialty || '',
            originalProviderType: row.providerType || row.originalProviderType || '',
            normalizedProviderType: row.normalizedProviderType || row.providerType || '',
            originalRegion: row.geographicRegion || row.originalRegion || '',
            normalizedRegion: row.normalizedRegion || row.geographicRegion || '',
            n_orgs: row.n_orgs || 0,
            n_incumbents: row.n_incumbents || 0,
            p25: row.p25 || 0,
            p50: row.p50 || 0,
            p75: row.p75 || 0,
            p90: row.p90 || 0,
            metricType: row.metricType || 'TCC',
            rawData: row
          });
        });
      }
      
      setData(allData);
      
      // Extract unique values for filters
      const uniqueValues = {
        surveyNames: [...new Set(allData.map(row => row.surveyName))].sort(),
        specialties: [...new Set(allData.map(row => row.normalizedSpecialty).filter(Boolean))].sort(),
        providerTypes: [...new Set(allData.map(row => row.normalizedProviderType).filter(Boolean))].sort(),
        regions: [...new Set(allData.map(row => row.normalizedRegion).filter(Boolean))].sort(),
        variables: [...new Set(allData.map(row => row.metricType).filter(Boolean))].sort()
      };
      
      setCascadingFilterOptions(uniqueValues);
      
    } catch (err) {
      console.error('Error loading normalized data:', err);
      setError('Failed to load normalized data');
    } finally {
      setInitialLoading(false);
    }
  }, [dataService, selectedProviderType]);

  // Load data on mount and when provider type changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const surveyNameMatch = !globalFilters.surveyName || 
        row.surveyName.toLowerCase().includes(globalFilters.surveyName.toLowerCase());
      const specialtyMatch = !globalFilters.specialty || 
        row.normalizedSpecialty.toLowerCase().includes(globalFilters.specialty.toLowerCase());
      const providerTypeMatch = !globalFilters.providerType || 
        row.normalizedProviderType.toLowerCase().includes(globalFilters.providerType.toLowerCase());
      const regionMatch = !globalFilters.region || 
        row.normalizedRegion.toLowerCase().includes(globalFilters.region.toLowerCase());
      const variableMatch = !globalFilters.variable || 
        row.metricType.toLowerCase().includes(globalFilters.variable.toLowerCase());
      
      return surveyNameMatch && specialtyMatch && providerTypeMatch && regionMatch && variableMatch;
    });
  }, [data, globalFilters]);

  // Auto-fit columns when filtered data changes
  useEffect(() => {
    if (gridApi && filteredData.length > 0) {
      const autoSizeColumns = () => {
        try {
          gridApi.autoSizeAllColumns();
        } catch (error) {
          console.log('Auto-sizing failed:', error);
        }
      };
      
      // Small delay to ensure grid is updated with new data
      setTimeout(autoSizeColumns, 100);
      setTimeout(autoSizeColumns, 300);
      setTimeout(autoSizeColumns, 500);
    }
  }, [gridApi, filteredData]);

  // Handle filter changes
  const handleFilterChange = (filterName: string, value: string) => {
    setGlobalFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setGlobalFilters({
      surveyName: '',
      specialty: '',
      providerType: '',
      region: '',
      variable: ''
    });
  };

  // Create column definitions
  const createColumnDefs = () => {
    const columns = [
      {
        headerName: 'Survey Name',
        field: 'surveyName',
        width: 200,
        pinned: 'left',
        filter: true,
        sortable: true,
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
          isSpecialty: false,
          isNumeric: false
        }
      },
      {
        headerName: 'Survey Type',
        field: 'surveyType',
        width: 150,
        filter: true,
        sortable: true,
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
          isSpecialty: false,
          isNumeric: false
        }
      },
      {
        headerName: 'Year',
        field: 'surveyYear',
        width: 80,
        filter: true,
        sortable: true,
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
          isSpecialty: false,
          isNumeric: false
        }
      },
      {
        headerName: 'Original Specialty',
        field: 'originalSpecialty',
        width: 200,
        filter: true,
        sortable: true,
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
          isSpecialty: true,
          isNumeric: false
        }
      },
      {
        headerName: 'Normalized Specialty',
        field: 'normalizedSpecialty',
        width: 200,
        filter: true,
        sortable: true,
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
          isSpecialty: true,
          isNumeric: false
        }
      },
      {
        headerName: 'Original Provider Type',
        field: 'originalProviderType',
        width: 180,
        filter: true,
        sortable: true,
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
          isSpecialty: false,
          isNumeric: false
        }
      },
      {
        headerName: 'Normalized Provider Type',
        field: 'normalizedProviderType',
        width: 180,
        filter: true,
        sortable: true,
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
          isSpecialty: false,
          isNumeric: false
        }
      },
      {
        headerName: 'Original Region',
        field: 'originalRegion',
        width: 150,
        filter: true,
        sortable: true,
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
          isSpecialty: false,
          isNumeric: false
        }
      },
      {
        headerName: 'Normalized Region',
        field: 'normalizedRegion',
        width: 150,
        filter: true,
        sortable: true,
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
          isSpecialty: false,
          isNumeric: false
        }
      },
      {
        headerName: 'N Orgs',
        field: 'n_orgs',
        width: 100,
        filter: 'agNumberColumnFilter',
        sortable: true,
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
          isSpecialty: false,
          isNumeric: true
        },
        valueFormatter: (params: any) => params.value ? params.value.toLocaleString() : ''
      },
      {
        headerName: 'N Incumbents',
        field: 'n_incumbents',
        width: 120,
        filter: 'agNumberColumnFilter',
        sortable: true,
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
          isSpecialty: false,
          isNumeric: true
        },
        valueFormatter: (params: any) => params.value ? params.value.toLocaleString() : ''
      },
      {
        headerName: 'P25',
        field: 'p25',
        width: 100,
        filter: 'agNumberColumnFilter',
        sortable: true,
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
          isSpecialty: false,
          isNumeric: true
        },
        valueFormatter: (params: any) => params.value ? formatNormalizedValue(params.value, 'TCC') : ''
      },
      {
        headerName: 'P50',
        field: 'p50',
        width: 100,
        filter: 'agNumberColumnFilter',
        sortable: true,
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
          isSpecialty: false,
          isNumeric: true
        },
        valueFormatter: (params: any) => params.value ? formatNormalizedValue(params.value, 'TCC') : ''
      },
      {
        headerName: 'P75',
        field: 'p75',
        width: 100,
        filter: 'agNumberColumnFilter',
        sortable: true,
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
          isSpecialty: false,
          isNumeric: true
        },
        valueFormatter: (params: any) => params.value ? formatNormalizedValue(params.value, 'TCC') : ''
      },
      {
        headerName: 'P90',
        field: 'p90',
        width: 100,
        filter: 'agNumberColumnFilter',
        sortable: true,
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
          isSpecialty: false,
          isNumeric: true
        },
        valueFormatter: (params: any) => params.value ? formatNormalizedValue(params.value, 'TCC') : ''
      },
      {
        headerName: 'Metric Type',
        field: 'metricType',
        width: 120,
        filter: true,
        sortable: true,
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
          isSpecialty: false,
          isNumeric: false
        }
      }
    ];

    return columns;
  };

  if (initialLoading) {
    return (
      <div className="w-full bg-white shadow-sm">
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

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Filter Controls */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider'
      }}>
        {/* Header with Help and Clear Filter Buttons */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 mr-3 hover:bg-gray-100 rounded-lg transition-all duration-200"
              aria-label="Show help"
            >
              <LightBulbIcon className="h-5 w-5 text-indigo-600" />
            </button>
            <h3 className="text-lg font-normal text-gray-600">Normalized Data</h3>
          </div>
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
            title="Clear all filters"
          >
            <div className="relative w-4 h-4 mr-2">
              {/* Funnel Icon */}
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
              </svg>
              {/* X Overlay - Only show when filters are active */}
              {(globalFilters.surveyName || globalFilters.specialty || globalFilters.providerType || globalFilters.region || globalFilters.variable) && (
                <svg className="absolute -top-1 -right-1 w-3 h-3 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-xs">Clear Filters</span>
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-5 gap-4">
          <FormControl fullWidth size="small">
            <Select
              value={globalFilters.surveyName}
              onChange={(event: any) => handleFilterChange('surveyName', event.target.value)}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            >
              <MenuItem value="" sx={{ color: '#6b7280' }}>
                All Survey Names
              </MenuItem>
              {cascadingFilterOptions.surveyNames.map((surveyName) => (
                <MenuItem key={surveyName} value={surveyName}>
                  {surveyName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <Select
              value={globalFilters.specialty}
              onChange={(event: any) => handleFilterChange('specialty', event.target.value)}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            >
              <MenuItem value="" sx={{ color: '#6b7280' }}>
                All Specialties
              </MenuItem>
              {cascadingFilterOptions.specialties.map((specialty) => (
                <MenuItem key={specialty} value={specialty}>
                  {formatSpecialtyForDisplay(specialty)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <Select
              value={globalFilters.providerType}
              onChange={(event: any) => handleFilterChange('providerType', event.target.value)}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
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
              onChange={(event: any) => handleFilterChange('region', event.target.value)}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
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
              onChange={(event: any) => handleFilterChange('variable', event.target.value)}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
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

      {/* Data Table - AG Grid */}
      <div className="relative mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm" style={{ width: '100%', height: '600px' }}>
        <Suspense fallback={<LoadingSpinner message="Loading data table..." size="lg" variant="primary" />}>
          <AgGridWrapper
            onGridReady={(params: any) => {
              setGridApi(params.api);
              setColumnApi(params.columnApi);
              
              // Auto-size columns immediately when grid is ready
              if (params.api) {
                // Small delay to ensure grid is fully initialized
                setTimeout(() => {
                  try {
                    params.api.autoSizeAllColumns();
                  } catch (error) {
                    console.log('Initial auto-sizing failed:', error);
                  }
                }, 50);
              }
            }}
            rowData={filteredData}
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

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowHelp(false)} />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
                    <LightBulbIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Normalized Data View Help</h2>
                    <p className="text-sm text-gray-500">Learn how to use the normalized data view effectively</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  title="Close help"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">What is Normalized Data?</h3>
                  <p className="text-gray-600">
                    Normalized Data shows your survey data after all mapping and standardization has been applied. 
                    This view combines data from different survey sources into a unified format for analysis.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">How it Works</h3>
                  <div className="space-y-2 text-gray-600">
                    <p><strong>Data Integration:</strong> Combines data from multiple survey sources (MGMA, SullivanCotter, Gallagher, etc.) into a single view.</p>
                    <p><strong>Standardized Fields:</strong> All specialty names, provider types, and regions are normalized to consistent formats.</p>
                    <p><strong>Filtering:</strong> Use the dropdown filters to narrow down results by survey, specialty, provider type, region, or variable.</p>
                    <p><strong>Column Pinning:</strong> Click the pin icons next to column headers to freeze important columns while scrolling.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Key Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Data Columns</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Survey Name & Type</li>
                        <li>• Original vs Normalized values</li>
                        <li>• Geographic regions</li>
                        <li>• Provider types</li>
                        <li>• Compensation metrics</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">Interactive Features</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Filter by survey source</li>
                        <li>• Filter by specialty</li>
                        <li>• Filter by provider type</li>
                        <li>• Filter by region</li>
                        <li>• Pin columns for easy viewing</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Tips for Best Results</h3>
                  <div className="space-y-2 text-gray-600">
                    <p>• Use the Survey Name filter to focus on specific data sources</p>
                    <p>• Pin important columns (like Survey Name) to keep them visible while scrolling</p>
                    <p>• Combine multiple filters to narrow down to specific data subsets</p>
                    <p>• Clear all filters to see the complete dataset</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NormalizedDataScreen;