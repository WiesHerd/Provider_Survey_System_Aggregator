import React, { useEffect, useState, useMemo } from 'react';
import { ArrowDownIcon, ArrowUpIcon, MapIcon, DocumentArrowDownIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { ISurveyRow } from '../types/survey';
import { LocalStorageService } from '../services/StorageService';
import { SpecialtyMappingService } from '../services/SpecialtyMappingService';
import BackendService from '../services/BackendService';
import RegionalComparison from './RegionalComparison';

const REGION_NAMES = ['National', 'Northeast', 'Midwest', 'South', 'West'];

export const RegionalAnalytics: React.FC = () => {
  const [normalizedRows, setNormalizedRows] = useState<ISurveyRow[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [mappings, setMappings] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
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
              return {
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
            });
            
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
    
    const result = REGION_NAMES.map(regionName => {
      // For 'National', use all filtered rows
      const regionRows = regionName === 'National'
        ? filtered
        : filtered.filter(r => r.geographicRegion === regionName);
      
      console.log(`🔍 Filtering for region "${regionName}": found ${regionRows.length} rows`);
      if (regionRows.length > 0) {
        console.log(`📋 Sample rows for ${regionName}:`, regionRows.slice(0, 2).map(r => ({
          specialty: r.specialty,
          region: r.geographicRegion,
          tcc_p50: r.tcc_p50,
          raw_tcc_p50: r.tcc_p50,
          has_data_property: !!r.data,
          data_type: typeof r.data,
          parsed_data_keys: r.data ? Object.keys(r.data) : 'no data'
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
      
      console.log(`📋 ${regionName}: ${regionRows.length} rows, TCC P50: $${regionData.tcc_p50.toLocaleString()}`);
      
      return regionData;
    });
    
    console.log(`✅ Regional comparison data calculated:`, result);
    return result;
  }, [filtered]);

  return (
    <div className="w-full overflow-x-hidden">
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel id="specialty-label">Specialty</InputLabel>
              <Select
                labelId="specialty-label"
                value={selectedSpecialty}
                label="Specialty"
                onChange={(e: React.ChangeEvent<{ value: unknown }>) => setSelectedSpecialty(e.target.value as string)}
                sx={{
                  backgroundColor: 'white',
                  height: '40px',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                    height: '40px',
                    borderRadius: '8px',
                  },
                  '& .MuiSelect-select': {
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }
                }}
              >
                <MenuItem value="">Select a specialty</MenuItem>
                {specialties.map((s: string) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          {selectedSpecialty && (
            <RegionalComparison data={regionalComparisonData} />
          )}
        </div>
      </div>
    </div>
  );
};

export default RegionalAnalytics; 