/**
 * Custom hook for managing analytics data
 * Extracted from SurveyAnalytics.tsx to improve maintainability
 */

import { useState, useEffect, useMemo } from 'react';
import { getDataService } from '../../../services/DataService';
import { ISurveyRow } from '../../../types/survey';
import { ISpecialtyMapping } from '../../../types/specialty';
import { AggregatedData } from '../utils/analyticsCalculations';
import { performanceMonitor } from '../../../shared/utils/performance';

interface UseAnalyticsDataReturn {
  data: AggregatedData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  filters: AnalyticsFilters;
  setFilters: (filters: AnalyticsFilters) => void;
  filteredData: AggregatedData[];
}

export interface AnalyticsFilters {
  specialty?: string;
  providerType?: string;
  region?: string;
  surveySource?: string;
  year?: string;
  search?: string;
}

const SHOW_DEBUG = false; // Set to false for production performance

export const useAnalyticsData = (): UseAnalyticsDataReturn => {
  const [data, setData] = useState<AggregatedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({});

  // Fetch and process analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const dataService = getDataService();
      const surveys = await dataService.getAllSurveys();
      const mappings = await dataService.getSpecialtyMappings();

      if (SHOW_DEBUG) {
        console.log('Fetched surveys:', surveys.length);
        console.log('Fetched mappings:', mappings.length);
      }

      // Process data asynchronously to avoid blocking UI
      const processedData = await processSurveyData(surveys, mappings);
      setData(processedData);

    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Process survey data into aggregated format
  const processSurveyData = async (surveys: ISurveyRow[], mappings: ISpecialtyMapping[]): Promise<AggregatedData[]> => {
    return new Promise((resolve) => {
      // Use setTimeout to make this asynchronous and avoid blocking UI
      setTimeout(() => {
        const processedData = performanceMonitor.measureTime('Data Processing', () => {
          const aggregatedData: Record<string, AggregatedData> = {};

          surveys.forEach(survey => {
            // Create unique key for aggregation
            const key = `${survey.surveySource}_${survey.surveySpecialty}_${survey.geographicRegion}`;
            
            if (!aggregatedData[key]) {
              aggregatedData[key] = {
                standardizedName: survey.standardizedName || '',
                surveySource: survey.surveySource,
                surveySpecialty: survey.surveySpecialty,
                geographicRegion: survey.geographicRegion,
                n_orgs: 0,
                n_incumbents: 0,
                tcc_p25: 0,
                tcc_p50: 0,
                tcc_p75: 0,
                tcc_p90: 0,
                wrvu_p25: 0,
                wrvu_p50: 0,
                wrvu_p75: 0,
                wrvu_p90: 0,
                cf_p25: 0,
                cf_p50: 0,
                cf_p75: 0,
                cf_p90: 0,
              };
            }

            // Aggregate data
            const record = aggregatedData[key];
            record.n_orgs += survey.n_orgs || 0;
            record.n_incumbents += survey.n_incumbents || 0;

            // Aggregate compensation metrics
            if (survey.tcc_p25) record.tcc_p25 += survey.tcc_p25;
            if (survey.tcc_p50) record.tcc_p50 += survey.tcc_p50;
            if (survey.tcc_p75) record.tcc_p75 += survey.tcc_p75;
            if (survey.tcc_p90) record.tcc_p90 += survey.tcc_p90;

            if (survey.wrvu_p25) record.wrvu_p25 += survey.wrvu_p25;
            if (survey.wrvu_p50) record.wrvu_p50 += survey.wrvu_p50;
            if (survey.wrvu_p75) record.wrvu_p75 += survey.wrvu_p75;
            if (survey.wrvu_p90) record.wrvu_p90 += survey.wrvu_p90;

            if (survey.cf_p25) record.cf_p25 += survey.cf_p25;
            if (survey.cf_p50) record.cf_p50 += survey.cf_p50;
            if (survey.cf_p75) record.cf_p75 += survey.cf_p75;
            if (survey.cf_p90) record.cf_p90 += survey.cf_p90;
          });

          return Object.values(aggregatedData);
        });

        resolve(processedData);
      }, 0);
    });
  };

  // Apply filters to data
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // Specialty filter
      if (filters.specialty && row.surveySpecialty !== filters.specialty) {
        return false;
      }

      // Region filter
      if (filters.region && row.geographicRegion !== filters.region) {
        return false;
      }

      // Survey source filter
      if (filters.surveySource && row.surveySource !== filters.surveySource) {
        return false;
      }

      // Search filter (case-insensitive)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          row.standardizedName.toLowerCase().includes(searchLower) ||
          row.surveySpecialty.toLowerCase().includes(searchLower) ||
          row.geographicRegion.toLowerCase().includes(searchLower) ||
          row.surveySource.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalyticsData,
    filters,
    setFilters,
    filteredData
  };
};
