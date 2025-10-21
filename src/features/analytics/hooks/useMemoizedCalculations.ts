/**
 * Analytics Memoization Hooks
 * 
 * Custom hooks for caching expensive analytics computations.
 * Implements React.useMemo with computation cache integration.
 */

import { useMemo, useCallback } from 'react';
import { analyticsComputationCache, cacheUtils } from '../services/analyticsComputationCache';
import { groupBySpecialty, calculateSummaryRows, calculateDynamicSummaryRows, filterAnalyticsData } from '../utils/analyticsCalculations';
import { AggregatedData, AnalyticsFilters } from '../types/analytics';

/**
 * Memoized grouping hook
 * Caches groupBySpecialty results using computation cache
 */
export const useMemoizedGrouping = (data: any[]) => {
  return useMemo(() => {
    if (!data || data.length === 0) return {};

    // Generate cache key
    const dataHash = JSON.stringify(data.map(d => d.surveySpecialty || d.standardizedName));
    const cacheKey = cacheUtils.groupingKey(dataHash, 'specialty');

    // Check cache first
    const cached = analyticsComputationCache.get<Record<string, any[]>>(cacheKey);
    if (cached) {
      return cached;
    }

    // Compute and cache result
    const result = groupBySpecialty(data);
    analyticsComputationCache.set(cacheKey, result);
    
    return result;
  }, [data]);
};

/**
 * Memoized summary statistics hook
 * Caches all summary calculations for AnalyticsSummary component
 */
export const useMemoizedSummary = (data: AggregatedData[]) => {
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
      tcc_n_orgs: d.tcc_n_orgs,
      tcc_n_incumbents: d.tcc_n_incumbents,
      tcc_p50: d.tcc_p50,
      wrvu_n_orgs: d.wrvu_n_orgs,
      wrvu_n_incumbents: d.wrvu_n_incumbents,
      wrvu_p50: d.wrvu_p50,
      cf_n_orgs: d.cf_n_orgs,
      cf_n_incumbents: d.cf_n_incumbents,
      cf_p50: d.cf_p50,
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
    const totalTccOrganizations = data.reduce((sum, row) => sum + row.tcc_n_orgs, 0);
    const totalTccIncumbents = data.reduce((sum, row) => sum + row.tcc_n_incumbents, 0);
    const totalWrvuOrganizations = data.reduce((sum, row) => sum + row.wrvu_n_orgs, 0);
    const totalWrvuIncumbents = data.reduce((sum, row) => sum + row.wrvu_n_incumbents, 0);
    const totalCfOrganizations = data.reduce((sum, row) => sum + row.cf_n_orgs, 0);
    const totalCfIncumbents = data.reduce((sum, row) => sum + row.cf_n_incumbents, 0);
    
    const tccP50Values = data.map(row => row.tcc_p50).filter(val => val > 0);
    const wrvuP50Values = data.map(row => row.wrvu_p50).filter(val => val > 0);
    const cfP50Values = data.map(row => row.cf_p50).filter(val => val > 0);

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
export const useMemoizedSummaryRows = (rows: AggregatedData[], variables?: string[]) => {
  return useMemo(() => {
    if (!rows || rows.length === 0) {
      return { simple: {}, weighted: {} };
    }

    // Generate cache key
    const dataHash = JSON.stringify(rows.map(r => ({
      tcc_n_orgs: r.tcc_n_orgs,
      tcc_n_incumbents: r.tcc_n_incumbents,
      tcc_p25: r.tcc_p25,
      tcc_p50: r.tcc_p50,
      tcc_p75: r.tcc_p75,
      tcc_p90: r.tcc_p90,
      wrvu_n_orgs: r.wrvu_n_orgs,
      wrvu_n_incumbents: r.wrvu_n_incumbents,
      wrvu_p25: r.wrvu_p25,
      wrvu_p50: r.wrvu_p50,
      wrvu_p75: r.wrvu_p75,
      wrvu_p90: r.wrvu_p90,
      cf_n_orgs: r.cf_n_orgs,
      cf_n_incumbents: r.cf_n_incumbents,
      cf_p25: r.cf_p25,
      cf_p50: r.cf_p50,
      cf_p75: r.cf_p75,
      cf_p90: r.cf_p90
    })));
    
    const cacheKey = variables && variables.length > 0 
      ? cacheUtils.summaryKey(dataHash, variables)
      : cacheUtils.summaryKey(dataHash, ['legacy']);

    // Check cache first
    const cached = analyticsComputationCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Compute summary rows
    let result;
    if (variables && variables.length > 0) {
      // Dynamic variables calculation
      result = calculateDynamicSummaryRows(rows as any[], variables);
    } else {
      // Legacy calculation
      result = calculateSummaryRows(rows);
    }

    // Cache the result
    analyticsComputationCache.set(cacheKey, result);
    
    return result;
  }, [rows, variables]);
};

/**
 * Memoized filtering hook
 * Caches filter results to avoid re-filtering on every render
 */
export const useMemoizedFiltering = (data: AggregatedData[], filters: AnalyticsFilters) => {
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
    const cached = analyticsComputationCache.get<AggregatedData[]>(cacheKey);
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
    if (!isDynamicData || selectedVariables.length === 0) {
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
