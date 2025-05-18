import React, { useEffect, useState, useMemo } from 'react';
import { ArrowDownIcon, ArrowUpIcon, MapIcon, DocumentArrowDownIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { ISurveyRow } from '../types/survey';
import { LocalStorageService } from '../services/StorageService';
import { SpecialtyMappingService } from '../services/SpecialtyMappingService';
import RegionalComparison from './RegionalComparison';

const REGION_NAMES = ['National', 'Northeast', 'North Central', 'South', 'West'];

export const RegionalAnalytics: React.FC = () => {
  const [normalizedRows, setNormalizedRows] = useState<ISurveyRow[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [mappings, setMappings] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const storageService = new LocalStorageService();
      const mappingService = new SpecialtyMappingService(storageService);
      const allMappings = await mappingService.getAllMappings();
      setMappings(allMappings);
      const surveys = await storageService.listSurveys();
      let allRows: ISurveyRow[] = [];
      for (const survey of surveys) {
        const data = await storageService.getSurveyData(survey.id);
        if (data && data.rows) {
          // Add surveySource to each row for mapping-based filtering
          allRows = allRows.concat(data.rows.map(row => ({
            ...row,
            surveySource: survey.metadata?.surveyType || '',
            specialty: row.specialty || row.normalizedSpecialty || '',
          })));
        }
      }
      setNormalizedRows(allRows);
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
    // For each mapped source specialty, filter rows
    return normalizedRows.filter(row =>
      mapping.sourceSpecialties.some(
        (spec: any) =>
          (row.specialty === spec.specialty || row.normalizedSpecialty === spec.specialty) &&
          row.surveySource === spec.surveySource
      )
    );
  }, [selectedSpecialty, mappings, normalizedRows]);

  // Helper to average a field
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // Prepare data for RegionalComparison: average each percentile field for each region
  const regionalComparisonData = useMemo(() => {
    return REGION_NAMES.map(regionName => {
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
  }, [filtered]);

  return (
    <div className="w-full min-h-screen">
      <div className="mx-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex items-center gap-4 mt-8">
            <label className="font-semibold">Specialty:</label>
            <select
              className="border rounded px-3 py-2 min-w-[220px]"
              value={selectedSpecialty}
              onChange={e => setSelectedSpecialty(e.target.value)}
            >
              <option value="">Select a specialty</option>
              {specialties.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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