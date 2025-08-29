import { useState, useEffect, useMemo, useCallback } from 'react';
import { getDataService } from '../../../services/DataService';
import { useYear } from '../../../contexts/YearContext';
import { AggregatedData, AnalyticsFilters } from '../types/analytics';

interface UseNormalizedAnalyticsDataReturn {
  data: AggregatedData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  filters: AnalyticsFilters;
  setFilters: (filters: AnalyticsFilters) => void;
  filteredData: AggregatedData[];
  availableOptions: {
    specialties: string[];
    providerTypes: string[];
    regions: string[];
    surveySources: string[];
    years: string[];
    variables: string[];
  };
}

export const useNormalizedAnalyticsData = (): UseNormalizedAnalyticsDataReturn => {
  const [data, setData] = useState<AggregatedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  
  const { currentYear, availableYears } = useYear();
  const dataService = getDataService();

  // Fetch and process normalized analytics data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching normalized analytics data for year:', currentYear);

      // Get all surveys
      const surveys = await dataService.getAllSurveys();
      console.log('📊 Found surveys:', surveys.length);

      // Filter surveys by current year if specified
      const yearFilteredSurveys = filters.year 
        ? surveys.filter(survey => survey.year === filters.year)
        : surveys;

      console.log('📅 Year-filtered surveys:', yearFilteredSurveys.length);

      // Load normalized data from each survey
      const allNormalizedData: AggregatedData[] = [];
      
      for (const survey of yearFilteredSurveys) {
        try {
          console.log(`📋 Loading data for survey: ${survey.name} (${survey.year})`);
          
          // Use the normalized data endpoint
          const response = await dataService.getSurveyData(survey.id, {
            specialty: filters.specialty,
            providerType: filters.providerType,
            region: filters.region
          }, { limit: 10000 }); // Get all data

          if (response && response.rows) {
            console.log(`✅ Loaded ${response.rows.length} normalized rows from ${survey.name}`);
            
            // Transform normalized data to aggregated format
            const transformedData = response.rows.map((row: any) => ({
              id: row.id,
              surveySource: survey.type || 'Unknown',
              surveySpecialty: row.specialty || '',
              geographicRegion: row.geographicRegion || '',
              providerType: row.providerType || '',
              n_orgs: row.n_orgs || 0,
              n_incumbents: row.n_incumbents || 0,
              surveyYear: survey.year || currentYear,
              
              // Variable-specific data
              variable: row.variable || '',
              p25: row.p25 || 0,
              p50: row.p50 || 0,
              p75: row.p75 || 0,
              p90: row.p90 || 0,
              
              // Legacy fields for compatibility (will be removed in future)
              tcc_p25: row.variable === 'Total Cash Compensation' ? row.p25 : 0,
              tcc_p50: row.variable === 'Total Cash Compensation' ? row.p50 : 0,
              tcc_p75: row.variable === 'Total Cash Compensation' ? row.p75 : 0,
              tcc_p90: row.variable === 'Total Cash Compensation' ? row.p90 : 0,
              wrvu_p25: row.variable === 'Work RVUs' ? row.p25 : 0,
              wrvu_p50: row.variable === 'Work RVUs' ? row.p50 : 0,
              wrvu_p75: row.variable === 'Work RVUs' ? row.p75 : 0,
              wrvu_p90: row.variable === 'Work RVUs' ? row.p90 : 0,
              cf_p25: row.variable === 'Conversion Factor' ? row.p25 : 0,
              cf_p50: row.variable === 'Conversion Factor' ? row.p50 : 0,
              cf_p75: row.variable === 'Conversion Factor' ? row.p75 : 0,
              cf_p90: row.variable === 'Conversion Factor' ? row.p90 : 0,
              
              // Standardized name (for specialty mapping compatibility)
              standardizedName: row.specialty || '',
              rawData: row
            }));

            allNormalizedData.push(...transformedData);
          }
        } catch (surveyError) {
          console.error(`❌ Error loading survey ${survey.name}:`, surveyError);
          // Continue with other surveys
        }
      }

      console.log(`🎯 Total normalized data rows: ${allNormalizedData.length}`);
      setData(allNormalizedData);

    } catch (err) {
      console.error('Error fetching normalized analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [currentYear, filters.year, filters.specialty, filters.providerType, filters.region, dataService]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // Year filter
      if (filters.year && row.surveyYear !== filters.year) {
        return false;
      }

      // Specialty filter
      if (filters.specialty && row.surveySpecialty.toLowerCase() !== filters.specialty.toLowerCase()) {
        return false;
      }

      // Provider type filter
      if (filters.providerType && row.providerType.toLowerCase() !== filters.providerType.toLowerCase()) {
        return false;
      }

      // Region filter
      if (filters.region && row.geographicRegion.toLowerCase() !== filters.region.toLowerCase()) {
        return false;
      }

      // Survey source filter
      if (filters.surveySource && row.surveySource.toLowerCase() !== filters.surveySource.toLowerCase()) {
        return false;
      }

      // Variable filter
      if (filters.variable && row.variable !== filters.variable) {
        return false;
      }

      // Search filter (case-insensitive)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          row.surveySpecialty.toLowerCase().includes(searchLower) ||
          row.geographicRegion.toLowerCase().includes(searchLower) ||
          row.surveySource.toLowerCase().includes(searchLower) ||
          row.variable.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters]);

  // Calculate available options for filters
  const availableOptions = useMemo(() => {
    const specialties = [...new Set(data.map(row => row.surveySpecialty))].filter(Boolean).sort();
    const providerTypes = [...new Set(data.map(row => row.providerType))].filter(Boolean).sort();
    const regions = [...new Set(data.map(row => row.geographicRegion))].filter(Boolean).sort();
    const surveySources = [...new Set(data.map(row => row.surveySource))].filter(Boolean).sort();
    const years = [...new Set(data.map(row => row.surveyYear))].filter(Boolean).sort();
    const variables = [...new Set(data.map(row => row.variable))].filter(Boolean).sort();

    return {
      specialties,
      providerTypes,
      regions,
      surveySources,
      years: years.length > 0 ? years : availableYears,
      variables
    };
  }, [data, availableYears]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalyticsData,
    filters,
    setFilters,
    filteredData,
    availableOptions
  };
};
