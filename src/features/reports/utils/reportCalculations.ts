/**
 * Reports Feature - Calculation Utilities
 * 
 * This file contains all calculation and data transformation utilities for reports.
 * Following enterprise patterns for separation of concerns and reusability.
 */

import { ChartDataItem, ReportConfigForm } from '../types/reports';

/**
 * Chart color palette for consistent styling
 */
export const CHART_COLORS = ['#6A5ACD', '#8B7DD6', '#A89DE0', '#C5BDE9', '#E2D1F2'];

/**
 * Generates chart data from survey data based on configuration
 * 
 * @param surveyData - Raw survey data
 * @param config - Report configuration
 * @returns Processed chart data
 */
export const generateChartData = (surveyData: any[], config: ReportConfigForm): ChartDataItem[] => {
  if (!surveyData || surveyData.length === 0) {
    return [];
  }

  // Filter data based on report filters
  const filteredData = filterDataByReportFilters(surveyData, config.filters);

  // Group data by dimension
  const groupedData = groupDataByDimension(filteredData, config.dimension);

  // Calculate metrics for each group
  const chartData = calculateMetricsForGroups(groupedData, config.metric);

  return chartData;
};

/**
 * Filters survey data based on report filters
 * 
 * @param data - Survey data to filter
 * @param filters - Filter criteria
 * @returns Filtered data
 */
export const filterDataByReportFilters = (data: any[], filters: any): any[] => {
  return data.filter(item => {
    // Filter by specialties
    if (filters.specialties && filters.specialties.length > 0) {
      const itemSpecialty = getItemValue(item, 'specialty');
      if (!filters.specialties.includes(itemSpecialty)) {
        return false;
      }
    }

    // Filter by regions
    if (filters.regions && filters.regions.length > 0) {
      const itemRegion = getItemValue(item, 'region');
      if (!filters.regions.includes(itemRegion)) {
        return false;
      }
    }

    // Filter by survey sources
    if (filters.surveySources && filters.surveySources.length > 0) {
      const itemSource = getItemValue(item, 'surveySource');
      if (!filters.surveySources.includes(itemSource)) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Groups data by specified dimension
 * 
 * @param data - Data to group
 * @param dimension - Dimension to group by
 * @returns Grouped data object
 */
export const groupDataByDimension = (data: any[], dimension: string): Record<string, any[]> => {
  return data.reduce((groups, item) => {
    const key = getItemValue(item, dimension);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, any[]>);
};

/**
 * Calculates metrics for grouped data
 * 
 * @param groupedData - Data grouped by dimension
 * @param metric - Metric to calculate
 * @returns Chart data items
 */
export const calculateMetricsForGroups = (groupedData: Record<string, any[]>, metric: string): ChartDataItem[] => {
  return Object.entries(groupedData).map(([name, items]) => {
    const values = items.map(item => getItemValue(item, metric)).filter(val => val !== null && val !== undefined);
    
    let value = 0;
    if (values.length > 0) {
      // Calculate average for numeric metrics
      if (metric.includes('p25') || metric.includes('p50') || metric.includes('p75') || metric.includes('p90')) {
        value = values.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) / values.length;
      } else {
        // For count metrics, sum the values
        value = values.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
      }
    }

    return {
      name: name || 'Unknown',
      value: Math.round(value * 100) / 100, // Round to 2 decimal places
      count: items.length,
      originalName: name
    };
  }).sort((a, b) => b.value - a.value); // Sort by value descending
};

/**
 * Gets a value from an item using various possible field names
 * 
 * @param item - Data item
 * @param field - Field name to extract
 * @returns Field value or null
 */
export const getItemValue = (item: any, field: string): any => {
  // Try different possible field names
  const possibleFields = [
    field,
    field.toLowerCase(),
    field.toUpperCase(),
    field.replace(/_/g, ' '),
    field.replace(/_/g, ''),
    `data.${field}`,
    `data.${field.toLowerCase()}`,
    `data.${field.toUpperCase()}`
  ];

  for (const possibleField of possibleFields) {
    if (item[possibleField] !== undefined && item[possibleField] !== null) {
      return item[possibleField];
    }
  }

  // Try nested data object
  if (item.data && typeof item.data === 'object') {
    for (const possibleField of possibleFields) {
      if (item.data[possibleField] !== undefined && item.data[possibleField] !== null) {
        return item.data[possibleField];
      }
    }
  }

  return null;
};

/**
 * Formats chart data for export
 * 
 * @param data - Chart data
 * @param config - Report configuration
 * @returns Formatted data for export
 */
export const formatDataForExport = (data: ChartDataItem[], config: ReportConfigForm): any[] => {
  return data.map(item => ({
    [config.dimension]: item.name,
    [config.metric]: item.value,
    'Count': item.count,
    'Original Name': item.originalName
  }));
};

/**
 * Validates report configuration
 * 
 * @param config - Report configuration to validate
 * @returns Validation result with errors
 */
export const validateReportConfig = (config: ReportConfigForm): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.name || config.name.trim() === '') {
    errors.push('Report name is required');
  }

  if (!config.dimension) {
    errors.push('Dimension is required');
  }

  if (!config.metric) {
    errors.push('Metric is required');
  }

  if (!config.chartType) {
    errors.push('Chart type is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
