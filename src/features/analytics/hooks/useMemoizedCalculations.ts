/**
 * Analytics Memoization Hooks
 * 
 * Custom hooks for caching expensive analytics computations.
 * Implements React.useMemo with computation cache integration.
 */

import { useMemo, useCallback } from 'react';
import { analyticsComputationCache, cacheUtils } from '../services/analyticsComputationCache';
import { groupBySpecialty, calculateSummaryRows, filterAnalyticsData } from '../utils/analyticsCalculations';
import { AnalyticsData, AnalyticsFilters } from '../types/analytics';
import {
  getTccP25, getTccP50, getTccP75, getTccP90,
  getCfP25, getCfP50, getCfP75, getCfP90,
  getWrvuP25, getWrvuP50, getWrvuP75, getWrvuP90,
  getTccNOrgs, getTccNIncumbents,
  getWrvuNOrgs, getWrvuNIncumbents,
  getCfNOrgs, getCfNIncumbents
} from '../../../shared/utils/analyticsDataAccessors';

/**
 * Memoized grouping hook
 * Caches groupBySpecialty results using computation cache
 */
export const useMemoizedGrouping = (data: any[]) => {
  return useMemo(() => {
    console.log('🔍 useMemoizedGrouping: Input data length:', data?.length || 0);
    
    if (!data || data.length === 0) {
      console.log('🔍 useMemoizedGrouping: No data, returning empty object');
      return {};
    }

    // Debug: Check the first few rows to see their structure
    if (data.length > 0) {
      console.log('🔍 useMemoizedGrouping: First row sample:', {
        standardizedName: data[0].standardizedName,
        surveySource: data[0].surveySource,
        surveySpecialty: data[0].surveySpecialty,
        originalSpecialty: data[0].originalSpecialty,
        geographicRegion: data[0].geographicRegion
      });
    }

    // Generate cache key
    const dataHash = JSON.stringify(data.map(d => d.surveySpecialty || d.standardizedName));
    const cacheKey = cacheUtils.groupingKey(dataHash, 'specialty');

    // Check cache first
    const cached = analyticsComputationCache.get<Record<string, any[]>>(cacheKey);
    if (cached) {
      console.log('🔍 useMemoizedGrouping: Using cached result with', Object.keys(cached).length, 'specialties');
      return cached;
    }

    // Compute and cache result
    const result = groupBySpecialty(data);
    console.log('🔍 useMemoizedGrouping: Grouped result has', Object.keys(result).length, 'specialties:', Object.keys(result));
    analyticsComputationCache.set(cacheKey, result);
    
    return result;
  }, [data]);
};

/**
 * Memoized summary statistics hook
 * Caches all summary calculations for AnalyticsSummary component
 */
export const useMemoizedSummary = (data: AnalyticsData[]) => {
  return useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalRecords: 0,
        totalTccOrganizations: 0,
        totalTccIncumbents: 0,
        totalWrvuOrganizations: 0,
        totalWrvuIncumbents: 0,
        totalCfOrganizations: 0,
        totalCfIncumbents: 0,
        averageTccP50: 0,
        averageWrvuP50: 0,
        averageCfP50: 0,
        uniqueSpecialties: new Set(),
        uniqueSources: new Set(),
        uniqueRegions: new Set()
      };
    }

    // Generate cache key based on data content
    const dataHash = JSON.stringify(data.map(d => ({
      tcc_p50: getTccP50(d),
      wrvu_p50: getWrvuP50(d),
      cf_p50: getCfP50(d),
      surveySpecialty: d.surveySpecialty,
      surveySource: d.surveySource,
      geographicRegion: d.geographicRegion
    })));
    
    const cacheKey = cacheUtils.summaryKey(dataHash, ['summary']);

    // Check cache first
    const cached = analyticsComputationCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Compute all summary statistics
    const totalRecords = data.length;
    // Note: For dynamic format, we can't easily get n_orgs/n_incumbents without knowing which variable
    // For now, we'll use 0 for dynamic format or extract from first variable if available
    const totalTccOrganizations = data.reduce((sum, row) => {
      if ('tcc_n_orgs' in row) {
        return sum + (row as any).tcc_n_orgs;
      }
      // For dynamic format, try to get from variables if available
      if ('variables' in row && row.variables.tcc) {
        return sum + (row.variables.tcc.n_orgs || 0);
      }
      return sum;
    }, 0);
    const totalTccIncumbents = data.reduce((sum, row) => {
      if ('tcc_n_incumbents' in row) {
        return sum + (row as any).tcc_n_incumbents;
      }
      if ('variables' in row && row.variables.tcc) {
        return sum + (row.variables.tcc.n_incumbents || 0);
      }
      return sum;
    }, 0);
    const totalWrvuOrganizations = data.reduce((sum, row) => {
      if ('wrvu_n_orgs' in row) {
        return sum + (row as any).wrvu_n_orgs;
      }
      if ('variables' in row && row.variables.work_rvus) {
        return sum + (row.variables.work_rvus.n_orgs || 0);
      }
      return sum;
    }, 0);
    const totalWrvuIncumbents = data.reduce((sum, row) => {
      if ('wrvu_n_incumbents' in row) {
        return sum + (row as any).wrvu_n_incumbents;
      }
      if ('variables' in row && row.variables.work_rvus) {
        return sum + (row.variables.work_rvus.n_incumbents || 0);
      }
      return sum;
    }, 0);
    const totalCfOrganizations = data.reduce((sum, row) => {
      if ('cf_n_orgs' in row) {
        return sum + (row as any).cf_n_orgs;
      }
      if ('variables' in row && row.variables.cf) {
        return sum + (row.variables.cf.n_orgs || 0);
      }
      return sum;
    }, 0);
    const totalCfIncumbents = data.reduce((sum, row) => {
      if ('cf_n_incumbents' in row) {
        return sum + (row as any).cf_n_incumbents;
      }
      if ('variables' in row && row.variables.cf) {
        return sum + (row.variables.cf.n_incumbents || 0);
      }
      return sum;
    }, 0);
    
    const tccP50Values = data.map(row => getTccP50(row)).filter(val => val > 0);
    const wrvuP50Values = data.map(row => getWrvuP50(row)).filter(val => val > 0);
    const cfP50Values = data.map(row => getCfP50(row)).filter(val => val > 0);

    const averageTccP50 = tccP50Values.length > 0 
      ? tccP50Values.reduce((sum, val) => sum + val, 0) / tccP50Values.length 
      : 0;
    const averageWrvuP50 = wrvuP50Values.length > 0 
      ? wrvuP50Values.reduce((sum, val) => sum + val, 0) / wrvuP50Values.length 
      : 0;
    const averageCfP50 = cfP50Values.length > 0 
      ? cfP50Values.reduce((sum, val) => sum + val, 0) / cfP50Values.length 
      : 0;

    const uniqueSpecialties = new Set(data.map(row => row.surveySpecialty));
    const uniqueSources = new Set(data.map(row => row.surveySource));
    const uniqueRegions = new Set(data.map(row => row.geographicRegion));

    const result = {
      totalRecords,
      totalTccOrganizations,
      totalTccIncumbents,
      totalWrvuOrganizations,
      totalWrvuIncumbents,
      totalCfOrganizations,
      totalCfIncumbents,
      averageTccP50,
      averageWrvuP50,
      averageCfP50,
      uniqueSpecialties,
      uniqueSources,
      uniqueRegions
    };

    // Cache the result
    analyticsComputationCache.set(cacheKey, result);
    
    return result;
  }, [data]);
};

/**
 * Memoized summary rows hook for table calculations
 * Caches calculateSummaryRows and calculateDynamicSummaryRows results
 */
export const useMemoizedSummaryRows = (rows: AnalyticsData[], variables?: string[]) => {
  return useMemo(() => {
    if (!rows || rows.length === 0) {
      return { simple: {}, weighted: {} };
    }

    // Generate cache key using accessor functions
    const dataHash = JSON.stringify(rows.map(r => ({
      tcc_n_orgs: getTccNOrgs(r),
      tcc_n_incumbents: getTccNIncumbents(r),
      tcc_p25: getTccP25(r),
      tcc_p50: getTccP50(r),
      tcc_p75: getTccP75(r),
      tcc_p90: getTccP90(r),
      wrvu_n_orgs: getWrvuNOrgs(r),
      wrvu_n_incumbents: getWrvuNIncumbents(r),
      wrvu_p25: getWrvuP25(r),
      wrvu_p50: getWrvuP50(r),
      wrvu_p75: getWrvuP75(r),
      wrvu_p90: getWrvuP90(r),
      cf_n_orgs: getCfNOrgs(r),
      cf_n_incumbents: getCfNIncumbents(r),
      cf_p25: getCfP25(r),
      cf_p50: getCfP50(r),
      cf_p75: getCfP75(r),
      cf_p90: getCfP90(r)
    })));
    
    const cacheKey = variables && variables.length > 0 
      ? cacheUtils.summaryKey(dataHash, variables)
      : cacheUtils.summaryKey(dataHash, ['legacy']);

    // Check cache first
    const cached = analyticsComputationCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Production-grade: Unified calculation for all data
    const result = calculateSummaryRows(rows, variables || []);

    // Cache the result
    analyticsComputationCache.set(cacheKey, result);
    
    return result;
  }, [rows, variables]);
};

/**
 * Memoized filtering hook
 * Caches filter results to avoid re-filtering on every render
 */
export const useMemoizedFiltering = (data: AnalyticsData[], filters: AnalyticsFilters) => {
  return useMemo(() => {
    if (!data || data.length === 0) return [];

    // Generate cache key from data and filters
    const dataHash = JSON.stringify(data.map(d => ({
      surveySpecialty: d.surveySpecialty,
      surveySource: d.surveySource,
      geographicRegion: d.geographicRegion,
      providerType: d.providerType,
      surveyYear: d.surveyYear
    })));
    
    const filterHash = JSON.stringify(filters);
    const cacheKey = cacheUtils.filterKey(dataHash, filterHash);

    // Check cache first
    const cached = analyticsComputationCache.get<AnalyticsData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Apply filters
    const result = filterAnalyticsData(data, filters);
    
    // Cache the result
    analyticsComputationCache.set(cacheKey, result);
    
    return result;
  }, [data, filters]);
};

/**
 * Memoized column groups hook for dynamic variables
 * Caches column group generation for AnalyticsTable
 */
export const useMemoizedColumnGroups = (selectedVariables: string[], isDynamicData: boolean) => {
  return useMemo(() => {
    // FIXED: Generate column groups even for legacy data when variables are selected
    if (selectedVariables.length === 0) {
      return [];
    }
    
    // Generate cache key
    const cacheKey = `colgroups:${selectedVariables.join(',')}`;
    
    // Check cache first
    const cached = analyticsComputationCache.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Import formatter functions dynamically to avoid circular dependencies
    const { formatVariableDisplayName, getVariableColor } = require('../utils/variableFormatters');
    
    const result = selectedVariables.map((varName, index) => ({
      normalizedName: varName,
      displayName: formatVariableDisplayName(varName),
      color: getVariableColor(varName, index),
      category: varName.includes('per') ? 'ratio' : 
                varName.includes('salary') || varName.includes('tcc') ? 'compensation' :
                varName.includes('rvu') || varName.includes('units') ? 'productivity' : 'other'
    }));

    // Cache the result
    analyticsComputationCache.set(cacheKey, result);
    
    return result;
  }, [selectedVariables, isDynamicData]);
};

/**
 * Cache invalidation hooks
 */
export const useCacheInvalidation = () => {
  const clearAllCache = useCallback(() => {
    analyticsComputationCache.clear();
  }, []);

  const clearAggregationCache = useCallback(() => {
    cacheUtils.clearAggregation();
  }, []);

  const clearGroupingCache = useCallback(() => {
    cacheUtils.clearGrouping();
  }, []);

  const clearSummaryCache = useCallback(() => {
    cacheUtils.clearSummary();
  }, []);

  const clearFilterCache = useCallback(() => {
    cacheUtils.clearFiltering();
  }, []);

  const getCacheStats = useCallback(() => {
    return analyticsComputationCache.getStats();
  }, []);

  return {
    clearAllCache,
    clearAggregationCache,
    clearGroupingCache,
    clearSummaryCache,
    clearFilterCache,
    getCacheStats
  };
};
