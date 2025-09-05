/**
 * Analytics calculation utilities
 * Extracted from SurveyAnalytics.tsx for better organization
 */

import { AggregatedData } from '../types/analytics';

/**
 * Calculate percentile value from an array of numbers
 * 
 * @param numbers - Array of numbers to calculate percentile from
 * @param percentile - Percentile to calculate (0-100)
 * @returns The percentile value
 * 
 * @example
 * ```typescript
 * const p50 = calculatePercentile([1, 2, 3, 4, 5], 50); // Returns 3
 * ```
 */
export const calculatePercentile = (numbers: number[], percentile: number): number => {
  if (numbers.length === 0) return 0;
  const sortedNumbers = numbers.sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * sortedNumbers.length);
  return sortedNumbers[index] || 0;
};

/**
 * Formats a number as currency
 * 
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
 * Formats a number with commas
 * 
 * @param value - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

/**
 * Calculate summary statistics for analytics data
 * 
 * @param data - Array of aggregated data
 * @returns Summary statistics object
 */
export const calculateAnalyticsSummary = (data: AggregatedData[]) => {
  if (data.length === 0) {
    return {
      totalRecords: 0,
      uniqueSpecialties: 0,
      uniqueRegions: 0,
      uniqueSurveySources: 0,
      totalOrganizations: 0,
      totalIncumbents: 0
    };
  }

  const uniqueSpecialties = new Set(data.map(row => row.surveySpecialty)).size;
  const uniqueRegions = new Set(data.map(row => row.geographicRegion)).size;
  const uniqueSurveySources = new Set(data.map(row => row.surveySource)).size;
  
  const totalOrganizations = data.reduce((sum, row) => sum + row.n_orgs, 0);
  const totalIncumbents = data.reduce((sum, row) => sum + row.n_incumbents, 0);

  return {
    totalRecords: data.length,
    uniqueSpecialties,
    uniqueRegions,
    uniqueSurveySources,
    totalOrganizations,
    totalIncumbents
  };
};

/**
 * Filter analytics data based on filters
 * 
 * @param data - Array of aggregated data
 * @param filters - Filter object
 * @returns Filtered data array
 */
export const filterAnalyticsData = (
  data: AggregatedData[], 
  filters: {
    specialty?: string;
    providerType?: string;
    region?: string;
    variable?: string;
    surveySource?: string;
  }
): AggregatedData[] => {
  return data.filter(row => {
    if (filters.specialty && !row.surveySpecialty.toLowerCase().includes(filters.specialty.toLowerCase())) {
      return false;
    }
    if (filters.region && !row.geographicRegion.toLowerCase().includes(filters.region.toLowerCase())) {
      return false;
    }
    if (filters.surveySource && !row.surveySource.toLowerCase().includes(filters.surveySource.toLowerCase())) {
      return false;
    }
    return true;
  });
};

/**
 * Sort analytics data by specified field
 * 
 * @param data - Array of aggregated data
 * @param field - Field to sort by
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted data array
 */
export const sortAnalyticsData = (
  data: AggregatedData[], 
  field: keyof AggregatedData, 
  direction: 'asc' | 'desc' = 'asc'
): AggregatedData[] => {
  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    return 0;
  });
};