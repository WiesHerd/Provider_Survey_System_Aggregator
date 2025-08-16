import React, { useEffect, useState, useMemo } from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';
import { ISurveyRow } from '../types/survey';
import { LocalStorageService } from '../services/StorageService';
import { SpecialtyMappingService } from '../services/SpecialtyMappingService';
import BackendService from '../services/BackendService';
import RegionalComparison from './RegionalComparison';
import LoadingSpinner from './ui/loading-spinner';

const REGION_NAMES = ['National', 'Northeast', 'Midwest', 'South', 'West'];

export const RegionalAnalytics: React.FC = () => {
  const [normalizedRows, setNormalizedRows] = useState<ISurveyRow[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const storageService = new LocalStorageService();
        const mappingService = new SpecialtyMappingService(storageService);
        const backendService = BackendService.getInstance();
        
        // Get specialty mappings
        const allMappings = await mappingService.getAllMappings();
        console.log(`📋 Loaded ${allMappings.length} specialty mappings`);
        console.log(`🎯 Allergy & Immunology mapping:`, allMappings.find(m => m.standardizedName === 'Allergy & Immunology'));
        setMappings(allMappings);
        
        // Get surveys from backend
        const surveys = await backendService.getAllSurveys();
        console.log(`📊 Found ${surveys.length} surveys:`, surveys.map(s => ({ id: s.id, type: (s as any).type })));
        let allRows: ISurveyRow[] = [];
        
        // Load data from each survey with sufficient limit to get all data
        for (const survey of surveys) {
          console.log(`🔍 Loading data for survey: ${survey.id} (${(survey as any).type || 'Unknown'})`);
          const data = await backendService.getSurveyData(survey.id, undefined, { limit: 10000 }); // Request up to 10,000 rows
          if (data && data.rows) { // BackendService transforms 'data' to 'rows'
            console.log(`✅ Loaded ${data.rows.length} rows from survey ${survey.id}`);
            
            // Debug: Check what specialties are in this survey
            const surveySpecialties = Array.from(new Set(data.rows.map((r: any) => r.specialty)));
            console.log(`📋 Specialties in survey ${survey.id}:`, surveySpecialties);
            
            // Since survey type is undefined, we'll use a fallback approach
            // For now, we'll treat all surveys as having data that should be included
            const surveySource = (survey as any).type || 'Survey'; // Use 'Survey' as fallback
            const transformedRows = data.rows.map((row: any) => {
              // The backend already parsed the JSON data, so we can use it directly
              const transformedRow = {
                ...row,
                surveySource: surveySource,
                specialty: row.specialty || row.normalizedSpecialty || '',
                geographicRegion: row.geographic_region || row.region,
                // The percentile values are already available in the row
                tcc_p25: row.tcc_p25,
                tcc_p50: row.tcc_p50,
                tcc_p75: row.tcc_p75,
                tcc_p90: row.tcc_p90,
                cf_p25: row.cf_p25,
                cf_p50: row.cf_p50,
                cf_p75: row.cf_p75,
                cf_p90: row.cf_p90,
                wrvu_p25: row.wrvu_p25,
                wrvu_p50: row.wrvu_p50,
                wrvu_p75: row.wrvu_p75,
                wrvu_p90: row.wrvu_p90,
              };
              
              return transformedRow;
            });
            
            // Debug: Log a sample row to see the data structure
            if (allRows.length === 0 && transformedRows.length > 0) {
              console.log(`🔍 Sample row structure:`, {
                original: data.rows[0],
                transformed: transformedRows[0],
                hasTCC: !!data.rows[0].tcc_p50,
                hasCF: !!data.rows[0].cf_p50,
                hasWRVU: !!data.rows[0].wrvu_p50
              });
            }
            
            allRows = allRows.concat(transformedRows);
            console.log(`📊 Running total: ${allRows.length} rows`);
          } else {
            console.log(`❌ No data found for survey ${survey.id}`);
          }
        }
        
        console.log(`🎯 Total rows loaded: ${allRows.length}`);
        console.log(`📋 All unique specialties loaded:`, Array.from(new Set(allRows.map(r => r.specialty))));
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

  // Mapping-based specialty filter
  const filtered = useMemo(() => {
    if (!selectedSpecialty) return [];
    const mapping = mappings.find(m => m.standardizedName === selectedSpecialty);
    if (!mapping) return [];
    
    console.log(`🔍 Filtering for specialty: "${selectedSpecialty}"`);
    console.log(`📋 Available mappings:`, mapping.sourceSpecialties);
    console.log(`📊 Total rows to filter: ${normalizedRows.length}`);
    
    // Since survey sources are not properly mapped, we'll filter by specialty name only
    // This will include all rows that match any of the mapped specialty names
    const mappedSpecialtyNames = mapping.sourceSpecialties.map((spec: any) => spec.specialty);
    console.log(`🎯 Looking for specialties:`, mappedSpecialtyNames);
    
    const filteredRows = normalizedRows.filter(row => {
      const rowSpecialty = String(row.specialty || row.normalizedSpecialty || '');
      return mappedSpecialtyNames.some((mappedName: string) => 
        rowSpecialty.toLowerCase().includes(mappedName.toLowerCase()) ||
        mappedName.toLowerCase().includes(rowSpecialty.toLowerCase())
      );
    });
    
    console.log(`✅ Filtered rows found: ${filteredRows.length}`);
    if (filteredRows.length > 0) {
      console.log(`📋 Sample filtered rows:`, filteredRows.slice(0, 3).map(row => ({
        specialty: row.specialty,
        surveySource: row.surveySource,
        geographicRegion: row.geographicRegion,
        tcc_p50: row.tcc_p50
      })));
    }
    
    return filteredRows;
  }, [selectedSpecialty, mappings, normalizedRows]);

  // Helper to average a field
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // Prepare data for RegionalComparison: average each percentile field for each region
  const regionalComparisonData = useMemo(() => {
    console.log(`📊 Calculating regional comparison data for ${filtered.length} filtered rows`);
    
    // Debug: Check what regions are actually in the filtered data
    const uniqueRegions = Array.from(new Set(filtered.map(r => r.geographicRegion)));
    console.log(`🔍 Unique regions in filtered data:`, uniqueRegions);
    
    // Filter out any rows with invalid data
    const validRows = filtered.filter(r => {
      const hasValidTCC = r.tcc_p25 && r.tcc_p50 && r.tcc_p75 && r.tcc_p90;
      const hasValidCF = r.cf_p25 && r.cf_p50 && r.cf_p75 && r.cf_p90;
      return hasValidTCC || hasValidCF;
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
      
      const regionData = {
        region: regionName,
        tcc_p25: avg(regionRows.map(r => Number(r.tcc_p25) || 0)),
        tcc_p50: avg(regionRows.map(r => Number(r.tcc_p50) || 0)),
        tcc_p75: avg(regionRows.map(r => Number(r.tcc_p75) || 0)),
        tcc_p90: avg(regionRows.map(r => Number(r.tcc_p90) || 0)),
        cf_p25: avg(regionRows.map(r => Number(r.cf_p25) || 0)),
        cf_p50: avg(regionRows.map(r => Number(r.cf_p50) || 0)),
        cf_p75: avg(regionRows.map(r => Number(r.cf_p75) || 0)),
        cf_p90: avg(regionRows.map(r => Number(r.cf_p90) || 0)),
        wrvus_p25: avg(regionRows.map(r => Number(r.wrvu_p25) || 0)),
        wrvus_p50: avg(regionRows.map(r => Number(r.wrvu_p50) || 0)),
        wrvus_p75: avg(regionRows.map(r => Number(r.wrvu_p75) || 0)),
        wrvus_p90: avg(regionRows.map(r => Number(r.wrvu_p90) || 0)),
      };
      
      console.log(`📋 ${regionName}: ${regionRows.length} rows, TCC P50: $${regionData.tcc_p50.toLocaleString()}, CF P50: $${regionData.cf_p50.toLocaleString()}`);
      
      return regionData;
    });
    
    console.log(`✅ Regional comparison data calculated:`, result);
    return result;
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Specialty Selection Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Select Specialty</h3>
              <p className="text-gray-600 text-sm">Choose a specialty to analyze regional compensation patterns</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {specialties.length} Available
              </span>
            </div>
          </div>
          
          <div className="relative">
            <FormControl sx={{ width: '100%' }}>
              <Select
                value={selectedSpecialty}
                onChange={(e: React.ChangeEvent<{ value: unknown }>) => setSelectedSpecialty(e.target.value as string)}
                displayEmpty
                sx={{
                  backgroundColor: 'rgba(249, 250, 251, 0.5)',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                    height: '48px',
                    borderRadius: '12px',
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
                  '& .MuiSelect-select': {
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                      maxHeight: '300px'
                    }
                  }
                }}
              >
                <MenuItem value="" sx={{ 
                  color: '#6b7280',
                  fontStyle: 'italic',
                  '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                }}>
                  Select a specialty to begin analysis
                </MenuItem>
                {specialties.map((s: string) => (
                  <MenuItem key={s} value={s} sx={{ 
                    '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                    '&.Mui-selected': { 
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                    }
                  }}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Status Messages */}
          {selectedSpecialty && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-gray-800">
                    Analyzing: {selectedSpecialty}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                    {filtered.length} data points
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Regional Comparison Data */}
        {selectedSpecialty && regionalComparisonData.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <RegionalComparison data={regionalComparisonData} />
          </div>
        )}

        {/* Empty State */}
        {selectedSpecialty && regionalComparisonData.length === 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Regional Data Found</h3>
            <p className="text-gray-600">No compensation data available for {selectedSpecialty} across the selected regions.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegionalAnalytics; 