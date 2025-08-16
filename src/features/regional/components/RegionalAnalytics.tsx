import React, { useEffect, useState, useMemo } from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { ISurveyRow } from '../../../types/survey';
import { LocalStorageService } from '../../../services/StorageService';
import { SpecialtyMappingService } from '../../../services/SpecialtyMappingService';
import BackendService from '../../../services/BackendService';
import { RegionalComparison } from './RegionalComparison';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';

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
        setMappings(allMappings);
        
        // Get surveys from backend
        const surveys = await backendService.getAllSurveys();
        console.log(`📊 Found ${surveys.length} surveys`);
        let allRows: ISurveyRow[] = [];
        
        // Load data from each survey
        for (const survey of surveys) {
          console.log(`🔍 Loading data for survey: ${survey.id}`);
          const data = await backendService.getSurveyData(survey.id, undefined, { limit: 10000 });
          if (data && data.rows) {
            console.log(`✅ Loaded ${data.rows.length} rows from survey ${survey.id}`);
            
            const surveySource = (survey as any).type || 'Survey';
            const transformedRows = data.rows.map((row: any) => {
              return {
                ...row,
                surveySource: surveySource,
                specialty: row.specialty || row.normalizedSpecialty || '',
                geographicRegion: row.geographic_region || row.region,
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
          }
        }
        
        console.log(`🎯 Total rows loaded: ${allRows.length}`);
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
    
    const mappedSpecialtyNames = mapping.sourceSpecialties.map((spec: any) => spec.specialty);
    
    const filteredRows = normalizedRows.filter(row => {
      const rowSpecialty = String(row.specialty || row.normalizedSpecialty || '');
      return mappedSpecialtyNames.some((mappedName: string) => 
        rowSpecialty.toLowerCase().includes(mappedName.toLowerCase()) ||
        mappedName.toLowerCase().includes(rowSpecialty.toLowerCase())
      );
    });
    
    return filteredRows;
  }, [selectedSpecialty, mappings, normalizedRows]);

  // Helper to average a field
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // Prepare data for RegionalComparison: average each percentile field for each region
  const regionalComparisonData = useMemo(() => {
    const result = REGION_NAMES.map(regionName => {
      // For 'National', use all filtered rows
      const regionRows = regionName === 'National'
        ? filtered
        : filtered.filter(r => r.geographicRegion === regionName);
      
      return {
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
    });
    
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
                onChange={(e: SelectChangeEvent<string>) => setSelectedSpecialty(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              >
                <MenuItem value="">Select a specialty</MenuItem>
                {specialties.map((s: string) => (
                  <MenuItem key={s} value={s}>
                    {formatSpecialtyForDisplay(s)}
                  </MenuItem>
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
