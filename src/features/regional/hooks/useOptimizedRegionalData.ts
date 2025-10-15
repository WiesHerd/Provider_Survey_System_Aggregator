/**
 * Optimized Regional Data Hook
 * Enterprise-grade performance with intelligent caching for Regional Analytics
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAnalysisToolsPerformanceService } from '../../../services/AnalysisToolsPerformanceService';

interface RegionalFilters {
  specialty?: string;
  providerType?: string;
  surveySource?: string;
  year?: string;
}

interface UseOptimizedRegionalDataReturn {
  // State
  analyticsData: any[];
  mappings: any[];
  regionMappings: any[];
  loading: boolean;
  error: string | null;
  
  // Filters
  selectedSpecialty: string;
  selectedProviderType: string;
  selectedSurveySource: string;
  selectedYear: string;
  
  // Computed values
  filteredData: any[];
  regionalComparisonData: any[];
  
  // Actions
  setSelectedSpecialty: (specialty: string) => void;
  setSelectedProviderType: (providerType: string) => void;
  setSelectedSurveySource: (surveySource: string) => void;
  setSelectedYear: (year: string) => void;
  
  // Data operations
  loadData: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Performance
  clearCache: () => void;
  getCacheStats: () => any;
  clearError: () => void;
  
  // Performance metrics
  lastLoadTime: number;
  cacheHitRate: number;
}

/**
 * Optimized hook for managing regional analytics data
 */
export const useOptimizedRegionalData = (
  initialFilters: RegionalFilters = {}
): UseOptimizedRegionalDataReturn => {
  // State declarations
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [regionMappings, setRegionMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [cacheHitRate, setCacheHitRate] = useState<number>(0);

  // Filter state
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(initialFilters.specialty || '');
  const [selectedProviderType, setSelectedProviderType] = useState<string>(initialFilters.providerType || '');
  const [selectedSurveySource, setSelectedSurveySource] = useState<string>(initialFilters.surveySource || '');
  const [selectedYear, setSelectedYear] = useState<string>(initialFilters.year || '');

  // Performance service
  const performanceService = useMemo(() => getAnalysisToolsPerformanceService(), []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Computed values with memoization
  const filteredData = useMemo(() => {
    if (!analyticsData.length) return [];
    
    return analyticsData.filter(row => {
      const specialtyMatch = !selectedSpecialty || row.specialty === selectedSpecialty;
      const providerTypeMatch = !selectedProviderType || row.providerType === selectedProviderType;
      const surveySourceMatch = !selectedSurveySource || row.surveySource === selectedSurveySource;
      const yearMatch = !selectedYear || row.surveyYear === selectedYear;
      
      return specialtyMatch && providerTypeMatch && surveySourceMatch && yearMatch;
    });
  }, [analyticsData, selectedSpecialty, selectedProviderType, selectedSurveySource, selectedYear]);

  const regionalComparisonData = useMemo(() => {
    if (!filteredData.length) return [];
    
    console.log(`📊 Calculating regional comparison data for ${filteredData.length} filtered rows`);
    
    // Get standardized region names from mappings
    const standardizedRegions = regionMappings.length > 0 
      ? regionMappings.map(m => m.standardizedName).sort()
      : ['national', 'northeast', 'midwest', 'south', 'west'];
    
    // Ensure National is first
    const orderedRegions = ['national', ...standardizedRegions.filter(r => r !== 'national')];
    
    console.log(`🌍 Using ordered regions:`, orderedRegions);
    
    // Filter out any rows with invalid data
    const validRows = filteredData.filter(r => {
      const hasValidTCC = Number(r.tcc_p50) > 0 || Number(r.tcc_p25) > 0 || Number(r.tcc_p75) > 0 || Number(r.tcc_p90) > 0;
      const hasValidCF = Number(r.cf_p50) > 0 || Number(r.cf_p25) > 0 || Number(r.cf_p75) > 0 || Number(r.cf_p90) > 0;
      const hasValidWRVU = Number(r.wrvu_p50) > 0 || Number(r.wrvu_p25) > 0 || Number(r.wrvu_p75) > 0 || Number(r.wrvu_p90) > 0;
      return hasValidTCC || hasValidCF || hasValidWRVU;
    });
    
    console.log(`✅ Valid rows with data: ${validRows.length} out of ${filteredData.length}`);
    
    // Group by region and calculate averages
    const regionData = new Map<string, any[]>();
    
    validRows.forEach(row => {
      const region = row.geographicRegion?.toLowerCase() || 'national';
      if (!regionData.has(region)) {
        regionData.set(region, []);
      }
      regionData.get(region)!.push(row);
    });
    
    // Calculate regional comparison data
    const comparisonData = orderedRegions.map(region => {
      const regionRows = regionData.get(region) || [];
      
      if (regionRows.length === 0) {
        return {
          region: region,
          count: 0,
          tcc_p50: 0,
          cf_p50: 0,
          wrvu_p50: 0
        };
      }
      
      // Calculate averages
      const tccValues = regionRows.map(r => Number(r.tcc_p50)).filter(v => v > 0);
      const cfValues = regionRows.map(r => Number(r.cf_p50)).filter(v => v > 0);
      const wrvuValues = regionRows.map(r => Number(r.wrvu_p50)).filter(v => v > 0);
      
      return {
        region: region,
        count: regionRows.length,
        tcc_p50: tccValues.length > 0 ? tccValues.reduce((a, b) => a + b, 0) / tccValues.length : 0,
        cf_p50: cfValues.length > 0 ? cfValues.reduce((a, b) => a + b, 0) / cfValues.length : 0,
        wrvu_p50: wrvuValues.length > 0 ? wrvuValues.reduce((a, b) => a + b, 0) / wrvuValues.length : 0
      };
    });
    
    return comparisonData;
  }, [filteredData, regionMappings]);

  // Optimized data loading with performance monitoring
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Starting optimized regional analytics data load...');
      const startTime = performance.now();
      
      const filters = {
        specialty: selectedSpecialty,
        providerType: selectedProviderType,
        surveySource: selectedSurveySource,
        year: selectedYear
      };
      
      const data = await performanceService.getRegionalAnalyticsData(filters);
      
      const duration = performance.now() - startTime;
      setLastLoadTime(duration);
      setCacheHitRate(duration < 1000 ? 95 : 60); // Estimate cache hit rate based on load time
      
      console.log(`✅ Regional analytics data loaded in ${duration.toFixed(2)}ms`);
      
      setAnalyticsData(data.analyticsData);
      setMappings(data.mappings);
      setRegionMappings(data.regionMappings);
      
    } catch (err) {
      console.error('Error loading optimized regional analytics data:', err);
      setError('Failed to load regional analytics data');
    } finally {
      setLoading(false);
    }
  }, [performanceService, selectedSpecialty, selectedProviderType, selectedSurveySource, selectedYear]);

  // Reload data when filters change
  useEffect(() => {
    if (analyticsData.length > 0) {
      loadData();
    }
  }, [selectedSpecialty, selectedProviderType, selectedSurveySource, selectedYear, loadData]);

  // Performance operations
  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing regional analytics data...');
    performanceService.clearCache('regionalAnalytics');
    await loadData();
  }, [performanceService, loadData]);

  const clearCache = useCallback(() => {
    performanceService.clearCache();
    console.log('🗑️ Cache cleared');
  }, [performanceService]);

  const getCacheStats = useCallback(() => {
    return performanceService.getCacheStats();
  }, [performanceService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    analyticsData,
    mappings,
    regionMappings,
    loading,
    error,
    
    // Filters
    selectedSpecialty,
    selectedProviderType,
    selectedSurveySource,
    selectedYear,
    
    // Computed values
    filteredData,
    regionalComparisonData,
    
    // Actions
    setSelectedSpecialty,
    setSelectedProviderType,
    setSelectedSurveySource,
    setSelectedYear,
    
    // Data operations
    loadData,
    refreshData,
    
    // Performance
    clearCache,
    getCacheStats,
    clearError,
    
    // Performance metrics
    lastLoadTime,
    cacheHitRate
  };
};
