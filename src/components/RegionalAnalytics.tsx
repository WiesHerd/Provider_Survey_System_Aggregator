import React, { useEffect, useState, useMemo } from 'react';
import { FormControl, Autocomplete, TextField } from '@mui/material';
import { ISurveyRow } from '../types/survey';
import { getDataService } from '../services/DataService';
import { RegionalComparison } from '../features/regional';
import LoadingSpinner from './ui/loading-spinner';
import { formatSpecialtyForDisplay } from '../shared/utils/formatters';

const REGION_NAMES = ['National', 'Northeast', 'Midwest', 'South', 'West'];

export const RegionalAnalytics: React.FC = () => {
  const [normalizedRows, setNormalizedRows] = useState<ISurveyRow[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedProviderType, setSelectedProviderType] = useState<string>('');
  const [selectedSurveySource, setSelectedSurveySource] = useState<string>('');
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const dataService = getDataService();
        
        // Get specialty mappings and column mappings (needed for data transformation)
        const [allMappings, columnMappings] = await Promise.all([
          dataService.getAllSpecialtyMappings(),
          dataService.getAllColumnMappings()
        ]);
        console.log(`📋 Loaded ${allMappings.length} specialty mappings`);
        console.log(`📋 Loaded ${columnMappings.length} column mappings`);
        setMappings(allMappings);
        
        // Use the same approach as SurveyAnalytics - load all survey data at once
        const uploadedSurveys = await dataService.getAllSurveys();
        console.log(`📊 Found ${uploadedSurveys.length} surveys:`, uploadedSurveys.map(s => ({ id: s.id, type: (s as any).type })));
        
        let allRows: ISurveyRow[] = [];
        const surveyData: Record<string, ISurveyRow[]> = {};
        
        // Load data for each survey (same approach as SurveyAnalytics)
        for (const survey of uploadedSurveys) {
          try {
              const data = await dataService.getSurveyData(survey.id, undefined, { limit: 10000 });
          if (data && data.rows) {
            
              // Add survey metadata to each row (same as SurveyAnalytics)
              const rowsWithMetadata = data.rows.map((row: any) => ({
                ...row,
                _surveyId: survey.id,
                _surveyName: (survey as any).type || survey.id,
                _surveyType: (survey as any).type
              }));
              
              surveyData[survey.id] = rowsWithMetadata;
            }
          } catch (error) {
            console.error(`Error loading survey ${survey.id}:`, error);
          }
        }
        
        // Now transform the data using the same approach as SurveyAnalytics
        Object.entries(surveyData).forEach(([surveyId, surveyRows]) => {
          if (surveyRows && surveyRows.length > 0) {
            const surveySource = surveyRows[0]._surveyType || surveyRows[0]._surveyName || surveyId;
            // Apply the same transformation logic as SurveyAnalytics
            const transformedRows = surveyRows.map((row: any, index: number) => {
              if (index === 0) {
                console.log(`🔍 FIRST ROW SAMPLE for ${surveySource}:`, {
                  allFields: Object.keys(row),
                  specialty: row.specialty,
                  variable: row.variable, // This tells us what type of compensation data this row contains
                  p25: row.p25,
                  p50: row.p50,
                  p75: row.p75,
                  p90: row.p90,
                  sampleNumericFields: Object.entries(row).filter(([k, v]) => typeof v === 'number').slice(0, 10)
                });
              }
              const transformedRow: any = {
                ...row,
                surveySource: surveySource,
                specialty: row.specialty || row.normalizedSpecialty || '',
                // Try multiple possible field names for geographic region
                geographicRegion: row.geographic_region || row.region || row.geographicRegion || 
                                row.Geographic_Region || row.Region || row['Geographic Region'] || '',
                // Try multiple possible field names for provider type
                providerType: row.providerType || row.provider_type || row.ProviderType || 
                            row.Provider_Type || row['Provider Type'] || row.Type || '',
                // Initialize compensation fields
                tcc_p25: 0,
                tcc_p50: 0,
                tcc_p75: 0,
                tcc_p90: 0,
                cf_p25: 0,
                cf_p50: 0,
                cf_p75: 0,
                cf_p90: 0,
                wrvu_p25: 0,
                wrvu_p50: 0,
                wrvu_p75: 0,
                wrvu_p90: 0,
                n_orgs: 0,
                n_incumbents: 0
              };

              // Debug: Log the raw row structure for the first few rows
              if (Math.random() < 0.1) { // Log 10% of rows
                console.log('🔍 Regional Analytics - Raw row inspection:', {
                  surveySource,
                  allFields: Object.keys(row),
                  specialtyFields: Object.keys(row).filter(k => k.toLowerCase().includes('special')),
                  regionFields: Object.keys(row).filter(k => k.toLowerCase().includes('region') || k.toLowerCase().includes('geo')),
                  providerFields: Object.keys(row).filter(k => k.toLowerCase().includes('provider') || k.toLowerCase().includes('type')),
                  compensationFields: Object.keys(row).filter(k => 
                    k.toLowerCase().includes('tcc') || 
                    k.toLowerCase().includes('comp') || 
                    k.toLowerCase().includes('cash') ||
                    k.toLowerCase().includes('p25') ||
                    k.toLowerCase().includes('p50') ||
                    k.toLowerCase().includes('p75') ||
                    k.toLowerCase().includes('p90')
                  ),
                  sampleValues: {
                    specialty: row.specialty,
                    region: transformedRow.geographicRegion,
                    providerType: transformedRow.providerType
                  }
                });
              }

              // Apply column mappings to get compensation data
              let mappedColumns = 0;
              
              // Build column mapping lookup for this survey source (same as SurveyAnalytics)
              const columnMappingLookup = new Map();
              columnMappings.forEach(mapping => {
                mapping.sourceColumns.forEach((column: any) => {
                  if (column.surveySource === surveySource) {
                    // Use 'name' field for column mapping (same as SurveyAnalytics)
                    columnMappingLookup.set(column.name, mapping.standardizedName);
                  }
                });
              });

              // FIRST: Handle variable-based data structure (common in uploaded surveys)
              // Check if this row has a 'variable' field indicating compensation type
              if (row.variable) {
                const variable = String(row.variable).toLowerCase();
                const p25 = Number(row.p25) || 0;
                const p50 = Number(row.p50) || 0;
                const p75 = Number(row.p75) || 0;
                const p90 = Number(row.p90) || 0;
                
                // Debug: Log variable mapping for cardiac rows
                if (transformedRow.specialty && transformedRow.specialty.toLowerCase().includes('cardiac')) {
                  console.log('🔍 VARIABLE MAPPING for cardiac:', {
                    variable: row.variable,
                    variableLower: variable,
                    p25, p50, p75, p90
                  });
                }
                
                if (variable.includes('tcc') || variable.includes('total') || variable.includes('cash')) {
                  transformedRow.tcc_p25 = p25;
                  transformedRow.tcc_p50 = p50;
                  transformedRow.tcc_p75 = p75;
                  transformedRow.tcc_p90 = p90;
                  mappedColumns += 4;
                } else if (variable.includes('cf') || variable.includes('conversion')) {
                  transformedRow.cf_p25 = p25;
                  transformedRow.cf_p50 = p50;
                  transformedRow.cf_p75 = p75;
                  transformedRow.cf_p90 = p90;
                  mappedColumns += 4;
                } else if (variable.includes('wrvu') || variable.includes('rvu') || variable.includes('work')) {
                  transformedRow.wrvu_p25 = p25;
                  transformedRow.wrvu_p50 = p50;
                  transformedRow.wrvu_p75 = p75;
                  transformedRow.wrvu_p90 = p90;
                  mappedColumns += 4;
                }
              }

              // SECOND: Apply column mappings (fallback)
              for (const [originalColumn, value] of Object.entries(row)) {
                const mappedName = columnMappingLookup.get(originalColumn);
                if (mappedName && value !== undefined && value !== null) {
                  const numericValue = Number(value) || 0;
                  if (numericValue > 0) {
                    transformedRow[mappedName] = numericValue;
                    mappedColumns++;
                  }
                }
              }

              // Fallback: Intelligent mapping if no column mappings found
              if (mappedColumns === 0) {
                const intelligentMappings = [
                  // TCC patterns
                  { pattern: /tcc.*p25|p25.*tcc|total.*cash.*25/i, target: 'tcc_p25' },
                  { pattern: /tcc.*p50|p50.*tcc|total.*cash.*50|median.*tcc/i, target: 'tcc_p50' },
                  { pattern: /tcc.*p75|p75.*tcc|total.*cash.*75/i, target: 'tcc_p75' },
                  { pattern: /tcc.*p90|p90.*tcc|total.*cash.*90/i, target: 'tcc_p90' },
                  // wRVU patterns
                  { pattern: /wrvu.*p25|p25.*wrvu|work.*rvu.*25/i, target: 'wrvu_p25' },
                  { pattern: /wrvu.*p50|p50.*wrvu|work.*rvu.*50|median.*wrvu/i, target: 'wrvu_p50' },
                  { pattern: /wrvu.*p75|p75.*wrvu|work.*rvu.*75/i, target: 'wrvu_p75' },
                  { pattern: /wrvu.*p90|p90.*wrvu|work.*rvu.*90/i, target: 'wrvu_p90' },
                  // CF patterns
                  { pattern: /cf.*p25|p25.*cf|conversion.*factor.*25/i, target: 'cf_p25' },
                  { pattern: /cf.*p50|p50.*cf|conversion.*factor.*50|median.*cf/i, target: 'cf_p50' },
                  { pattern: /cf.*p75|p75.*cf|conversion.*factor.*75/i, target: 'cf_p75' },
                  { pattern: /cf.*p90|p90.*cf|conversion.*factor.*90/i, target: 'cf_p90' },
                  // Org/incumbent patterns
                  { pattern: /n_orgs|num.*org|organizations|orgs/i, target: 'n_orgs' },
                  { pattern: /n_incumbents|num.*inc|incumbents/i, target: 'n_incumbents' }
                ];

                for (const [originalColumn, value] of Object.entries(row)) {
                  const mapping = intelligentMappings.find(m => m.pattern.test(originalColumn));
                  if (mapping && value !== undefined && value !== null) {
                    const numericValue = Number(value) || 0;
                    if (numericValue > 0) {
                      transformedRow[mapping.target] = numericValue;
                      mappedColumns++;
                    }
                  }
                }
              }

              // Debug: Log column mapping results for filtered specialty rows
              if (transformedRow.specialty && transformedRow.specialty.toLowerCase().includes('cardiac')) {
                console.log('🔍 CARDIAC ROW - Column mapping details:', {
                  surveySource,
                  specialty: transformedRow.specialty,
                  region: transformedRow.geographicRegion,
                  providerType: transformedRow.providerType,
                  mappedColumns,
                  columnMappingLookupSize: columnMappingLookup.size,
                  sampleMappings: Array.from(columnMappingLookup.entries()).slice(0, 10),
                  originalFieldsWithNumbers: Object.entries(row).filter(([k, v]) => typeof v === 'number' && v > 0).slice(0, 10),
                  compensationData: {
                    tcc_p25: transformedRow.tcc_p25,
                    tcc_p50: transformedRow.tcc_p50,
                    tcc_p75: transformedRow.tcc_p75,
                    tcc_p90: transformedRow.tcc_p90,
                    cf_p25: transformedRow.cf_p25,
                    cf_p50: transformedRow.cf_p50,
                    wrvu_p25: transformedRow.wrvu_p25,
                    wrvu_p50: transformedRow.wrvu_p50
                  }
                });
              }
              
              return transformedRow;
            });
            
            // Debug: Log a sample transformed row
            if (allRows.length === 0 && transformedRows.length > 0) {
              console.log(`🔍 Regional Analytics - Sample transformed row:`, {
                surveySource,
                specialty: transformedRows[0].specialty,
                region: transformedRows[0].geographicRegion,
                compensation: {
                  tcc_p50: transformedRows[0].tcc_p50,
                  cf_p50: transformedRows[0].cf_p50,
                  wrvu_p50: transformedRows[0].wrvu_p50
                },
                originalColumns: Object.keys(surveyRows[0]).slice(0, 10)
              });
            }
            
            allRows = allRows.concat(transformedRows);
            console.log(`📊 Running total: ${allRows.length} rows`);
          }
        });
        
        console.log(`🎯 Total rows loaded: ${allRows.length}`);
        console.log(`📋 All unique specialties loaded:`, Array.from(new Set(allRows.map(r => r.specialty))));
        
        // Debug: Check if we have any compensation data
        const rowsWithCompensation = allRows.filter(r => Number(r.tcc_p50) > 0 || Number(r.cf_p50) > 0 || Number(r.wrvu_p50) > 0);
        console.log(`💰 Rows with compensation data: ${rowsWithCompensation.length} out of ${allRows.length}`);
        
        // Debug: Check unique provider types and regions found
        const uniqueProviderTypes = Array.from(new Set(allRows.map(r => r.providerType).filter(Boolean)));
        const uniqueRegions = Array.from(new Set(allRows.map(r => r.geographicRegion).filter(Boolean)));
        const uniqueSurveySources = Array.from(new Set(allRows.map(r => r.surveySource).filter(Boolean)));
        
        console.log('🔍 Regional Analytics Debug Summary:', {
          totalRows: allRows.length,
          rowsWithCompensation: rowsWithCompensation.length,
          uniqueProviderTypes,
          uniqueRegions,
          uniqueSurveySources,
          sampleRowsWithData: rowsWithCompensation.slice(0, 3).map(r => ({
            specialty: r.specialty,
            providerType: r.providerType,
            region: r.geographicRegion,
            surveySource: r.surveySource,
            tcc_p50: r.tcc_p50,
            cf_p50: r.cf_p50
          }))
        });
        
        setNormalizedRows(allRows);
      } catch (error) {
        console.error('Error loading data for Regional Analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Use standardizedName for dropdown
  const specialties = useMemo(() => mappings.map(m => m.standardizedName).sort(), [mappings]);

  // Extract unique provider types and survey sources from loaded data
  const providerTypes = useMemo(() => {
    const types = Array.from(new Set(normalizedRows.map(r => r.providerType || '').filter(Boolean)));
    return types.sort();
  }, [normalizedRows]);
  
  const surveySources = useMemo(() => {
    const sources = Array.from(new Set(normalizedRows.map(r => r.surveySource || '').filter(Boolean)));
    return sources.sort();
  }, [normalizedRows]);

  // Multi-filter logic with specialty, provider type, and survey source
  const filtered = useMemo(() => {
    if (!selectedSpecialty) return [];
    const mapping = mappings.find(m => m.standardizedName === selectedSpecialty);
    if (!mapping) return [];
    
    console.log(`🔍 Filtering for:`, {
      specialty: selectedSpecialty,
      providerType: selectedProviderType,
      surveySource: selectedSurveySource
    });
    console.log(`📋 Available mappings:`, mapping.sourceSpecialties);
    console.log(`📊 Total rows to filter: ${normalizedRows.length}`);
    
    // Get mapped specialty names
    const mappedSpecialtyNames = mapping.sourceSpecialties.map((spec: any) => spec.specialty);
    console.log(`🎯 Looking for specialties:`, mappedSpecialtyNames);
    
    const filteredRows = normalizedRows.filter(row => {
      // Specialty filter
      const rowSpecialty = String(row.specialty || row.normalizedSpecialty || '');
      const specialtyMatch = mappedSpecialtyNames.some((mappedName: string) => 
        rowSpecialty.toLowerCase().includes(mappedName.toLowerCase()) ||
        mappedName.toLowerCase().includes(rowSpecialty.toLowerCase())
      );
      
      if (!specialtyMatch) return false;
      
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
      
      return true;
    });
    
    console.log(`✅ Filtered rows found: ${filteredRows.length}`);
    if (filteredRows.length > 0) {
      console.log(`📋 Sample filtered rows with FULL compensation data:`, filteredRows.slice(0, 3).map(row => ({
        specialty: row.specialty,
        providerType: row.providerType,
        surveySource: row.surveySource,
        geographicRegion: row.geographicRegion,
        compensationData: {
          tcc_p25: row.tcc_p25,
          tcc_p50: row.tcc_p50,
          tcc_p75: row.tcc_p75,
          tcc_p90: row.tcc_p90,
          cf_p25: row.cf_p25,
          cf_p50: row.cf_p50,
          wrvu_p25: row.wrvu_p25,
          wrvu_p50: row.wrvu_p50
        },
        // Show ALL original field names to see what compensation data exists
        originalFieldNames: Object.keys(row).filter(k => 
          k.toLowerCase().includes('tcc') || 
          k.toLowerCase().includes('comp') || 
          k.toLowerCase().includes('cash') ||
          k.toLowerCase().includes('p25') ||
          k.toLowerCase().includes('p50') ||
          k.toLowerCase().includes('p75') ||
          k.toLowerCase().includes('p90') ||
          k.toLowerCase().includes('cf') ||
          k.toLowerCase().includes('conversion') ||
          k.toLowerCase().includes('rvu')
        ),
        // Show first 20 field names to understand data structure
        allFieldNames: Object.keys(row).slice(0, 20)
      })));
    }
    
    return filteredRows;
  }, [selectedSpecialty, selectedProviderType, selectedSurveySource, mappings, normalizedRows]);

  // Helper to average a field
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // Prepare data for RegionalComparison: average each percentile field for each region
  const regionalComparisonData = useMemo(() => {
    console.log(`📊 Calculating regional comparison data for ${filtered.length} filtered rows`);
    
    // Debug: Check what regions are actually in the filtered data
    const uniqueRegions = Array.from(new Set(filtered.map(r => r.geographicRegion)));
    console.log(`🔍 Unique regions in filtered data:`, uniqueRegions);
    
    // Filter out any rows with invalid data - more lenient check
    const validRows = filtered.filter(r => {
      const hasValidTCC = Number(r.tcc_p50) > 0 || Number(r.tcc_p25) > 0 || Number(r.tcc_p75) > 0 || Number(r.tcc_p90) > 0;
      const hasValidCF = Number(r.cf_p50) > 0 || Number(r.cf_p25) > 0 || Number(r.cf_p75) > 0 || Number(r.cf_p90) > 0;
      const hasValidWRVU = Number(r.wrvu_p50) > 0 || Number(r.wrvu_p25) > 0 || Number(r.wrvu_p75) > 0 || Number(r.wrvu_p90) > 0;
      return hasValidTCC || hasValidCF || hasValidWRVU;
    });
    
    console.log(`✅ Valid rows with data: ${validRows.length} out of ${filtered.length}`);
    
    const result = REGION_NAMES.map(regionName => {
      // For 'National', use all valid filtered rows
      const regionRows = regionName === 'National'
        ? validRows
        : validRows.filter(r => r.geographicRegion === regionName);
      
      console.log(`🔍 Filtering for region "${regionName}": found ${regionRows.length} rows`);
      if (regionRows.length > 0) {
        console.log(`📋 Sample rows for ${regionName}:`, regionRows.slice(0, 2).map(r => ({
          specialty: r.specialty,
          region: r.geographicRegion,
          tcc_p50: r.tcc_p50,
          cf_p50: r.cf_p50,
          wrvu_p50: r.wrvu_p50
        })));
      }
      
      // Calculate averages, but only include non-zero values
      const calculateAvgNonZero = (values: number[]) => {
        const nonZeroValues = values.filter(v => v > 0);
        return nonZeroValues.length > 0 ? nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length : 0;
      };
      
      const regionData = {
        region: regionName,
        tcc_p25: calculateAvgNonZero(regionRows.map(r => Number(r.tcc_p25) || 0)),
        tcc_p50: calculateAvgNonZero(regionRows.map(r => Number(r.tcc_p50) || 0)),
        tcc_p75: calculateAvgNonZero(regionRows.map(r => Number(r.tcc_p75) || 0)),
        tcc_p90: calculateAvgNonZero(regionRows.map(r => Number(r.tcc_p90) || 0)),
        cf_p25: calculateAvgNonZero(regionRows.map(r => Number(r.cf_p25) || 0)),
        cf_p50: calculateAvgNonZero(regionRows.map(r => Number(r.cf_p50) || 0)),
        cf_p75: calculateAvgNonZero(regionRows.map(r => Number(r.cf_p75) || 0)),
        cf_p90: calculateAvgNonZero(regionRows.map(r => Number(r.cf_p90) || 0)),
        wrvus_p25: calculateAvgNonZero(regionRows.map(r => Number(r.wrvu_p25) || 0)),
        wrvus_p50: calculateAvgNonZero(regionRows.map(r => Number(r.wrvu_p50) || 0)),
        wrvus_p75: calculateAvgNonZero(regionRows.map(r => Number(r.wrvu_p75) || 0)),
        wrvus_p90: calculateAvgNonZero(regionRows.map(r => Number(r.wrvu_p90) || 0)),
      };
      
      console.log(`📋 ${regionName}: ${regionRows.length} rows, TCC P50: $${regionData.tcc_p50.toLocaleString()}, CF P50: $${regionData.cf_p50.toLocaleString()}`);
      
      return regionData;
    });
    
    console.log(`✅ Regional comparison data calculated:`, result);
    return result;
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <LoadingSpinner 
              message="Analyzing compensation data across regions..."
              size="lg"
              variant="primary"
            />
          </div>
        </div>
      </div>
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
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {specialties.length} Specialties
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {providerTypes.length} Provider Types
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {surveySources.length} Survey Sources
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(249, 250, 251, 0.5)',
                        border: '1px solid #d1d5db',
                          borderRadius: '8px',
                        fontSize: '0.875rem',
                        height: '48px',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'white',
                          boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
                          borderColor: '#3b82f6',
                        }
                      },
                      '& .MuiInputBase-input': {
                        paddingTop: '12px',
                        paddingBottom: '12px',
                        paddingLeft: '16px',
                        paddingRight: '16px',
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
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(249, 250, 251, 0.5)',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          height: '48px',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderColor: '#9ca3af',
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'white',
                            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
                            borderColor: '#3b82f6',
                          }
                        },
                        '& .MuiInputBase-input': {
                          paddingTop: '12px',
                          paddingBottom: '12px',
                          paddingLeft: '16px',
                          paddingRight: '16px',
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
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(249, 250, 251, 0.5)',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          height: '48px',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderColor: '#9ca3af',
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'white',
                            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
                            borderColor: '#3b82f6',
                          }
                        },
                        '& .MuiInputBase-input': {
                          paddingTop: '12px',
                          paddingBottom: '12px',
                          paddingLeft: '16px',
                          paddingRight: '16px',
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

          {/* Clear Filters Button */}
          {(selectedSpecialty || selectedProviderType || selectedSurveySource) && (
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setSelectedSpecialty('');
                  setSelectedProviderType('');
                  setSelectedSurveySource('');
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                title="Clear all filters"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
                </svg>
                Clear Filters
              </button>
            </div>
          )}
        </div>

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