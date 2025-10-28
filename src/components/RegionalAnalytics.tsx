import React, { useEffect, useState, useMemo } from 'react';
import { FormControl, Autocomplete, TextField } from '@mui/material';
import { ISurveyRow } from '../types/survey';
import { getDataService } from '../services/DataService';
import { RegionalComparison } from '../features/regional';
import { UnifiedLoadingSpinner } from '../shared/components/UnifiedLoadingSpinner';
import { useSmoothProgress } from '../shared/hooks/useSmoothProgress';
import { formatSpecialtyForDisplay } from '../shared/utils/formatters';
import { filterSpecialtyOptions } from '../shared/utils/specialtyMatching';
import { AnalyticsDataService } from '../features/analytics/services/analyticsDataService';
import { AggregatedData } from '../features/analytics/types/analytics';

// These will be dynamically populated from region mappings
const DEFAULT_REGION_NAMES = ['National', 'Northeast', 'Midwest', 'South', 'West'];

export const RegionalAnalytics: React.FC = () => {
  // Use smooth progress for dynamic loading
  const { progress, startProgress, completeProgress } = useSmoothProgress({
    duration: 3000,
    maxProgress: 90,
    intervalMs: 100
  });
  
  const [analyticsData, setAnalyticsData] = useState<AggregatedData[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedProviderType, setSelectedProviderType] = useState<string>('');
  const [selectedSurveySource, setSelectedSurveySource] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [mappings, setMappings] = useState<any[]>([]);
  const [regionMappings, setRegionMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔍 Regional Analytics: Starting data load with AnalyticsDataService...');
        
        // Use the same AnalyticsDataService as Survey Analytics
        const analyticsDataService = new AnalyticsDataService();
        analyticsDataService.clearCache(); // Clear cache to get fresh data
        
        // Get all analytics data (same as Survey Analytics)
        const allData = await analyticsDataService.getAnalyticsData({
          specialty: '',
          surveySource: '',
          geographicRegion: '',
          providerType: '',
          year: ''
        });
        
        console.log('🔍 Regional Analytics: Loaded analytics data -', allData.length, 'records');
        console.log('🔍 Regional Analytics: Sample data:', allData[0]);
        
        // Debug: Check what years are in the data
        const yearsInData = Array.from(new Set(allData.map(r => r.surveyYear).filter(Boolean)));
        console.log('🔍 Regional Analytics: Years found in data:', yearsInData);
        
        // Debug: Check survey sources
        const sourcesInData = Array.from(new Set(allData.map(r => r.surveySource).filter(Boolean)));
        console.log('🔍 Regional Analytics: Survey sources found:', sourcesInData);
        
        // Debug: Check what regions are actually in the data
        const regionsInData = Array.from(new Set(allData.map(r => r.geographicRegion).filter(Boolean)));
        console.log('🔍 Regional Analytics: Regions found in data:', regionsInData);
        
        // Debug: Show sample data with regions
        console.log('🔍 Regional Analytics: Sample data with regions:', allData.slice(0, 5).map(r => ({
          standardizedName: r.standardizedName,
          geographicRegion: r.geographicRegion,
          surveySource: r.surveySource,
          surveyYear: r.surveyYear,
          tcc_p50: r.tcc_p50
        })));
        
        // Also load mappings for filter options
        const dataService = getDataService();
        const [allMappings, regionMappings] = await Promise.all([
          dataService.getAllSpecialtyMappings(),
          dataService.getRegionMappings()
        ]);
        
        setAnalyticsData(allData);
        setMappings(allMappings);
        setRegionMappings(regionMappings);
        
        console.log('🔍 Regional Analytics: Data loading complete');
      } catch (error) {
        console.error('Error loading data for Regional Analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Use standardizedName for dropdown
  const specialties = useMemo(() => {
    const specialtyList = mappings.map(m => m.standardizedName).sort();
    console.log('🔍 Regional Analytics - Specialties for dropdown:', {
      mappingsCount: mappings.length,
      specialtiesCount: specialtyList.length,
      firstFewSpecialties: specialtyList.slice(0, 5),
      allSpecialties: specialtyList
    });
    return specialtyList;
  }, [mappings]);

  // Extract unique provider types and survey sources from loaded data
  const providerTypes = useMemo(() => {
    const types = Array.from(new Set(analyticsData.map(r => r.providerType || '').filter(Boolean)));
    console.log('🔍 Regional Analytics - Provider types extraction:', {
      totalRows: analyticsData.length,
      providerTypes: types,
      sampleRows: analyticsData.slice(0, 3).map(r => ({
        providerType: r.providerType,
        surveySource: r.surveySource
      }))
    });
    return types.sort();
  }, [analyticsData]);
  
  const surveySources = useMemo(() => {
    const sources = Array.from(new Set(analyticsData.map(r => r.surveySource || '').filter(Boolean)));
    return sources.sort();
  }, [analyticsData]);

  // Extract available years from survey data
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(analyticsData.map(r => String(r.surveyYear || '')).filter(Boolean)));
    console.log('🔍 Regional Analytics - Available years:', years);
    return years.sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
  }, [analyticsData]);

  // Multi-filter logic with specialty, provider type, survey source, and year
  const filtered = useMemo(() => {
    if (!selectedSpecialty) return [];
    
    console.log(`🔍 Filtering for:`, {
      specialty: selectedSpecialty,
      providerType: selectedProviderType,
      surveySource: selectedSurveySource,
      year: selectedYear
    });
    console.log(`📊 Total rows to filter: ${analyticsData.length}`);
    
    const filteredRows = analyticsData.filter(row => {
      // Specialty filter - use standardizedName from AggregatedData
      if (row.standardizedName !== selectedSpecialty) {
        return false;
      }
      
      // Provider type filter
      if (selectedProviderType) {
        const rowProviderType = String(row.providerType || '');
        if (rowProviderType.toLowerCase() !== selectedProviderType.toLowerCase()) {
          return false;
        }
      }
      
      // Survey source filter
      if (selectedSurveySource) {
        const rowSurveySource = String(row.surveySource || '');
        if (rowSurveySource.toLowerCase() !== selectedSurveySource.toLowerCase()) {
          return false;
        }
      }
      
      // Year filter
      if (selectedYear) {
        const rowYear = String(row.surveyYear || '');
        if (rowYear !== selectedYear) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`✅ Filtered rows found: ${filteredRows.length}`);
    if (filteredRows.length > 0) {
      console.log(`📋 Sample filtered rows with compensation data:`, filteredRows.slice(0, 3).map(row => ({
        standardizedName: row.standardizedName,
        surveySource: row.surveySource,
        geographicRegion: row.geographicRegion,
        surveyYear: row.surveyYear,
          tcc_p50: row.tcc_p50,
          cf_p50: row.cf_p50,
          wrvu_p50: row.wrvu_p50
      })));
    }
    
    return filteredRows;
  }, [selectedSpecialty, selectedProviderType, selectedSurveySource, selectedYear, analyticsData]);

  // Helper to average a field
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // Prepare data for RegionalComparison: average each percentile field for each region
  const regionalComparisonData = useMemo(() => {
    console.log(`📊 Calculating regional comparison data for ${filtered.length} filtered rows`);
    
    // Debug: Check what regions are actually in the filtered data
    const uniqueRegions = Array.from(new Set(filtered.map(r => r.geographicRegion)));
    console.log(`🔍 Unique regions in filtered data:`, uniqueRegions);
    
    // Get standardized region names from mappings or use parent region names from Region Mapping screen
    // National should be first, then others alphabetically
    const standardizedRegions = regionMappings.length > 0 
      ? regionMappings.map(m => m.standardizedName).sort()
      : ['national', 'northeast', 'midwest', 'south', 'west'];
    
    // Ensure National is first
    const orderedRegions = ['national', ...standardizedRegions.filter(r => r !== 'national')];
    
    console.log(`🌍 Using ordered regions:`, orderedRegions);
    
    // Filter out any rows with invalid data - more lenient check
    const validRows = filtered.filter(r => {
      const hasValidTCC = Number(r.tcc_p50) > 0 || Number(r.tcc_p25) > 0 || Number(r.tcc_p75) > 0 || Number(r.tcc_p90) > 0;
      const hasValidCF = Number(r.cf_p50) > 0 || Number(r.cf_p25) > 0 || Number(r.cf_p75) > 0 || Number(r.cf_p90) > 0;
      const hasValidWRVU = Number(r.wrvu_p50) > 0 || Number(r.wrvu_p25) > 0 || Number(r.wrvu_p75) > 0 || Number(r.wrvu_p90) > 0;
      return hasValidTCC || hasValidCF || hasValidWRVU;
    });
    
    console.log(`✅ Valid rows with data: ${validRows.length} out of ${filtered.length}`);
    
    // Helper function to map to parent region names (from Region Mapping screen)
    const mapToParentRegion = (region: string): string => {
      if (!region || region.toLowerCase() === 'national') return 'national';
      
      const lower = region.toLowerCase();
      
      // Map to parent region names from Region Mapping screen
      if (lower.includes('northeast') || lower.includes('northeastern') || lower.includes('ne') || lower.includes('north central')) {
        return 'northeast';
      } else if (lower.includes('southeast') || lower.includes('southern') || lower.includes('se') || lower.includes('south central')) {
        return 'south';
      } else if (lower.includes('midwest') || lower.includes('midwestern') || lower.includes('nc') || lower.includes('great lakes')) {
        return 'midwest';
      } else if (lower.includes('west') || lower.includes('western') || lower.includes('southwest') || lower.includes('sw')) {
        return 'west';
      }
      
      return region.toLowerCase(); // Return lowercase original if no match
    };
    
    const result = orderedRegions.map(regionName => {
      // For 'national' (lowercase), use all valid filtered rows
      const regionRows = regionName.toLowerCase() === 'national'
        ? validRows
        : validRows.filter(r => {
          const parentRegion = mapToParentRegion(r.geographicRegion);
          return parentRegion === regionName.toLowerCase();
        });
      
      console.log(`🔍 Filtering for region "${regionName}": found ${regionRows.length} rows`);
      console.log(`🔍 Available regions in data:`, Array.from(new Set(validRows.map(r => r.geographicRegion).filter(Boolean))));
      console.log(`🔍 Region mapping for ${regionName}:`, validRows.slice(0, 3).map(r => ({
        original: r.geographicRegion,
        parentRegion: mapToParentRegion(r.geographicRegion),
        target: regionName.toLowerCase(),
        matches: mapToParentRegion(r.geographicRegion) === regionName.toLowerCase()
      })));
      if (regionRows.length > 0) {
        console.log(`🔍 Sample rows for ${regionName}:`, regionRows.slice(0, 2).map(r => ({
          region: r.geographicRegion,
          tcc_p50: r.tcc_p50
        })));
      }
      if (regionRows.length > 0) {
        console.log(`📋 Sample rows for ${regionName}:`, regionRows.slice(0, 2).map(r => ({
          standardizedName: r.standardizedName,
          region: r.geographicRegion,
          tcc_p50: r.tcc_p50,
          cf_p50: r.cf_p50,
          wrvu_p50: r.wrvu_p50
        })));
      }
      
      // Calculate simple averages (same as regional calculations utility)
      const calculateAverage = (values: number[]) => {
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      };
      
      const regionData = {
        region: regionName,
        tcc_p25: calculateAverage(regionRows.map(r => Number(r.tcc_p25) || 0)),
        tcc_p50: calculateAverage(regionRows.map(r => Number(r.tcc_p50) || 0)),
        tcc_p75: calculateAverage(regionRows.map(r => Number(r.tcc_p75) || 0)),
        tcc_p90: calculateAverage(regionRows.map(r => Number(r.tcc_p90) || 0)),
        cf_p25: calculateAverage(regionRows.map(r => Number(r.cf_p25) || 0)),
        cf_p50: calculateAverage(regionRows.map(r => Number(r.cf_p50) || 0)),
        cf_p75: calculateAverage(regionRows.map(r => Number(r.cf_p75) || 0)),
        cf_p90: calculateAverage(regionRows.map(r => Number(r.cf_p90) || 0)),
        wrvus_p25: calculateAverage(regionRows.map(r => Number(r.wrvu_p25) || 0)),
        wrvus_p50: calculateAverage(regionRows.map(r => Number(r.wrvu_p50) || 0)),
        wrvus_p75: calculateAverage(regionRows.map(r => Number(r.wrvu_p75) || 0)),
        wrvus_p90: calculateAverage(regionRows.map(r => Number(r.wrvu_p90) || 0)),
      };
      
      console.log(`📋 ${regionName}: ${regionRows.length} rows, TCC P50: $${regionData.tcc_p50.toLocaleString()}, CF P50: $${regionData.cf_p50.toLocaleString()}`);
      
      // Additional debugging for National calculation
      if (regionName.toLowerCase() === 'national') {
        console.log(`🔍 National calculation details:`, {
          totalRows: regionRows.length,
          sampleTCCValues: regionRows.slice(0, 5).map(r => ({ 
            standardizedName: r.standardizedName, 
            region: r.geographicRegion, 
            tcc_p50: r.tcc_p50 
          })),
          allTCCP50Values: regionRows.map(r => Number(r.tcc_p50) || 0).slice(0, 10),
          calculatedAverage: regionData.tcc_p50
        });
      }
      
      return regionData;
    });
    
    console.log(`✅ Regional comparison data calculated:`, result);
    return result;
  }, [filtered, regionMappings]);

  if (loading) {
    return (
      <UnifiedLoadingSpinner
        message="Loading regional analytics..."
        recordCount={0}
        progress={progress}
        showProgress={true}
        overlay={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Data Filters</h3>
              <p className="text-gray-600 text-sm">Choose filters to analyze regional compensation patterns</p>
            </div>
            {/* Clear Filters Button - Top Right */}
            {(selectedSpecialty || selectedProviderType || selectedSurveySource || selectedYear) && (
              <button
                onClick={() => {
                  setSelectedSpecialty('');
                  setSelectedProviderType('');
                  setSelectedSurveySource('');
                  setSelectedYear('');
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
                  {(selectedSpecialty || selectedProviderType || selectedSurveySource || selectedYear) && (
                    <svg className="absolute -top-1 -right-1 w-3 h-3 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-xs">Clear Filters</span>
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <FormControl sx={{ width: '100%' }}>
                <Autocomplete
                  value={selectedYear}
                  onChange={(event: any, newValue: string | null) => setSelectedYear(newValue || '')}
                  options={['', ...availableYears]}
                  getOptionLabel={(option: string) => option || 'All Years'}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      placeholder="All Years"
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
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      maxHeight: '200px'
                    },
                    '& .MuiAutocomplete-option': {
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                      '&.Mui-selected': { 
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                      }
                    }
                  }}
                  clearOnBlur={false}
                  blurOnSelect={true}
                />
              </FormControl>
            </div>

            {/* Specialty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialty <span className="text-red-500">*</span>
              </label>
            <FormControl sx={{ width: '100%' }}>
              <Autocomplete
                value={selectedSpecialty}
                onChange={(event: any, newValue: string | null) => setSelectedSpecialty(newValue || '')}
                options={specialties}
                getOptionLabel={(option: string) => formatSpecialtyForDisplay(option)}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    placeholder="Search for a specialty..."
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
                sx={{
                  '& .MuiAutocomplete-paper': {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    maxHeight: '300px'
                  },
                  '& .MuiAutocomplete-option': {
                    '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                    '&.Mui-selected': { 
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                    }
                  }
                }}
                noOptionsText="No specialties found"
                clearOnBlur={false}
                blurOnSelect={true}
              />
            </FormControl>
          </div>

            {/* Provider Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider Type
              </label>
              <FormControl sx={{ width: '100%' }}>
                <Autocomplete
                  value={selectedProviderType}
                  onChange={(event: any, newValue: string | null) => setSelectedProviderType(newValue || '')}
                  options={['', ...providerTypes]}
                  getOptionLabel={(option: string) => option || 'All Provider Types'}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      placeholder="All Provider Types"
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
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      maxHeight: '200px'
                    },
                    '& .MuiAutocomplete-option': {
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                      '&.Mui-selected': { 
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                      }
                    }
                  }}
                  clearOnBlur={false}
                  blurOnSelect={true}
                />
              </FormControl>
            </div>

            {/* Survey Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Survey Source
              </label>
              <FormControl sx={{ width: '100%' }}>
                <Autocomplete
                  value={selectedSurveySource}
                  onChange={(event: any, newValue: string | null) => setSelectedSurveySource(newValue || '')}
                  options={['', ...surveySources]}
                  getOptionLabel={(option: string) => option || 'All Survey Sources'}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      placeholder="All Survey Sources"
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
                  sx={{
                    '& .MuiAutocomplete-paper': {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      maxHeight: '200px'
                    },
                    '& .MuiAutocomplete-option': {
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                      '&.Mui-selected': { 
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                      }
                    }
                  }}
                  clearOnBlur={false}
                  blurOnSelect={true}
                />
              </FormControl>
            </div>
          </div>

        </div>

        {/* Empty State - When no specialty is selected */}
        {!selectedSpecialty && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mapped Regions Found</h3>
              <p className="text-gray-600 mb-4">
                Create region mappings to organize and standardize your survey data.
              </p>
            </div>
          </div>
        )}

        {/* Regional Comparison Data */}
        {selectedSpecialty && regionalComparisonData.length > 0 && (
          <div className="mt-6">
            <RegionalComparison data={regionalComparisonData} />
          </div>
        )}

        {/* Empty State */}
        {selectedSpecialty && regionalComparisonData.length === 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Regional Data Found</h3>
            <p className="text-gray-600">No compensation data available for {formatSpecialtyForDisplay(selectedSpecialty)} across the selected regions.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegionalAnalytics; 