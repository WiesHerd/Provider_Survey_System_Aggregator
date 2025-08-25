/**
 * Analytics calculation utilities for survey data processing
 * Extracted from SurveyAnalytics.tsx to improve maintainability
 */

import { AggregatedData } from '../types/analytics';

/**
 * Calculates the percentile value from an array of numbers
 * @param numbers - Array of numbers to calculate percentile from
 * @param percentile - Percentile to calculate (0-100)
 * @returns The percentile value
 */
export const calculatePercentile = (numbers: number[], percentile: number): number => {
  if (numbers.length === 0) return 0;
  const sortedNumbers = numbers.sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * sortedNumbers.length);
  return sortedNumbers[index] || 0;
};

/**
 * Calculates weighted average of values
 * @param values - Array of values
 * @param weights - Array of weights (must match values length)
 * @returns Weighted average
 */
export const calculateWeightedAverage = (values: number[], weights: number[]): number => {
  if (values.length === 0 || values.length !== weights.length) return 0;
  const sum = weights.reduce((acc, weight, index) => acc + weight * values[index], 0);
  const weightSum = weights.reduce((acc, weight) => acc + weight, 0);
  return weightSum === 0 ? 0 : sum / weightSum;
};

/**
 * Calculates simple average of values
 * @param values - Array of values
 * @returns Average value
 */
export const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((acc, val) => acc + val, 0) / values.length;
};

/**
 * Formats a number as currency
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formats a number with 2 decimal places
 * @param value - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Enterprise-grade intelligent column mapping function
 * Creates mappings between source columns and target columns with confidence scores
 */
export const createIntelligentMappings = (row: any, surveySource: string): Array<{sourceColumn: string, targetColumn: string, confidence: number}> => {
  const mappings: Array<{sourceColumn: string, targetColumn: string, confidence: number}> = [];
  
  // Define standardized column patterns with confidence scores
  const columnPatterns = [
    // TCC patterns (Total Cash Compensation)
    { pattern: /tcc/i, target: 'tcc', confidence: 0.9 },
    { pattern: /total.*cash.*comp/i, target: 'tcc', confidence: 0.8 },
    { pattern: /compensation/i, target: 'tcc', confidence: 0.7 },
    
    // wRVU patterns
    { pattern: /wrvu/i, target: 'wrvu', confidence: 0.9 },
    { pattern: /work.*rvu/i, target: 'wrvu', confidence: 0.8 },
    { pattern: /relative.*value.*unit/i, target: 'wrvu', confidence: 0.7 },
    
    // Conversion Factor patterns
    { pattern: /cf/i, target: 'cf', confidence: 0.9 },
    { pattern: /conversion.*factor/i, target: 'cf', confidence: 0.8 },
    { pattern: /dollar.*per.*wrvu/i, target: 'cf', confidence: 0.7 },
    
    // Geographic patterns
    { pattern: /region/i, target: 'geographicRegion', confidence: 0.8 },
    { pattern: /geographic/i, target: 'geographicRegion', confidence: 0.7 },
    { pattern: /location/i, target: 'geographicRegion', confidence: 0.6 },
    
    // Specialty patterns
    { pattern: /specialty/i, target: 'specialty', confidence: 0.8 },
    { pattern: /department/i, target: 'specialty', confidence: 0.6 },
    
    // Provider Type patterns
    { pattern: /provider.*type/i, target: 'providerType', confidence: 0.8 },
    { pattern: /type/i, target: 'providerType', confidence: 0.6 },
  ];
  
  // Process each column in the row
  Object.keys(row).forEach(sourceColumn => {
    let bestMatch = { target: '', confidence: 0 };
    
    // Find the best matching pattern
    columnPatterns.forEach(pattern => {
      if (pattern.pattern.test(sourceColumn) && pattern.confidence > bestMatch.confidence) {
        bestMatch = { target: pattern.target, confidence: pattern.confidence };
      }
    });
    
    // Add mapping if confidence is above threshold
    if (bestMatch.confidence > 0.5) {
      mappings.push({
        sourceColumn,
        targetColumn: bestMatch.target,
        confidence: bestMatch.confidence
      });
    }
  });
  
  return mappings;
};

/**
 * Calculates summary statistics for analytics data
 * @param data - Array of aggregated data
 * @returns Analytics summary statistics
 */
export const calculateAnalyticsSummary = (data: AggregatedData[]) => {
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
 * @param data - Array of aggregated data
 * @param filters - Filters to apply
 * @returns Filtered data array
 */
export const applyAnalyticsFilters = (
  data: AggregatedData[], 
  filters: any
): AggregatedData[] => {
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
};

/**
 * Sorts analytics data by specified column and direction
 * @param data - Array of aggregated data
 * @param column - Column to sort by
 * @param direction - Sort direction
 * @returns Sorted data array
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
 * @param data - Array of aggregated data
 * @param metric - Compensation metric to calculate
 * @returns Weighted average value
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
 * @param data - Array of aggregated data
 * @param metric - Compensation metric to calculate
 * @returns Object with p25, p50, p75, p90 values
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
 * @param data - Array of aggregated data
 * @param groupBy - Field to group by
 * @returns Object with grouped data
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
 * @param groupedData - Object with grouped data
 * @param metric - Metric to calculate statistics for
 * @returns Object with statistics for each group
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
 * @param data - Array of aggregated data
 * @returns Object with validation results
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
