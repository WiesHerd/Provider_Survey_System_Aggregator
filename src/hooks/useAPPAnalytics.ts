import { useState, useEffect, useCallback, useMemo } from 'react';
import { APPSurveyRow, APPFMVFilters } from '../types/provider';
import { useAPPData } from './useAPPData';

interface APPAnalyticsData {
  // Summary statistics
  totalSurveys: number;
  totalRows: number;
  uniqueSpecialties: number;
  uniqueRegions: number;
  uniqueCertifications: number;
  uniquePracticeSettings: number;
  
  // Compensation analytics
  compensationStats: {
    tcc: { p25: number; p50: number; p75: number; p90: number };
    wrvu: { p25: number; p50: number; p75: number; p90: number };
    cf: { p25: number; p50: number; p75: number; p90: number };
  };
  
  // Specialty breakdown
  specialtyBreakdown: Array<{
    specialty: string;
    count: number;
    avgTcc: number;
    avgWrvu: number;
    avgCf: number;
  }>;
  
  // Certification breakdown
  certificationBreakdown: Array<{
    certification: string;
    count: number;
    avgTcc: number;
    avgWrvu: number;
    avgCf: number;
  }>;
  
  // Practice setting breakdown
  practiceSettingBreakdown: Array<{
    practiceSetting: string;
    count: number;
    avgTcc: number;
    avgWrvu: number;
    avgCf: number;
  }>;
  
  // Regional breakdown
  regionalBreakdown: Array<{
    region: string;
    count: number;
    avgTcc: number;
    avgWrvu: number;
    avgCf: number;
  }>;
  
  // Provider type breakdown
  providerTypeBreakdown: Array<{
    providerType: string;
    count: number;
    avgTcc: number;
    avgWrvu: number;
    avgCf: number;
  }>;
}

interface UseAPPAnalyticsReturn {
  // Data
  analyticsData: APPAnalyticsData | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  refresh: () => Promise<void>;
  updateFilters: (filters: Partial<APPFMVFilters>) => void;
  clearFilters: () => void;
  
  // Chart data
  getChartData: (type: 'specialty' | 'certification' | 'practiceSetting' | 'region' | 'providerType') => any;
  
  // Data availability
  hasData: boolean;
}

/**
 * Custom hook for APP analytics and reporting
 * Provides comprehensive analytics capabilities for APP data
 */
export const useAPPAnalytics = (): UseAPPAnalyticsReturn => {
  const [analyticsData, setAnalyticsData] = useState<APPAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<APPFMVFilters>>({});

  const { 
    surveyData, 
    filteredData, 
    summary, 
    loading: dataLoading, 
    error: dataError,
    refresh: refreshData,
    filterData,
    clearFilters: clearDataFilters,
    getCompensationStats,
  } = useAPPData();

  // Calculate analytics data
  const calculateAnalytics = useCallback(async () => {
    if (!filteredData.length) {
      setAnalyticsData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get compensation stats
      const compensationStats = await getCompensationStats(filters);

      // Calculate breakdowns
      const specialtyBreakdown = calculateSpecialtyBreakdown(filteredData);
      const certificationBreakdown = calculateCertificationBreakdown(filteredData);
      const practiceSettingBreakdown = calculatePracticeSettingBreakdown(filteredData);
      const regionalBreakdown = calculateRegionalBreakdown(filteredData);
      const providerTypeBreakdown = calculateProviderTypeBreakdown(filteredData);

      const analytics: APPAnalyticsData = {
        totalSurveys: summary?.surveyCount || 0,
        totalRows: filteredData.length,
        uniqueSpecialties: new Set(filteredData.map(row => row.specialty)).size,
        uniqueRegions: new Set(filteredData.map(row => row.region)).size,
        uniqueCertifications: new Set(filteredData.map(row => row.certification)).size,
        uniquePracticeSettings: new Set(filteredData.map(row => row.practiceSetting)).size,
        compensationStats,
        specialtyBreakdown,
        certificationBreakdown,
        practiceSettingBreakdown,
        regionalBreakdown,
        providerTypeBreakdown,
      };

      setAnalyticsData(analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate analytics');
      console.error('Error calculating APP analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [filteredData, summary, filters, getCompensationStats]);

  // Calculate specialty breakdown
  const calculateSpecialtyBreakdown = (data: APPSurveyRow[]) => {
    const specialtyMap = new Map<string, { count: number; totalTcc: number; totalWrvu: number; totalCf: number; totalIncumbents: number }>();

    data.forEach(row => {
      const existing = specialtyMap.get(row.specialty) || { count: 0, totalTcc: 0, totalWrvu: 0, totalCf: 0, totalIncumbents: 0 };
      specialtyMap.set(row.specialty, {
        count: existing.count + 1,
        totalTcc: existing.totalTcc + (row.tcc_p50 * row.n_incumbents),
        totalWrvu: existing.totalWrvu + (row.wrvu_p50 * row.n_incumbents),
        totalCf: existing.totalCf + (row.cf_p50 * row.n_incumbents),
        totalIncumbents: existing.totalIncumbents + row.n_incumbents,
      });
    });

    return Array.from(specialtyMap.entries()).map(([specialty, stats]) => ({
      specialty,
      count: stats.count,
      avgTcc: stats.totalIncumbents > 0 ? stats.totalTcc / stats.totalIncumbents : 0,
      avgWrvu: stats.totalIncumbents > 0 ? stats.totalWrvu / stats.totalIncumbents : 0,
      avgCf: stats.totalIncumbents > 0 ? stats.totalCf / stats.totalIncumbents : 0,
    })).sort((a, b) => b.count - a.count);
  };

  // Calculate certification breakdown
  const calculateCertificationBreakdown = (data: APPSurveyRow[]) => {
    const certificationMap = new Map<string, { count: number; totalTcc: number; totalWrvu: number; totalCf: number; totalIncumbents: number }>();

    data.forEach(row => {
      const existing = certificationMap.get(row.certification) || { count: 0, totalTcc: 0, totalWrvu: 0, totalCf: 0, totalIncumbents: 0 };
      certificationMap.set(row.certification, {
        count: existing.count + 1,
        totalTcc: existing.totalTcc + (row.tcc_p50 * row.n_incumbents),
        totalWrvu: existing.totalWrvu + (row.wrvu_p50 * row.n_incumbents),
        totalCf: existing.totalCf + (row.cf_p50 * row.n_incumbents),
        totalIncumbents: existing.totalIncumbents + row.n_incumbents,
      });
    });

    return Array.from(certificationMap.entries()).map(([certification, stats]) => ({
      certification,
      count: stats.count,
      avgTcc: stats.totalIncumbents > 0 ? stats.totalTcc / stats.totalIncumbents : 0,
      avgWrvu: stats.totalIncumbents > 0 ? stats.totalWrvu / stats.totalIncumbents : 0,
      avgCf: stats.totalIncumbents > 0 ? stats.totalCf / stats.totalIncumbents : 0,
    })).sort((a, b) => b.count - a.count);
  };

  // Calculate practice setting breakdown
  const calculatePracticeSettingBreakdown = (data: APPSurveyRow[]) => {
    const practiceSettingMap = new Map<string, { count: number; totalTcc: number; totalWrvu: number; totalCf: number; totalIncumbents: number }>();

    data.forEach(row => {
      const existing = practiceSettingMap.get(row.practiceSetting) || { count: 0, totalTcc: 0, totalWrvu: 0, totalCf: 0, totalIncumbents: 0 };
      practiceSettingMap.set(row.practiceSetting, {
        count: existing.count + 1,
        totalTcc: existing.totalTcc + (row.tcc_p50 * row.n_incumbents),
        totalWrvu: existing.totalWrvu + (row.wrvu_p50 * row.n_incumbents),
        totalCf: existing.totalCf + (row.cf_p50 * row.n_incumbents),
        totalIncumbents: existing.totalIncumbents + row.n_incumbents,
      });
    });

    return Array.from(practiceSettingMap.entries()).map(([practiceSetting, stats]) => ({
      practiceSetting,
      count: stats.count,
      avgTcc: stats.totalIncumbents > 0 ? stats.totalTcc / stats.totalIncumbents : 0,
      avgWrvu: stats.totalIncumbents > 0 ? stats.totalWrvu / stats.totalIncumbents : 0,
      avgCf: stats.totalIncumbents > 0 ? stats.totalCf / stats.totalIncumbents : 0,
    })).sort((a, b) => b.count - a.count);
  };

  // Calculate regional breakdown
  const calculateRegionalBreakdown = (data: APPSurveyRow[]) => {
    const regionalMap = new Map<string, { count: number; totalTcc: number; totalWrvu: number; totalCf: number; totalIncumbents: number }>();

    data.forEach(row => {
      const existing = regionalMap.get(row.region) || { count: 0, totalTcc: 0, totalWrvu: 0, totalCf: 0, totalIncumbents: 0 };
      regionalMap.set(row.region, {
        count: existing.count + 1,
        totalTcc: existing.totalTcc + (row.tcc_p50 * row.n_incumbents),
        totalWrvu: existing.totalWrvu + (row.wrvu_p50 * row.n_incumbents),
        totalCf: existing.totalCf + (row.cf_p50 * row.n_incumbents),
        totalIncumbents: existing.totalIncumbents + row.n_incumbents,
      });
    });

    return Array.from(regionalMap.entries()).map(([region, stats]) => ({
      region,
      count: stats.count,
      avgTcc: stats.totalIncumbents > 0 ? stats.totalTcc / stats.totalIncumbents : 0,
      avgWrvu: stats.totalIncumbents > 0 ? stats.totalWrvu / stats.totalIncumbents : 0,
      avgCf: stats.totalIncumbents > 0 ? stats.totalCf / stats.totalIncumbents : 0,
    })).sort((a, b) => b.count - a.count);
  };

  // Calculate provider type breakdown
  const calculateProviderTypeBreakdown = (data: APPSurveyRow[]) => {
    const providerTypeMap = new Map<string, { count: number; totalTcc: number; totalWrvu: number; totalCf: number; totalIncumbents: number }>();

    data.forEach(row => {
      const existing = providerTypeMap.get(row.providerType) || { count: 0, totalTcc: 0, totalWrvu: 0, totalCf: 0, totalIncumbents: 0 };
      providerTypeMap.set(row.providerType, {
        count: existing.count + 1,
        totalTcc: existing.totalTcc + (row.tcc_p50 * row.n_incumbents),
        totalWrvu: existing.totalWrvu + (row.wrvu_p50 * row.n_incumbents),
        totalCf: existing.totalCf + (row.cf_p50 * row.n_incumbents),
        totalIncumbents: existing.totalIncumbents + row.n_incumbents,
      });
    });

    return Array.from(providerTypeMap.entries()).map(([providerType, stats]) => ({
      providerType,
      count: stats.count,
      avgTcc: stats.totalIncumbents > 0 ? stats.totalTcc / stats.totalIncumbents : 0,
      avgWrvu: stats.totalIncumbents > 0 ? stats.totalWrvu / stats.totalIncumbents : 0,
      avgCf: stats.totalIncumbents > 0 ? stats.totalCf / stats.totalIncumbents : 0,
    })).sort((a, b) => b.count - a.count);
  };

  // Recalculate analytics when data or filters change
  useEffect(() => {
    calculateAnalytics();
  }, [calculateAnalytics]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<APPFMVFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    filterData(newFilters);
  }, [filterData]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
    clearDataFilters();
  }, [clearDataFilters]);

  // Refresh analytics
  const refresh = useCallback(async () => {
    await refreshData();
    await calculateAnalytics();
  }, [refreshData, calculateAnalytics]);

  // Get chart data
  const getChartData = useCallback((type: 'specialty' | 'certification' | 'practiceSetting' | 'region' | 'providerType') => {
    if (!analyticsData) return null;

    switch (type) {
      case 'specialty':
        return analyticsData.specialtyBreakdown.map(item => ({
          name: item.specialty,
          value: item.count,
          avgTcc: item.avgTcc,
          avgWrvu: item.avgWrvu,
          avgCf: item.avgCf,
        }));
      case 'certification':
        return analyticsData.certificationBreakdown.map(item => ({
          name: item.certification,
          value: item.count,
          avgTcc: item.avgTcc,
          avgWrvu: item.avgWrvu,
          avgCf: item.avgCf,
        }));
      case 'practiceSetting':
        return analyticsData.practiceSettingBreakdown.map(item => ({
          name: item.practiceSetting,
          value: item.count,
          avgTcc: item.avgTcc,
          avgWrvu: item.avgWrvu,
          avgCf: item.avgCf,
        }));
      case 'region':
        return analyticsData.regionalBreakdown.map(item => ({
          name: item.region,
          value: item.count,
          avgTcc: item.avgTcc,
          avgWrvu: item.avgWrvu,
          avgCf: item.avgCf,
        }));
      case 'providerType':
        return analyticsData.providerTypeBreakdown.map(item => ({
          name: item.providerType,
          value: item.count,
          avgTcc: item.avgTcc,
          avgWrvu: item.avgWrvu,
          avgCf: item.avgCf,
        }));
      default:
        return null;
    }
  }, [analyticsData]);

  // Computed values
  const hasData = useMemo(() => filteredData.length > 0, [filteredData.length]);

  return {
    // Data
    analyticsData,
    
    // Loading states
    loading: loading || dataLoading,
    error: error || dataError,
    
    // Actions
    refresh,
    updateFilters,
    clearFilters,
    
    // Chart data
    getChartData,
    
    // Data availability
    hasData,
  };
};

export default useAPPAnalytics;
