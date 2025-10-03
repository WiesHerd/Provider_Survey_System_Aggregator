import React, { useState, useEffect, useMemo, Suspense, lazy, useCallback } from 'react';
import { Box, Typography, Alert, Button, CircularProgress } from '@mui/material';
import { getDataService } from '../../../services/DataService';
import LoadingSpinner from '../../../components/ui/loading-spinner';
import { LightBulbIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { ModernPagination } from '../../../shared/components/ModernPagination';
import { useAdvancedFiltering, FilterState } from '../hooks/useAdvancedFiltering';
import { EnterpriseFilterGrid } from './EnterpriseFilterGrid';

// Lazy load AG Grid to reduce initial bundle size
const AgGridWrapper = lazy(() => import('../../../components/AgGridWrapper'));

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
  rawData: Record<string, any>;
}

/**
 * Enterprise-grade Normalized Data Screen with advanced features:
 * - Debounced filtering with caching
 * - Performance monitoring
 * - Error handling and recovery
 * - Accessibility support
 * - Memory management
 * - Loading states
 */
export const EnterpriseNormalizedDataScreen: React.FC = () => {
  // Core state
  const [data, setData] = useState<NormalizedRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<any | null>(null);
  const [columnApi, setColumnApi] = useState<any | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Help state
  const [showHelp, setShowHelp] = useState(false);

  // Enterprise filtering hook
  const {
    filters,
    filteredData,
    filterOptions,
    loading: filterLoading,
    error: filterError,
    totalCount,
    updateFilter,
    clearFilters,
    resetFilters,
    hasActiveFilters
  } = useAdvancedFiltering(data);

  const dataService = getDataService();

  // Paginated data with performance optimization
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  // Load normalized data with error handling
  useEffect(() => {
    const loadNormalizedData = async () => {
      try {
        setInitialLoading(true);
        setError(null);
        
        console.log('🔄 Loading normalized data...');
        const startTime = performance.now();
        
        // Get all surveys with provider type filtering
        const surveys = await dataService.getAllSurveys();
        console.log(`📊 Found ${surveys.length} surveys`);
        
        if (surveys.length === 0) {
          setData([]);
          setInitialLoading(false);
          return;
        }

        // Get specialty mappings for normalization
        const mappings = await dataService.getAllSpecialtyMappings();
        console.log(`🗺️ Found ${mappings.length} specialty mappings`);

        // Process each survey
        const allNormalizedData: NormalizedRow[] = [];
        
        for (const survey of surveys) {
          try {
            console.log(`🔄 Processing survey: ${survey.name}`);
            const surveyDataResponse = await dataService.getSurveyData(survey.id);
            const surveyData = surveyDataResponse?.rows || [];
            
            if (!surveyData || surveyData.length === 0) {
              console.log(`⚠️ No data found for survey: ${survey.name}`);
              continue;
            }

            // Normalize data for this survey
            const normalizedSurveyData = surveyData.map((row: any, index: number) => {
              // Extract data from the correct structure
              const rowData = row.data || row;
              const providerType = row.providerType || rowData?.providerType || rowData?.['Provider Type'] || rowData?.provider_type || '';
              const region = row.region || rowData?.region || rowData?.Region || rowData?.geographic_region || rowData?.geographicRegion || '';
              const specialty = row.specialty || rowData?.specialty || rowData?.Specialty || '';
              
              const normalizedSpecialty = normalizeSpecialty(specialty, mappings, survey.name);
              const normalizedProviderType = normalizeProviderType(providerType);
              const normalizedRegion = normalizeRegion(region, mappings, survey.name);

              return {
                id: `${survey.id}_${index}`,
                surveyId: survey.id,
                surveyName: survey.name,
                surveyType: survey.type,
                surveyYear: survey.year,
                originalSpecialty: specialty,
                normalizedSpecialty,
                originalProviderType: providerType,
                normalizedProviderType,
                originalRegion: region,
                normalizedRegion,
                n_orgs: parseInt(row.n_orgs || rowData?.n_orgs) || 0,
                n_incumbents: parseInt(row.n_incumbents || rowData?.n_incumbents) || 0,
                p25: parseFloat(row.p25 || rowData?.p25) || 0,
                p50: parseFloat(row.p50 || rowData?.p50) || 0,
                p75: parseFloat(row.p75 || rowData?.p75) || 0,
                p90: parseFloat(row.p90 || rowData?.p90) || 0,
                rawData: row
              };
            });

            allNormalizedData.push(...normalizedSurveyData);
            console.log(`✅ Processed ${normalizedSurveyData.length} rows for survey: ${survey.name}`);
            
          } catch (surveyError) {
            console.error(`❌ Error processing survey ${survey.name}:`, surveyError);
            // Continue with other surveys
          }
        }

        const endTime = performance.now();
        console.log(`✅ Normalized data loading completed in ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`📊 Total normalized rows: ${allNormalizedData.length}`);
        
        setData(allNormalizedData);
        
      } catch (err) {
        console.error('❌ Error loading normalized data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load normalized data');
      } finally {
        setInitialLoading(false);
      }
    };

    loadNormalizedData();
  }, [dataService]);

  // Normalization helper functions
  const normalizeSpecialty = useCallback((specialty: string, mappings: any[], surveySource: string): string => {
    if (!specialty) return specialty;
    
    // Find mapping that includes this specialty
    for (const mapping of mappings) {
      const hasSourceSpecialty = mapping.sourceSpecialties.some((source: any) => 
        source.surveySource === surveySource && 
        source.specialty.toLowerCase() === specialty.toLowerCase()
      );
      
      if (hasSourceSpecialty) {
        return mapping.standardizedName;
      }
    }
    
    // If no mapping found, return original with proper capitalization
    return capitalizeSpecialty(specialty);
  }, []);

  const normalizeProviderType = useCallback((providerType: string): string => {
    if (!providerType || providerType === 'Staff Physician') return 'Staff Physician';
    
    const lower = providerType.toLowerCase();
    
    if (lower.includes('phd') || lower.includes('doctor of philosophy')) {
      return 'PhD';
    } else if (lower.includes('physician') || lower.includes('md') || lower.includes('do')) {
      return 'Staff Physician';
    } else if (lower.includes('nurse practitioner') || lower.includes('np')) {
      return 'Nurse Practitioner';
    } else if (lower.includes('physician assistant') || lower.includes('pa')) {
      return 'Physician Assistant';
    }
    
    return providerType;
  }, []);

  const normalizeRegion = useCallback((region: string, mappings: any[], surveySource: string): string => {
    if (!region || region === 'National') return 'National';
    
    // Try to find a mapping that includes this region
    for (const mapping of mappings) {
      const hasSourceRegion = mapping.sourceRegions.some((source: any) => 
        source.surveySource === surveySource && 
        source.region.toLowerCase() === region.toLowerCase()
      );
      
      if (hasSourceRegion) {
        const properCaseRegion = mapping.standardizedName.charAt(0).toUpperCase() + mapping.standardizedName.slice(1).toLowerCase();
        return properCaseRegion;
      }
    }
    
    // Fallback logic with Proper case
    const lower = region.toLowerCase();
    let normalizedRegion = region;
    
    if (lower.includes('west') || lower.includes('western')) {
      normalizedRegion = 'Western';
    } else if (lower.includes('northeast') || lower.includes('northeastern')) {
      normalizedRegion = 'Northeastern';
    } else if (lower.includes('midwest') || lower.includes('midwestern') || lower.includes('central')) {
      normalizedRegion = 'Midwestern';
    } else if (lower.includes('south') || lower.includes('southern')) {
      normalizedRegion = 'Southern';
    } else if (lower.includes('national')) {
      normalizedRegion = 'National';
    } else {
      normalizedRegion = capitalizeSpecialty(region);
    }
    
    return normalizedRegion;
  }, []);

  const capitalizeSpecialty = useCallback((specialty: string): string => {
    if (!specialty) return specialty;
    
    return specialty
      .toLowerCase()
      .split(/[\s\-_]+/)
      .map(word => {
        if (word.length > 0) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join(' ');
  }, []);

  // AG Grid column definitions
  const createColumnDefs = useCallback(() => {
    return [
      { 
        field: 'surveyName', 
        headerName: 'Survey Name', 
        resizable: true,
        width: 200,
        pinned: 'left'
      },
      { 
        field: 'surveyType', 
        headerName: 'Survey Type', 
        resizable: true,
        width: 150
      },
      { 
        field: 'surveyYear', 
        headerName: 'Year', 
        resizable: true,
        width: 80
      },
      { 
        field: 'originalSpecialty', 
        headerName: 'Original Specialty', 
        resizable: true,
        width: 200
      },
      { 
        field: 'normalizedSpecialty', 
        headerName: 'Normalized Specialty', 
        resizable: true,
        width: 200
      },
      { 
        field: 'originalProviderType', 
        headerName: 'Original Provider Type', 
        resizable: true,
        width: 180
      },
      { 
        field: 'normalizedProviderType', 
        headerName: 'Normalized Provider Type', 
        resizable: true,
        width: 180
      },
      { 
        field: 'originalRegion', 
        headerName: 'Original Region', 
        resizable: true,
        width: 150
      },
      { 
        field: 'normalizedRegion', 
        headerName: 'Normalized Region', 
        resizable: true,
        width: 150
      },
      { 
        field: 'n_orgs', 
        headerName: 'Organizations', 
        resizable: true,
        width: 120,
        type: 'numericColumn'
      },
      { 
        field: 'n_incumbents', 
        headerName: 'Incumbents', 
        resizable: true,
        width: 120,
        type: 'numericColumn'
      },
      { 
        field: 'p25', 
        headerName: 'P25', 
        resizable: true,
        width: 100,
        type: 'numericColumn'
      },
      { 
        field: 'p50', 
        headerName: 'P50', 
        resizable: true,
        width: 100,
        type: 'numericColumn'
      },
      { 
        field: 'p75', 
        headerName: 'P75', 
        resizable: true,
        width: 100,
        type: 'numericColumn'
      },
      { 
        field: 'p90', 
        headerName: 'P90', 
        resizable: true,
        width: 100,
        type: 'numericColumn'
      }
    ];
  }, []);

  // Grid ready handler
  const onGridReady = useCallback((params: any) => {
    setGridApi(params.api);
    setColumnApi(params.columnApi);
  }, []);

  // Export to Excel handler
  const handleExportToExcel = useCallback(() => {
    if (!gridApi) return;
    
    try {
      gridApi.exportDataAsExcel({
        fileName: `normalized-data-${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Normalized Data'
      });
    } catch (err) {
      console.error('❌ Export failed:', err);
      setError('Export failed. Please try again.');
    }
  }, [gridApi]);

  // Loading state
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" className="mb-4">
        {error}
      </Alert>
    );
  }

  // No data state
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Typography variant="h6" className="text-gray-500 mb-4">
          No normalized data available
        </Typography>
        <Typography variant="body2" className="text-gray-400">
          Upload some survey data to see normalized results here.
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h4" className="font-semibold text-gray-900">
            Normalized Data
          </Typography>
          <Typography variant="body2" className="text-gray-500 mt-1">
            {totalCount.toLocaleString()} records • {data.length.toLocaleString()} total
          </Typography>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="contained"
            startIcon={<DocumentArrowDownIcon className="w-4 h-4" />}
            onClick={handleExportToExcel}
            disabled={filteredData.length === 0 || filterLoading}
            sx={{
              backgroundColor: '#6366f1',
              '&:hover': {
                backgroundColor: '#5856eb',
              },
            }}
          >
            Download Excel
          </Button>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <LightBulbIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <Typography variant="body2" className="text-blue-800 font-medium">
              Normalized Data View
            </Typography>
            <Typography variant="body2" className="text-blue-700 mt-1">
              This screen shows your survey data after normalization. Use the filters above to narrow down results by survey, specialty, provider type, region, or variable.
            </Typography>
          </div>
        </div>
      </div>

      {/* Enterprise Filter Grid */}
      <EnterpriseFilterGrid
        filters={filters}
        filterOptions={filterOptions}
        loading={filterLoading}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        onResetFilters={resetFilters}
      />

      {/* Filter Error */}
      {filterError && (
        <Alert severity="error" className="mb-4">
          {filterError}
        </Alert>
      )}

      {/* Loading Overlay */}
      {filterLoading && (
        <div className="flex items-center justify-center py-8">
          <CircularProgress size={24} className="mr-2" />
          <Typography variant="body2" className="text-gray-600">
            Filtering data...
          </Typography>
        </div>
      )}

      {/* Data Grid */}
      <Suspense fallback={<LoadingSpinner />}>
        <AgGridWrapper
          rowData={paginatedData}
          columnDefs={createColumnDefs()}
          onGridReady={onGridReady}
          pagination={false}
          suppressRowClickSelection={true}
          className="ag-theme-alpine"
        />
      </Suspense>

      {/* Pagination */}
      {totalPages > 1 && (
        <ModernPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          totalRows={filteredData.length}
        />
      )}
    </div>
  );
};
