/**
 * Analytics-specific calculation utilities
 * These functions extend shared utilities with analytics-specific logic
 */

import { 
  calculatePercentile, 
  calculateAverage, 
  calculateWeightedAverage 
} from '@/shared/utils';
import { AggregatedData, AnalyticsSummary, AnalyticsFilters } from '../types/analytics';

/**
 * Calculates summary statistics for analytics data
 * 
 * @param data - Array of aggregated data
 * @returns Analytics summary statistics
 * 
 * @example
 * ```typescript
 * const summary = calculateAnalyticsSummary(analyticsData);
 * console.log(summary.totalRecords); // Total number of records
 * ```
 */
export const calculateAnalyticsSummary = (data: AggregatedData[]): AnalyticsSummary => {
  if (data.length === 0) {
    return {
      totalRecords: 0,
      totalOrganizations: 0,
      totalIncumbents: 0,
      averageTccP50: 0,
      averageWrvuP50: 0,
      averageCfP50: 0,
      specialtiesCount: 0,
      sourcesCount: 0,
      regionsCount: 0
    };
  }

  const totalOrganizations = data.reduce((sum, row) => sum + row.n_orgs, 0);
  const totalIncumbents = data.reduce((sum, row) => sum + row.n_incumbents, 0);
  
  const tccP50Values = data.map(row => row.tcc_p50).filter(val => val > 0);
  const wrvuP50Values = data.map(row => row.wrvu_p50).filter(val => val > 0);
  const cfP50Values = data.map(row => row.cf_p50).filter(val => val > 0);

  const uniqueSpecialties = new Set(data.map(row => row.surveySpecialty));
  const uniqueSources = new Set(data.map(row => row.surveySource));
  const uniqueRegions = new Set(data.map(row => row.geographicRegion));

  return {
    totalRecords: data.length,
    totalOrganizations,
    totalIncumbents,
    averageTccP50: calculateAverage(tccP50Values),
    averageWrvuP50: calculateAverage(wrvuP50Values),
    averageCfP50: calculateAverage(cfP50Values),
    specialtiesCount: uniqueSpecialties.size,
    sourcesCount: uniqueSources.size,
    regionsCount: uniqueRegions.size
  };
};

/**
 * Applies filters to analytics data
 * 
 * @param data - Array of aggregated data
 * @param filters - Filters to apply
 * @returns Filtered data array
 * 
 * @example
 * ```typescript
 * const filteredData = applyAnalyticsFilters(data, { specialty: 'Cardiology' });
 * ```
 */
export const applyAnalyticsFilters = (
  data: AggregatedData[], 
  filters: AnalyticsFilters
): AggregatedData[] => {
  return data.filter(row => {
    // Specialty filter
    if (filters.specialty && row.surveySpecialty !== filters.specialty) {
      return false;
    }

    // Provider type filter
    if (filters.providerType && row.providerType !== filters.providerType) {
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

    // Year filter
    if (filters.year && row.surveyYear !== filters.year) {
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
};

/**
 * Sorts analytics data by specified column and direction
 * 
 * @param data - Array of aggregated data
 * @param column - Column to sort by
 * @param direction - Sort direction
 * @returns Sorted data array
 * 
 * @example
 * ```typescript
 * const sortedData = sortAnalyticsData(data, 'tcc_p50', 'desc');
 * ```
 */
export const sortAnalyticsData = (
  data: AggregatedData[],
  column: keyof AggregatedData,
  direction: 'asc' | 'desc'
): AggregatedData[] => {
  return [...data].sort((a, b) => {
    const aValue = a[column];
    const bValue = b[column];

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return direction === 'asc' ? -1 : 1;
    if (bValue == null) return direction === 'asc' ? 1 : -1;

    // Handle string values
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return direction === 'asc' ? comparison : -comparison;
    }

    // Handle number values
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const comparison = aValue - bValue;
      return direction === 'asc' ? comparison : -comparison;
    }

    return 0;
  });
};

/**
 * Calculates weighted averages for compensation metrics
 * 
 * @param data - Array of aggregated data
 * @param metric - Compensation metric to calculate
 * @returns Weighted average value
 * 
 * @example
 * ```typescript
 * const avgTcc = calculateWeightedCompensation(data, 'tcc_p50');
 * ```
 */
export const calculateWeightedCompensation = (
  data: AggregatedData[],
  metric: keyof Pick<AggregatedData, 'tcc_p25' | 'tcc_p50' | 'tcc_p75' | 'tcc_p90' | 'wrvu_p25' | 'wrvu_p50' | 'wrvu_p75' | 'wrvu_p90' | 'cf_p25' | 'cf_p50' | 'cf_p75' | 'cf_p90'>
): number => {
  const validData = data.filter(row => row[metric] > 0 && row.n_incumbents > 0);
  
  if (validData.length === 0) return 0;

  const values = validData.map(row => row[metric]);
  const weights = validData.map(row => row.n_incumbents);

  return calculateWeightedAverage(values, weights);
};

/**
 * Calculates percentile ranges for compensation metrics
 * 
 * @param data - Array of aggregated data
 * @param metric - Compensation metric to calculate
 * @returns Object with p25, p50, p75, p90 values
 * 
 * @example
 * ```typescript
 * const ranges = calculateCompensationRanges(data, 'tcc_p50');
 * console.log(ranges.p50); // Median value
 * ```
 */
export const calculateCompensationRanges = (
  data: AggregatedData[],
  metric: keyof Pick<AggregatedData, 'tcc_p25' | 'tcc_p50' | 'tcc_p75' | 'tcc_p90' | 'wrvu_p25' | 'wrvu_p50' | 'wrvu_p75' | 'wrvu_p90' | 'cf_p25' | 'cf_p50' | 'cf_p75' | 'cf_p90'>
) => {
  const validValues = data
    .map(row => row[metric])
    .filter(val => val > 0);

  return {
    p25: calculatePercentile(validValues, 25),
    p50: calculatePercentile(validValues, 50),
    p75: calculatePercentile(validValues, 75),
    p90: calculatePercentile(validValues, 90)
  };
};

/**
 * Groups analytics data by a specified field
 * 
 * @param data - Array of aggregated data
 * @param groupBy - Field to group by
 * @returns Object with grouped data
 * 
 * @example
 * ```typescript
 * const groupedBySpecialty = groupAnalyticsData(data, 'surveySpecialty');
 * ```
 */
export const groupAnalyticsData = <K extends keyof AggregatedData>(
  data: AggregatedData[],
  groupBy: K
): Record<string, AggregatedData[]> => {
  return data.reduce((groups, row) => {
    const key = String(row[groupBy]);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(row);
    return groups;
  }, {} as Record<string, AggregatedData[]>);
};

/**
 * Calculates statistics for grouped data
 * 
 * @param groupedData - Object with grouped data
 * @param metric - Metric to calculate statistics for
 * @returns Object with statistics for each group
 * 
 * @example
 * ```typescript
 * const stats = calculateGroupedStatistics(groupedData, 'tcc_p50');
 * ```
 */
export const calculateGroupedStatistics = (
  groupedData: Record<string, AggregatedData[]>,
  metric: keyof Pick<AggregatedData, 'tcc_p25' | 'tcc_p50' | 'tcc_p75' | 'tcc_p90' | 'wrvu_p25' | 'wrvu_p50' | 'wrvu_p75' | 'wrvu_p90' | 'cf_p25' | 'cf_p50' | 'cf_p75' | 'cf_p90'>
) => {
  const stats: Record<string, { count: number; average: number; min: number; max: number }> = {};

  Object.entries(groupedData).forEach(([group, data]) => {
    const values = data.map(row => row[metric]).filter(val => val > 0);
    
    if (values.length > 0) {
      stats[group] = {
        count: values.length,
        average: calculateAverage(values),
        min: Math.min(...values),
        max: Math.max(...values)
      };
    }
  });

  return stats;
};

/**
 * Validates analytics data for completeness and consistency
 * 
 * @param data - Array of aggregated data
 * @returns Object with validation results
 * 
 * @example
 * ```typescript
 * const validation = validateAnalyticsData(data);
 * if (validation.isValid) {
 *   // Process data
 * }
 * ```
 */
export const validateAnalyticsData = (data: AggregatedData[]) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.length === 0) {
    errors.push('No data provided for analysis');
    return { isValid: false, errors, warnings };
  }

  // Check for required fields
  data.forEach((row, index) => {
    if (!row.standardizedName) {
      errors.push(`Row ${index + 1}: Missing standardized name`);
    }
    if (!row.surveySpecialty) {
      errors.push(`Row ${index + 1}: Missing survey specialty`);
    }
    if (row.n_incumbents <= 0) {
      warnings.push(`Row ${index + 1}: Zero or negative incumbents`);
    }
    if (row.tcc_p50 <= 0) {
      warnings.push(`Row ${index + 1}: Zero or negative TCC P50`);
    }
  });

  // Check for data consistency
  const uniqueSpecialties = new Set(data.map(row => row.surveySpecialty));
  if (uniqueSpecialties.size < 2) {
    warnings.push('Limited specialty diversity in dataset');
  }

  const uniqueSources = new Set(data.map(row => row.surveySource));
  if (uniqueSources.size < 2) {
    warnings.push('Limited survey source diversity in dataset');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
