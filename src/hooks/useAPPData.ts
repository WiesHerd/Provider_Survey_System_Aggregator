import { useState, useEffect, useCallback, useMemo } from 'react';
import { APPSurveyRow, APPFMVFilters } from '../types/provider';
import APPDataService from '../services/APPDataService';

interface UseAPPDataReturn {
  // Data
  surveys: any[];
  surveyData: APPSurveyRow[];
  filteredData: APPSurveyRow[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Data summary
  summary: {
    surveyCount: number;
    totalRows: number;
    specialties: string[];
    regions: string[];
    providerTypes: string[];
    certifications: string[];
    practiceSettings: string[];
  } | null;
  
  // Actions
  refresh: () => Promise<void>;
  filterData: (filters: Partial<APPFMVFilters>) => void;
  clearFilters: () => void;
  
  // Specific data getters
  getDataBySpecialty: (specialty: string) => Promise<APPSurveyRow[]>;
  getDataByCertification: (certification: string) => Promise<APPSurveyRow[]>;
  getDataByPracticeSetting: (practiceSetting: string) => Promise<APPSurveyRow[]>;
  getDataBySupervisionLevel: (supervisionLevel: string) => Promise<APPSurveyRow[]>;
  
  // Compensation stats
  getCompensationStats: (filters?: Partial<APPFMVFilters>) => Promise<any>;
  
  // Data availability
  hasData: boolean;
  dataCount: number;
}

/**
 * Custom hook for managing APP (Advanced Practice Provider) data
 * Provides comprehensive data access and filtering capabilities for APP-specific data
 */
export const useAPPData = (): UseAPPDataReturn => {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [surveyData, setSurveyData] = useState<APPSurveyRow[]>([]);
  const [filteredData, setFilteredData] = useState<APPSurveyRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<APPFMVFilters>>({});

  const appDataService = useMemo(() => APPDataService.getInstance(), []);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [surveysData, allSurveyData, summaryData] = await Promise.all([
        appDataService.getAPPSurveys(),
        appDataService.getAllAPPSurveyData(),
        appDataService.getAPPDataSummary(),
      ]);

      setSurveys(surveysData);
      setSurveyData(allSurveyData);
      setSummary(summaryData);
      setFilteredData(allSurveyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load APP data');
      console.error('Error loading APP data:', err);
    } finally {
      setLoading(false);
    }
  }, [appDataService]);

  // Filter data based on current filters
  const applyFilters = useCallback(async () => {
    if (Object.keys(filters).length === 0) {
      setFilteredData(surveyData);
      return;
    }

    try {
      const filtered = await appDataService.filterAPPData(filters);
      setFilteredData(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to filter APP data');
      console.error('Error filtering APP data:', err);
    }
  }, [filters, surveyData, appDataService]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter data function
  const filterData = useCallback((newFilters: Partial<APPFMVFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters function
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Refresh data function
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Specific data getters
  const getDataBySpecialty = useCallback(async (specialty: string): Promise<APPSurveyRow[]> => {
    try {
      return await appDataService.getAPPDataBySpecialty(specialty);
    } catch (err) {
      console.error('Error getting APP data by specialty:', err);
      return [];
    }
  }, [appDataService]);

  const getDataByCertification = useCallback(async (certification: string): Promise<APPSurveyRow[]> => {
    try {
      return await appDataService.getAPPDataByCertification(certification);
    } catch (err) {
      console.error('Error getting APP data by certification:', err);
      return [];
    }
  }, [appDataService]);

  const getDataByPracticeSetting = useCallback(async (practiceSetting: string): Promise<APPSurveyRow[]> => {
    try {
      return await appDataService.getAPPDataByPracticeSetting(practiceSetting);
    } catch (err) {
      console.error('Error getting APP data by practice setting:', err);
      return [];
    }
  }, [appDataService]);

  const getDataBySupervisionLevel = useCallback(async (supervisionLevel: string): Promise<APPSurveyRow[]> => {
    try {
      return await appDataService.getAPPDataBySupervisionLevel(supervisionLevel);
    } catch (err) {
      console.error('Error getting APP data by supervision level:', err);
      return [];
    }
  }, [appDataService]);

  // Get compensation statistics
  const getCompensationStats = useCallback(async (statsFilters?: Partial<APPFMVFilters>) => {
    try {
      return await appDataService.getAPPCompensationStats(statsFilters || filters);
    } catch (err) {
      console.error('Error getting APP compensation stats:', err);
      return {
        tcc: { p25: 0, p50: 0, p75: 0, p90: 0 },
        wrvu: { p25: 0, p50: 0, p75: 0, p90: 0 },
        cf: { p25: 0, p50: 0, p75: 0, p90: 0 },
        count: 0,
      };
    }
  }, [appDataService, filters]);

  // Computed values
  const hasData = useMemo(() => surveyData.length > 0, [surveyData.length]);
  const dataCount = useMemo(() => filteredData.length, [filteredData.length]);

  return {
    // Data
    surveys,
    surveyData,
    filteredData,
    
    // Loading states
    loading,
    error,
    
    // Data summary
    summary,
    
    // Actions
    refresh,
    filterData,
    clearFilters,
    
    // Specific data getters
    getDataBySpecialty,
    getDataByCertification,
    getDataByPracticeSetting,
    getDataBySupervisionLevel,
    
    // Compensation stats
    getCompensationStats,
    
    // Data availability
    hasData,
    dataCount,
  };
};

export default useAPPData;
