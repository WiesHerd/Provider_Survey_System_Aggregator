import React, { useEffect, useState, useMemo } from 'react';
import { FormControl, Autocomplete, TextField } from '@mui/material';
import { ISurveyRow } from '../types/survey';
import { getDataService } from '../services/DataService';
import { RegionalComparison } from '../features/regional';
import { AnalysisProgressBar } from '../shared/components';
import { formatSpecialtyForDisplay } from '../shared/utils/formatters';
import { filterSpecialtyOptions } from '../shared/utils/specialtyMatching';

// These will be dynamically populated from region mappings
const DEFAULT_REGION_NAMES = ['National', 'Northeast', 'Midwest', 'South', 'West'];

export const RegionalAnalytics: React.FC = () => {
  const [normalizedRows, setNormalizedRows] = useState<ISurveyRow[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedProviderType, setSelectedProviderType] = useState<string>('');
  const [selectedSurveySource, setSelectedSurveySource] = useState<string>('');
  const [mappings, setMappings] = useState<any[]>([]);
  const [regionMappings, setRegionMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const dataService = getDataService();
        
        // Get specialty mappings, column mappings, and region mappings (needed for data transformation)
        const [allMappings, columnMappings, regionMappings] = await Promise.all([
          dataService.getAllSpecialtyMappings(),
          dataService.getAllColumnMappings(),
          dataService.getRegionMappings()
        ]);
        console.log(`📋 Loaded ${allMappings.length} specialty mappings`);
        console.log(`📋 Loaded ${columnMappings.length} column mappings`);
        console.log(`🌍 Loaded ${regionMappings.length} region mappings`);
        
        // Debug: Check the structure of loaded mappings
        if (allMappings.length > 0) {
          console.log('🔍 First few specialty mappings:', allMappings.slice(0, 3).map(m => ({
            standardizedName: m.standardizedName,
            sourceSpecialtiesCount: m.sourceSpecialties?.length || 0
          })));
        }
        
        setMappings(allMappings);
        setRegionMappings(regionMappings);
        
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
        
        // Build region mapping lookup (same as SurveyAnalytics)
        const regionMappingLookup = new Map();
        regionMappings.forEach((mapping: any) => {
          mapping.sourceRegions.forEach((region: any) => {
            if (region.surveySource) {
              regionMappingLookup.set(region.region.toLowerCase(), mapping.standardizedName);
            }
          });
        });
        
        console.log(`🌍 Region mapping lookup built with ${regionMappingLookup.size} mappings:`, 
          Array.from(regionMappingLookup.entries()).slice(0, 10));

        // Transform the data using the same logic as SurveyAnalytics
        Object.entries(surveyData).forEach(([surveyId, surveyRows]) => {
          if (surveyRows && surveyRows.length > 0) {
            const surveySource = surveyRows[0]._surveyType || surveyRows[0]._surveyName || surveyId;
            
            const transformedRows = surveyRows.map((row: any) => {
              // Debug: Log the raw row structure for the first few rows
              if (Math.random() < 0.05) { // Log 5% of rows
                console.log('🔍 Regional Analytics - Raw row inspection:', {
                  surveySource,
                  specialty: row.specialty,
                  providerType: row.providerType,
                  region: row.region,
                  variable: row.variable,
                  p25: row.p25,
                  p50: row.p50,
                  p75: row.p75,
                  p90: row.p90,
                  allFields: Object.keys(row).slice(0, 20)
                });
              }
              
              const transformedRow: any = {
                ...row,
                surveySource: surveySource,
                specialty: row.specialty || '',
                providerType: row.providerType || '',
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
                n_orgs: Number(row.n_orgs) || 0,
                n_incumbents: Number(row.n_incumbents) || 0
              };
              
              // Apply region mappings (same as SurveyAnalytics)
              const originalRegion = String(row.geographicRegion || row.geographic_region || row.region || '').toLowerCase();
              if (originalRegion) {
                const standardizedRegion = regionMappingLookup.get(originalRegion);
                if (standardizedRegion) {
                  transformedRow.geographicRegion = standardizedRegion;
                  transformedRow.originalRegion = row.geographicRegion || row.geographic_region || row.region;
                  
                  // Debug: Log successful region mapping
                  if (Math.random() < 0.1) { // Log 10% of successful mappings
                    console.log('🌍 Regional Analytics - Region mapping applied:', {
                      originalRegion: row.geographicRegion || row.geographic_region || row.region,
                      standardizedRegion,
                      surveySource
                    });
                  }
                } else {
                  transformedRow.geographicRegion = row.geographicRegion || row.geographic_region || row.region || '';
                  transformedRow.originalRegion = row.geographicRegion || row.geographic_region || row.region || '';
                  
                  // Debug: Log unmapped regions
                  if (Math.random() < 0.05) { // Log 5% of unmapped regions
                    console.log('⚠️ Regional Analytics - Region not mapped:', {
                      originalRegion: row.geographicRegion || row.geographic_region || row.region,
                      availableMappings: Array.from(regionMappingLookup.keys()).slice(0, 5),
                      surveySource
                    });
                  }
                }
              } else {
                transformedRow.geographicRegion = '';
                transformedRow.originalRegion = '';
              }
              
              // Handle variable-based data structure (same as SurveyAnalytics)
              if (row.variable && (row.p25 !== undefined || row.p50 !== undefined || row.p75 !== undefined || row.p90 !== undefined)) {
                const variable = String(row.variable).toLowerCase();
                const p25 = Number(row.p25) || 0;
                const p50 = Number(row.p50) || 0;
                const p75 = Number(row.p75) || 0;
                const p90 = Number(row.p90) || 0;
                
                // Debug: Log variable mapping
                if (Math.random() < 0.1) { // Log 10% of variable mappings
                  console.log('🔍 Regional Analytics - Variable mapping:', {
                    variable: row.variable,
                    variableLower: variable,
                    p25, p50, p75, p90
                  });
                }
                
                // Map based on variable type (using same logic as SurveyAnalytics)
                // Check CF patterns FIRST (more specific patterns should come first)
                if (variable.includes('conversion') || 
                    variable.includes('cf') || 
                    variable.includes('factor') || 
                    variable.includes('conversion factor') ||
                    variable.includes('tcc per rvu') || 
                    variable.includes('tcc per work rvu') || 
                    variable.includes('compensation per rvu') || 
                    variable.includes('dollars per rvu') || 
                    variable.includes('per work rvu') || 
                    variable.includes('per rvu') || 
                    variable.includes('tcc/rvu') ||
                    variable.includes('compensation/rvu') || 
                    variable.includes('comp per rvu') || 
                    variable.includes('cash per rvu') ||
                    (variable.includes('tcc') && variable.includes('rvu'))) {
                  transformedRow.cf_p25 = p25;
                  transformedRow.cf_p50 = p50;
                  transformedRow.cf_p75 = p75;
                  transformedRow.cf_p90 = p90;
                  
                  // Debug: Log CF mapping
                  if (Math.random() < 0.2) { // Log 20% of CF mappings
                    console.log('💰 Regional Analytics - CF mapping applied:', {
                      variable: row.variable,
                      variableLower: variable,
                      cf_p50: p50
                    });
                  }
                } 
                // Check TCC patterns
                else if (variable.includes('compensation') || 
                         variable.includes('salary') || 
                         variable.includes('total cash') || 
                         variable.includes('tcc') || 
                         variable.includes('total compensation')) {
                  transformedRow.tcc_p25 = p25;
                  transformedRow.tcc_p50 = p50;
                  transformedRow.tcc_p75 = p75;
                  transformedRow.tcc_p90 = p90;
                } 
                // Check wRVU patterns
                else if (variable.includes('rvu') || 
                         variable.includes('relative value') || 
                         variable.includes('work rvu') || 
                         variable.includes('wrvu') || 
                         variable.includes('work relative value')) {
                  transformedRow.wrvu_p25 = p25;
                  transformedRow.wrvu_p50 = p50;
                  transformedRow.wrvu_p75 = p75;
                  transformedRow.wrvu_p90 = p90;
                }
              }
              
              // Handle direct column-based data (fallback)
              if (row.tcc_p25 !== undefined) transformedRow.tcc_p25 = Number(row.tcc_p25) || 0;
              if (row.tcc_p50 !== undefined) transformedRow.tcc_p50 = Number(row.tcc_p50) || 0;
              if (row.tcc_p75 !== undefined) transformedRow.tcc_p75 = Number(row.tcc_p75) || 0;
              if (row.tcc_p90 !== undefined) transformedRow.tcc_p90 = Number(row.tcc_p90) || 0;
              if (row.cf_p25 !== undefined) transformedRow.cf_p25 = Number(row.cf_p25) || 0;
              if (row.cf_p50 !== undefined) transformedRow.cf_p50 = Number(row.cf_p50) || 0;
              if (row.cf_p75 !== undefined) transformedRow.cf_p75 = Number(row.cf_p75) || 0;
              if (row.cf_p90 !== undefined) transformedRow.cf_p90 = Number(row.cf_p90) || 0;
              if (row.wrvu_p25 !== undefined) transformedRow.wrvu_p25 = Number(row.wrvu_p25) || 0;
              if (row.wrvu_p50 !== undefined) transformedRow.wrvu_p50 = Number(row.wrvu_p50) || 0;
              if (row.wrvu_p75 !== undefined) transformedRow.wrvu_p75 = Number(row.wrvu_p75) || 0;
              if (row.wrvu_p90 !== undefined) transformedRow.wrvu_p90 = Number(row.wrvu_p90) || 0;
              
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
                }
              });
            }
            
            allRows = allRows.concat(transformedRows);
            console.log(`📊 Running total: ${allRows.length} rows`);
          }
        });
        
        console.log(`🎯 Total rows loaded: ${allRows.length}`);
        console.log(`📋 All unique specialties loaded:`, Array.from(new Set(allRows.map(r => r.specialty))));
        
        // Debug: Check if we have any compensation data
        const rowsWithTCC = allRows.filter(r => Number(r.tcc_p50) > 0);
        const rowsWithCF = allRows.filter(r => Number(r.cf_p50) > 0);
        const rowsWithWRVU = allRows.filter(r => Number(r.wrvu_p50) > 0);
        const rowsWithCompensation = allRows.filter(r => Number(r.tcc_p50) > 0 || Number(r.cf_p50) > 0 || Number(r.wrvu_p50) > 0);
        
        console.log(`💰 Compensation data summary:`);
        console.log(`  - Rows with TCC data: ${rowsWithTCC.length} out of ${allRows.length}`);
        console.log(`  - Rows with CF data: ${rowsWithCF.length} out of ${allRows.length}`);
        console.log(`  - Rows with wRVU data: ${rowsWithWRVU.length} out of ${allRows.length}`);
        console.log(`  - Rows with any compensation data: ${rowsWithCompensation.length} out of ${allRows.length}`);
        
        // Debug: Check unique provider types and regions found
        const uniqueProviderTypes = Array.from(new Set(allRows.map(r => r.providerType).filter(Boolean)));
        const uniqueRegions = Array.from(new Set(allRows.map(r => r.geographicRegion).filter(Boolean)));
        const uniqueSurveySources = Array.from(new Set(allRows.map(r => r.surveySource).filter(Boolean)));
        
        console.log('🔍 Regional Analytics Debug Summary:', {
          totalRows: allRows.length,
          rowsWithTCC: rowsWithTCC.length,
          rowsWithCF: rowsWithCF.length,
          rowsWithWRVU: rowsWithWRVU.length,
          uniqueProviderTypes,
          uniqueRegions,
          uniqueSurveySources,
          sampleRowsWithData: rowsWithCompensation.slice(0, 3).map(r => ({
            specialty: r.specialty,
            providerType: r.providerType,
            region: r.geographicRegion,
            surveySource: r.surveySource,
            tcc_p50: r.tcc_p50,
            cf_p50: r.cf_p50,
            wrvu_p50: r.wrvu_p50
          }))
        });
        
        // Debug: Check for variable-based data specifically
        const variableRows = allRows.filter(r => r.variable);
        console.log(`📊 Rows with variable field: ${variableRows.length} out of ${allRows.length}`);
        
        if (variableRows.length > 0) {
          const cfVariables = variableRows.filter(r => {
            const variable = String(r.variable).toLowerCase();
            return variable.includes('cf') || 
                   variable.includes('conversion') || 
                   variable.includes('tcc') && variable.includes('rvu');
          });
          console.log(`💰 Rows with CF-related variables: ${cfVariables.length}`);
          
          if (cfVariables.length > 0) {
            console.log('🔍 CF variable examples:', cfVariables.slice(0, 3).map(r => ({
              variable: r.variable,
              cf_p50: r.cf_p50,
              specialty: r.specialty
            })));
          }
        }
        
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
    
    // Get standardized region names from mappings
    const standardizedRegions = regionMappings.length > 0 
      ? regionMappings.map(m => m.standardizedName).sort()
      : DEFAULT_REGION_NAMES;
    
    console.log(`🌍 Using standardized regions:`, standardizedRegions);
    
    // Filter out any rows with invalid data - more lenient check
    const validRows = filtered.filter(r => {
      const hasValidTCC = Number(r.tcc_p50) > 0 || Number(r.tcc_p25) > 0 || Number(r.tcc_p75) > 0 || Number(r.tcc_p90) > 0;
      const hasValidCF = Number(r.cf_p50) > 0 || Number(r.cf_p25) > 0 || Number(r.cf_p75) > 0 || Number(r.cf_p90) > 0;
      const hasValidWRVU = Number(r.wrvu_p50) > 0 || Number(r.wrvu_p25) > 0 || Number(r.wrvu_p75) > 0 || Number(r.wrvu_p90) > 0;
      return hasValidTCC || hasValidCF || hasValidWRVU;
    });
    
    console.log(`✅ Valid rows with data: ${validRows.length} out of ${filtered.length}`);
    
    const result = standardizedRegions.map(regionName => {
      // For 'national' (lowercase), use all valid filtered rows
      const regionRows = regionName.toLowerCase() === 'national'
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
  }, [filtered, regionMappings]);

  if (loading) {
    return (
      <AnalysisProgressBar
        message="Loading regional analytics..."
        progress={100}
        recordCount={0}
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

          {/* Clear Filters Button */}
          {(selectedSpecialty || selectedProviderType || selectedSurveySource) && (
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setSelectedSpecialty('');
                  setSelectedProviderType('');
                  setSelectedSurveySource('');
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
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