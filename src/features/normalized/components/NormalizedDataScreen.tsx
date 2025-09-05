import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Box, Typography, Alert, Button, FormControl, Autocomplete, TextField } from '@mui/material';
import { getDataService } from '../../../services/DataService';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import { FunnelIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { ModernPagination } from '../../../shared/components/ModernPagination';

// Lazy load AG Grid to reduce initial bundle size
const AgGridWrapper = lazy(() => import('../../../components/AgGridWrapper'));

// Custom header component for pinning columns - matching upload screen exactly
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

export const NormalizedDataScreen: React.FC = () => {
  const [data, setData] = useState<NormalizedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<any | null>(null);
  const [columnApi, setColumnApi] = useState<any | null>(null);
  
  // Pagination state - matching upload screen exactly
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Filter state - matching upload screen exactly
  const [globalFilters, setGlobalFilters] = useState({
    specialty: '',
    providerType: '',
    region: '',
    variable: ''
  });

  // Help state
  const [showHelp, setShowHelp] = useState(false);



  const dataService = getDataService();

  // Cascading filter options - matching upload screen exactly
  const cascadingFilterOptions = useMemo(() => {
    const specialties = [...new Set(data.map(row => row.originalSpecialty))].sort();
    const providerTypes = [...new Set(data.map(row => row.originalProviderType))].sort();
    const regions = [...new Set(data.map(row => row.originalRegion))].sort();
    const variables = [...new Set(data.map(row => {
      // Extract variable from raw data if available
      return row.rawData?.variable || row.rawData?.Variable || 'Unknown';
    }))].sort();

    return {
      specialties: specialties.filter(s => s && s !== 'Unknown'),
      providerTypes: providerTypes.filter(p => p && p !== 'Unknown'),
      regions: regions.filter(r => r && r !== 'Unknown'),
      variables: variables.filter(v => v && v !== 'Unknown')
    };
  }, [data]);

  // Filtered data - matching upload screen logic
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const specialtyMatch = !globalFilters.specialty || 
        row.originalSpecialty.toLowerCase().includes(globalFilters.specialty.toLowerCase());
      const providerTypeMatch = !globalFilters.providerType || 
        row.originalProviderType.toLowerCase().includes(globalFilters.providerType.toLowerCase());
      const regionMatch = !globalFilters.region || 
        row.originalRegion.toLowerCase().includes(globalFilters.region.toLowerCase());
      const variableMatch = !globalFilters.variable || 
        (row.rawData?.variable || row.rawData?.Variable || '').toLowerCase().includes(globalFilters.variable.toLowerCase());

      return specialtyMatch && providerTypeMatch && regionMatch && variableMatch;
    });
  }, [data, globalFilters]);

  // Paginated data - matching upload screen exactly
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  // Pagination handlers - matching upload screen exactly
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Calculate total pages
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Handle filter changes - matching upload screen exactly
  const handleFilterChange = (event: any) => {
    const { name, value } = event.target;
    setGlobalFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Clear all filters - matching upload screen exactly
  const clearFilters = () => {
    setGlobalFilters({
      specialty: '',
      providerType: '',
      region: '',
      variable: ''
    });
  };

  // Load normalized data
  useEffect(() => {
    const loadNormalizedData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Loading normalized data...');
        
        // Get all surveys and their data
        const surveys = await dataService.getAllSurveys();
        console.log(`🔍 Found ${surveys.length} surveys`);
        
        const allNormalizedRows: NormalizedRow[] = [];
        
        for (const survey of surveys) {
          try {
            console.log(`🔍 Processing survey: ${survey.name} (${survey.type})`);
            
            // Get survey data
            const surveyData = await dataService.getSurveyData(survey.id);
            console.log(`🔍 Survey ${survey.name} returned ${surveyData.rows.length} rows`);
            
            // Get mappings for this survey
            const specialtyMappings = await dataService.getAllSpecialtyMappings();
            const regionMappings = await dataService.getRegionMappings();
            const columnMappings = await dataService.getAllColumnMappings();
            
            // Normalize each row
            const normalizedRows = surveyData.rows.map((row: any, index: number) => {
                             // Normalize specialty
               const normalizedSpecialty = normalizeSpecialty(
                 row.specialty || row.surveySpecialty || row.Specialty || 'Unknown',
                 specialtyMappings,
                 survey.type
               );
               
               // Normalize provider type (hardcoded for now)
               const normalizedProviderType = normalizeProviderType(
                 row.provider_type || row.providerType || row['Provider Type'] || 'Physician'
               );
              
                             // Normalize region using mappings first, then fallback logic
               const normalizedRegion = normalizeRegion(
                 row.geographic_region || row.region || row.geographicRegion || row.Region || 'National',
                 regionMappings,
                 survey.type
               );
               
                               // Extract percentile values and determine metric type from the variable field
                let p25 = 0, p50 = 0, p75 = 0, p90 = 0;
                let metricType = 'Unknown';
                
                // Debug: Log the first row to see what columns are available
                if (index === 0) {
                  console.log('🔍 First row columns:', Object.keys(row));
                  console.log('🔍 First row sample data:', row);
                }
                
                // Extract percentile values directly from the clean column names
                p25 = parseFloat(row.p25 || '0') || 0;
                p50 = parseFloat(row.p50 || '0') || 0;
                p75 = parseFloat(row.p75 || '0') || 0;
                p90 = parseFloat(row.p90 || '0') || 0;
                
                // Determine metric type from the variable field
                const variable = row.variable || '';
                if (variable.toLowerCase().includes('rvu') || variable.toLowerCase().includes('relative value')) {
                  metricType = 'wRVU';
                } else if (variable.toLowerCase().includes('salary') || variable.toLowerCase().includes('compensation') || 
                           variable.toLowerCase().includes('total cash') || variable.toLowerCase().includes('tcc')) {
                  metricType = 'TCC';
                } else if (variable.toLowerCase().includes('conversion') || variable.toLowerCase().includes('cf')) {
                  metricType = 'CF';
                } else {
                  // Use the variable name as the metric type if it doesn't match known patterns
                  metricType = variable || 'Unknown';
                }
                
                if (index === 0) {
                  console.log('🔍 Extracted data:', { p25, p50, p75, p90, metricType, variable });
                }
               
                               // Debug: Log the processed data for the first row
                if (index === 0) {
                  console.log('🔍 Processed row data:', {
                    p25, p50, p75, p90, metricType,
                    originalSpecialty: row.specialty || row.surveySpecialty || row.Specialty || 'Unknown',
                    n_orgs: row.n_orgs || row.N_orgs || row.n_org || row.N_org || 0
                  });
                }
                
                return {
                 id: `${survey.id}-${index}`,
                 surveyId: survey.id,
                 surveyName: survey.name,
                 surveyType: survey.type,
                 surveyYear: survey.year?.toString() || 'Unknown',
                                  originalSpecialty: row.specialty || row.surveySpecialty || row.Specialty || 'Unknown',
                  normalizedSpecialty,
                  originalProviderType: row.provider_type || row.providerType || row['Provider Type'] || 'Unknown',
                  normalizedProviderType,
                  originalRegion: row.geographic_region || row.region || row.geographicRegion || row.Region || 'Unknown',
                normalizedRegion,
                                                  n_orgs: parseInt(row.n_orgs || row.N_orgs || row.n_org || row.N_org || '0') || 0,
                  n_incumbents: parseInt(row.n_incumbents || row.N_incumbents || row.n_incumbent || row.N_incumbent || '0') || 0,
                  p25,
                  p50,
                  p75,
                  p90,
                  metricType,
                rawData: row
              };
            });
            
            allNormalizedRows.push(...normalizedRows);
            
          } catch (error) {
            console.error(`🔍 Error processing survey ${survey.name}:`, error);
          }
        }
        
        console.log(`🔍 Total normalized rows: ${allNormalizedRows.length}`);
        setData(allNormalizedRows);
        
      } catch (error) {
        console.error('🔍 Error loading normalized data:', error);
        setError('Failed to load normalized data');
      } finally {
        setLoading(false);
      }
    };

    loadNormalizedData();
  }, [dataService]);

  // Normalization functions (copied from AnalyticsDataService)
  const normalizeSpecialty = (specialty: string, mappings: any[], surveySource: string): string => {
    if (!specialty || specialty === 'Unknown') return 'Unknown';
    
    // Find mapping that includes this specialty
    for (const mapping of mappings) {
      const hasSourceSpecialty = mapping.sourceSpecialties.some((source: any) => 
        source.surveySource === surveySource && 
        source.specialty.toLowerCase() === specialty.toLowerCase()
      );
      
      if (hasSourceSpecialty) {
        // Return properly capitalized standardized name
        return mapping.standardizedName;
      }
    }
    
    // If no mapping found, return original with proper capitalization
    return capitalizeSpecialty(specialty);
  };

  // Helper function to properly capitalize specialty names
  const capitalizeSpecialty = (specialty: string): string => {
    if (!specialty) return specialty;
    
    // Handle common specialty patterns
    return specialty
      .toLowerCase()
      .split(/[\s\-_]+/) // Split on spaces, hyphens, or underscores
      .map(word => {
        // Capitalize first letter of each word
        if (word.length > 0) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join(' ');
  };

  const normalizeProviderType = (providerType: string): string => {
    if (!providerType || providerType === 'Physician') return 'Physician';
    
    const lower = providerType.toLowerCase();
    
    if (lower.includes('physician') || lower.includes('md') || lower.includes('do')) {
      return 'Physician';
    } else if (lower.includes('nurse practitioner') || lower.includes('np')) {
      return 'Nurse Practitioner';
    } else if (lower.includes('physician assistant') || lower.includes('pa')) {
      return 'Physician Assistant';
    }
    
    return providerType;
  };

  const normalizeRegion = (region: string, mappings: any[], surveySource: string): string => {
    if (!region || region === 'National') return 'National';
    
    // First, try to find a mapping that includes this region
    for (const mapping of mappings) {
      const hasSourceRegion = mapping.sourceRegions.some((source: any) => 
        source.surveySource === surveySource && 
        source.region.toLowerCase() === region.toLowerCase()
      );
      
      if (hasSourceRegion) {
        // Return the standardized region name from the mapping
        return mapping.standardizedName;
      }
    }
    
    // If no mapping found, use fallback logic
    const lower = region.toLowerCase();
    
    if (lower.includes('west') || lower.includes('western')) {
      return 'West';
    } else if (lower.includes('east') || lower.includes('eastern')) {
      return 'East';
    } else if (lower.includes('midwest') || lower.includes('central')) {
      return 'Midwest';
    } else if (lower.includes('south') || lower.includes('southern')) {
      return 'South';
    }
    
    return region;
  };

  // AG Grid column definitions - matching upload screen exactly
  const createColumnDefs = () => {
    return [
      { 
        field: 'surveyName', 
        headerName: 'Survey Name', 
        resizable: true,
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
        field: 'surveyType', 
        headerName: 'Survey Type', 
        resizable: true,
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
        field: 'surveyYear', 
        headerName: 'Year', 
        resizable: true,
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
        field: 'originalSpecialty', 
        headerName: 'Original Specialty', 
        resizable: true,
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
        field: 'normalizedSpecialty', 
        headerName: 'Normalized Specialty', 
        resizable: true,
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
        field: 'originalProviderType', 
        headerName: 'Original Provider Type', 
        resizable: true,
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
        field: 'normalizedProviderType', 
        headerName: 'Normalized Provider Type', 
        resizable: true,
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
        field: 'originalRegion', 
        headerName: 'Original Region', 
        resizable: true,
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
        field: 'normalizedRegion', 
        headerName: 'Normalized Region', 
        resizable: true,
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
        field: 'n_orgs', 
        headerName: 'Organizations', 
        resizable: true,
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
        }
      },
      { 
        field: 'n_incumbents', 
        headerName: 'Incumbents', 
        resizable: true,
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
        }
      },
      { 
        field: 'metricType', 
        headerName: 'Metric Type', 
        resizable: true,
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
      // Percentile columns (P25, P50, P75, P90) - will display TCC, wRVU, or CF based on data
      { 
        field: 'p25', 
        headerName: 'P25', 
        resizable: true,
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
        }
      },
      { 
        field: 'p50', 
        headerName: 'P50', 
        resizable: true,
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
        }
      },
      { 
        field: 'p75', 
        headerName: 'P75', 
        resizable: true,
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
        }
      },
      { 
        field: 'p90', 
        headerName: 'P90', 
        resizable: true,
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
        }
      }
    ];
  };

  // Grid ready handler
  const onGridReady = (params: any) => {
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
  };

     // Auto-fit columns when data changes using AG Grid native methods
   useEffect(() => {
     if (gridApi && paginatedData.length > 0) {
       // Use AG Grid's native auto-sizing - this is what happens when you double-click column borders
       const autoSizeColumns = () => {
         try {
           // This automatically sizes each column to fit its content (header + data)
           gridApi.autoSizeAllColumns();
         } catch (error) {
           console.log('Auto-sizing failed:', error);
         }
       };
       
       // Immediate attempt
       autoSizeColumns();
       
       // Multiple delayed attempts to ensure it works after data rendering
       setTimeout(autoSizeColumns, 100);
       setTimeout(autoSizeColumns, 300);
       setTimeout(autoSizeColumns, 500);
     }
   }, [gridApi, paginatedData]);

               

        

  // Export data
  const exportData = () => {
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: 'normalized_survey_data.csv'
      });
    }
  };

  if (loading) {
    return (
      <Box className="p-6">
        <LoadingSpinner message="Loading normalized data..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="p-6">
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

    return (
      <>
        <Box className="p-6 space-y-6">
             {/* Survey Preview Section - matching upload screen exactly */}
       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3">
             <button
               onClick={() => setShowHelp(true)}
               className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
               aria-label="Show help"
             >
               <LightBulbIcon className="h-5 w-5 text-indigo-600" />
             </button>
             <Typography variant="h6" className="text-gray-900 font-semibold">
               Survey Preview
             </Typography>
           </div>
          <div className="flex items-center gap-3">
            {/* Download Button */}
            <Button
              onClick={exportData}
              startIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              variant="outlined"
              size="small"
              className="text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400"
              disabled={filteredData.length === 0}
            >
              Download Excel
            </Button>
            
            {/* Clear Filters Button */}
            {(globalFilters.specialty || globalFilters.providerType || globalFilters.region || globalFilters.variable) && (
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
                  <svg className="absolute -top-1 -right-1 w-3 h-3 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs">Clear Filters</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Filter Grid - matching upload screen layout exactly */}
        <div className="grid grid-cols-4 gap-4">
          {/* Specialty Filter */}
          <FormControl fullWidth size="small">
            <Autocomplete
              options={cascadingFilterOptions.specialties}
              value={globalFilters.specialty}
              onChange={(event: any, newValue: string | null) => {
                const syntheticEvent = { target: { name: 'specialty', value: newValue || '' } };
                handleFilterChange(syntheticEvent);
              }}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Specialty"
                  placeholder="Search specialties"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )
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
              size="small"
            />
          </FormControl>

          {/* Provider Type Filter */}
          <FormControl fullWidth size="small">
            <Autocomplete
              options={cascadingFilterOptions.providerTypes}
              value={globalFilters.providerType}
              onChange={(event: any, newValue: string | null) => {
                const syntheticEvent = { target: { name: 'providerType', value: newValue || '' } };
                handleFilterChange(syntheticEvent);
              }}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Provider Type"
                  placeholder="Search provider types"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )
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
              size="small"
            />
          </FormControl>

          {/* Geographic Region Filter */}
          <FormControl fullWidth size="small">
            <Autocomplete
              options={cascadingFilterOptions.regions}
              value={globalFilters.region}
              onChange={(event: any, newValue: string | null) => {
                const syntheticEvent = { target: { name: 'region', value: newValue || '' } };
                handleFilterChange(syntheticEvent);
              }}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Geographic Region"
                  placeholder="Search regions"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )
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
              size="small"
            />
          </FormControl>

          {/* Variable Filter */}
          <FormControl fullWidth size="small">
            <Autocomplete
              options={cascadingFilterOptions.variables}
              value={globalFilters.variable}
              onChange={(event: any, newValue: string | null) => {
                const syntheticEvent = { target: { name: 'variable', value: newValue || '' } };
                handleFilterChange(syntheticEvent);
              }}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Variable"
                  placeholder="Search variables"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )
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
              size="small"
            />
          </FormControl>
        </div>
      </div>

                                                                                       {/* Data Table - AG Grid as primary - matching upload screen exactly */}
                                           <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                           <div className="p-4">
                 <div className="w-full min-h-0">
                   <Suspense fallback={<LoadingSpinner message="Loading data table..." size="lg" variant="primary" />}>
                     {/* AG Grid with percentile columns grouped by metric type */}
                                         <AgGridWrapper
                        onGridReady={onGridReady}
                        rowData={paginatedData}
                        columnDefs={createColumnDefs()}
                        pagination={true}
                        paginationPageSize={pageSize}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        defaultColDef={{ sortable: true, filter: true, resizable: true }}
                        suppressRowClickSelection={true}
                        components={{
                          CustomHeader: CustomHeader
                        }}
                        domLayout="autoHeight"
                        suppressRowHoverHighlight={true}
                        rowHeight={36}
                        suppressColumnVirtualisation={false}
                        suppressHorizontalScroll={false}
                      />
                   </Suspense>
                 </div>
               </div>
            

          </div>
      </Box>

             {/* Data Normalization Help Modal - matching specialty mapping exactly */}
       {showHelp && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
                  <LightBulbIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Data Normalization Help</h2>
                  <p className="text-sm text-gray-500">Learn how data normalization works in this system</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

                         {/* Content */}
             <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* How Data Normalization Works Section */}
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h3 className="text-lg font-semibold text-indigo-900 mb-3">How Data Normalization Works</h3>
                <ul className="space-y-2 text-indigo-800">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Standardize specialty names from different surveys into consistent categories</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Map provider types and regions across survey sources for comparison</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Ensure "Cardiology" from one survey can be compared to "Cardio" from another</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Maintain data integrity while enabling cross-survey analysis</span>
                  </li>
                </ul>
              </div>

              {/* Key Features Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Original vs Normalized</h4>
                    <p className="text-sm text-gray-600">See both the raw survey data and the standardized version side by side</p>
                  </div>
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Cross-Survey Comparison</h4>
                    <p className="text-sm text-gray-600">Compare compensation data across different survey sources reliably</p>
                  </div>
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Data Validation</h4>
                    <p className="text-sm text-gray-600">Verify that normalization mappings are working correctly</p>
                  </div>
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Audit Trail</h4>
                    <p className="text-sm text-gray-600">Track how data is transformed from original to normalized format</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowHelp(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NormalizedDataScreen;


