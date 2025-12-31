/**
 * Formatting utilities for Chart Builder
 * 
 * Handles display formatting for metrics, colors, and data presentation
 */

import { getVariableColor, getVariableLightBackgroundColor } from '../../../analytics/utils/variableFormatters';
import { ISurveyRow } from '../../../../types/survey';

/**
 * Helper functions for safe field access with multiple possible field names
 */
export const getSpecialtyField = (row: ISurveyRow | any): string => {
  return String(row.specialty || row.normalizedSpecialty || row.Specialty || '');
};

export const getRegionField = (row: ISurveyRow | any): string => {
  return String(
    row.geographicRegion || 
    row.geographic_region || 
    row.Region || 
    row.region || 
    row.Geographic_Region || 
    row['Geographic Region'] || 
    ''
  );
};

export const getProviderTypeField = (row: ISurveyRow | any): string => {
  return String(
    row.providerType || 
    row.provider_type || 
    row.ProviderType || 
    row.Provider_Type || 
    row['Provider Type'] || 
    row.Type || 
    ''
  );
};

export const getSurveySourceField = (row: ISurveyRow | any): string => {
  return String(row.surveySource || row.type || row.surveyProvider || '');
};

export const getYearField = (row: ISurveyRow | any): string => {
  return String(row.surveyYear || row.year || '');
};

/**
 * Gets the Display Variables pill color for a metric (matches AnalyticsFilters exactly)
 * Uses the same getVariableColor function as Display Variables pills
 * Returns DARK background colors with WHITE text (for pills/chips)
 */
export const getMetricDisplayVariableColor = (metric: string): string => {
  if (metric.includes('tcc')) {
    return getVariableColor('tcc', 0); // TCC uses index 0 -> '#1565C0' (Dark Blue)
  } else if (metric.includes('wrvu')) {
    return getVariableColor('wrvu', 1); // wRVU uses index 1 -> '#2E7D32' (Dark Green)
  } else if (metric.includes('cf')) {
    return getVariableColor('cf', 2); // CF uses index 2 -> '#FFD54F' (Light Amber)
  }
  // Fallback to TCC color
  return getVariableColor('tcc', 0);
};

/**
 * Gets the table header background color for a metric (matches AnalyticsTableHeader exactly)
 * Uses the same getVariableLightBackgroundColor function as Analytics table headers
 * Returns LIGHT background colors with BLACK text (not dark colors with white text)
 */
export const getMetricTableHeaderColor = (metric: string): string => {
  if (metric.includes('tcc')) {
    return getVariableLightBackgroundColor('tcc', 0); // TCC uses index 0 -> '#E3F2FD' (Light Blue)
  } else if (metric.includes('wrvu')) {
    return getVariableLightBackgroundColor('wrvu', 1); // wRVU uses index 1 -> '#E8F5E8' (Light Green)
  } else if (metric.includes('cf')) {
    return getVariableLightBackgroundColor('cf', 2); // CF uses index 2 -> '#FFF3E0' (Light Orange)
  }
  // Fallback to TCC color
  return getVariableLightBackgroundColor('tcc', 0);
};

/**
 * Gets the background color for a metric that matches the chart color
 * Chart colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']
 * These are converted to enhanced, vibrant background colors for table cells
 */
export const getMetricBackgroundColor = (metric: string, allMetrics: string[]): string => {
  // Handle CF metrics separately (they use orange background)
  if (metric.includes('cf')) {
    return '#FEF3C7'; // Warm light amber for CF metrics
  }
  
  // Sort metrics the same way as the chart (TCC first, then wRVU)
  const percentileOrder = { 'p25': 1, 'p50': 2, 'p75': 3, 'p90': 4 };
  
  const tccMetrics = allMetrics.filter(m => m.includes('tcc') && !m.includes('cf')).sort((a, b) => {
    const aPercentile = a.match(/p\d+/)?.[0] || '';
    const bPercentile = b.match(/p\d+/)?.[0] || '';
    return (percentileOrder[aPercentile as keyof typeof percentileOrder] || 0) - 
           (percentileOrder[bPercentile as keyof typeof percentileOrder] || 0);
  });
  
  const wrvuMetrics = allMetrics.filter(m => m.includes('wrvu') && !m.includes('cf')).sort((a, b) => {
    const aPercentile = a.match(/p\d+/)?.[0] || '';
    const bPercentile = b.match(/p\d+/)?.[0] || '';
    return (percentileOrder[aPercentile as keyof typeof percentileOrder] || 0) - 
           (percentileOrder[bPercentile as keyof typeof percentileOrder] || 0);
  });
  
  const sortedMetrics = [...tccMetrics, ...wrvuMetrics];
  const metricIndex = sortedMetrics.indexOf(metric);
  
  // Chart colors in order (same as EChartsBar component)
  const chartColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
  const chartColor = chartColors[metricIndex % chartColors.length] || '#6366f1';
  
  // Convert chart color to enhanced, more vibrant background colors
  const colorMap: Record<string, string> = {
    '#6366f1': '#DBEAFE', // Indigo -> Vibrant light blue (TCC 25th)
    '#8b5cf6': '#F3E8FF', // Purple -> Rich light purple (TCC 50th, TCC 75th)
    '#ec4899': '#FCE7F3', // Pink -> Soft pink with warmth
    '#f59e0b': '#FEF3C7', // Orange -> Warm light amber
    '#10b981': '#D1FAE5', // Green -> Fresh light mint (wRVU metrics)
  };
  
  return colorMap[chartColor] || '#F5F5F5';
};

/**
 * Gets a slightly darker version of a hex color for hover effects
 */
export const getDarkerColor = (hexColor: string, amount: number = 0.1): string => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Darken by reducing RGB values
  const darkerR = Math.max(0, Math.floor(r * (1 - amount)));
  const darkerG = Math.max(0, Math.floor(g * (1 - amount)));
  const darkerB = Math.max(0, Math.floor(b * (1 - amount)));
  
  return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
};

/**
 * Sorts metrics in the same order as the chart (TCC 25th, 50th, 75th, 90th, then wRVU, then CF)
 * This ensures table columns match the chart order
 */
export const sortMetricsForDisplay = (metrics: string[]): string[] => {
  const percentileOrder = { 'p25': 1, 'p50': 2, 'p75': 3, 'p90': 4 };
  
  // Separate metrics by type
  const tccMetrics = metrics.filter(m => m.includes('tcc') && !m.includes('cf')).sort((a, b) => {
    const aPercentile = a.match(/p\d+/)?.[0] || '';
    const bPercentile = b.match(/p\d+/)?.[0] || '';
    return (percentileOrder[aPercentile as keyof typeof percentileOrder] || 0) - 
           (percentileOrder[bPercentile as keyof typeof percentileOrder] || 0);
  });
  
  const wrvuMetrics = metrics.filter(m => m.includes('wrvu') && !m.includes('cf')).sort((a, b) => {
    const aPercentile = a.match(/p\d+/)?.[0] || '';
    const bPercentile = b.match(/p\d+/)?.[0] || '';
    return (percentileOrder[aPercentile as keyof typeof percentileOrder] || 0) - 
           (percentileOrder[bPercentile as keyof typeof percentileOrder] || 0);
  });
  
  const cfMetrics = metrics.filter(m => m.includes('cf')).sort((a, b) => {
    const aPercentile = a.match(/p\d+/)?.[0] || '';
    const bPercentile = b.match(/p\d+/)?.[0] || '';
    return (percentileOrder[aPercentile as keyof typeof percentileOrder] || 0) - 
           (percentileOrder[bPercentile as keyof typeof percentileOrder] || 0);
  });
  
  // Return in chart order: TCC first, then wRVU, then CF
  return [...tccMetrics, ...wrvuMetrics, ...cfMetrics];
};

/**
 * Formats a metric value for display
 */
export const formatMetricValue = (value: number, metric: string): string => {
  if (metric.includes('wrvu')) {
    return value.toLocaleString();
  } else {
    return `$${value.toLocaleString()}`;
  }
};

/**
 * Gets display label for a metric
 */
export const getMetricDisplayLabel = (metric: string): string => {
  const labels: Record<string, string> = {
    'tcc_p25': 'TCC 25th Percentile',
    'tcc_p50': 'TCC 50th Percentile',
    'tcc_p75': 'TCC 75th Percentile',
    'tcc_p90': 'TCC 90th Percentile',
    'wrvu_p25': 'wRVU 25th Percentile',
    'wrvu_p50': 'wRVU 50th Percentile',
    'wrvu_p75': 'wRVU 75th Percentile',
    'wrvu_p90': 'wRVU 90th Percentile',
    'cf_p25': 'CF 25th Percentile',
    'cf_p50': 'CF 50th Percentile',
    'cf_p75': 'CF 75th Percentile',
    'cf_p90': 'CF 90th Percentile'
  };
  return labels[metric] || metric.replace('_', ' ').toUpperCase();
};

/**
 * Gets short display label for a metric (for chips/tags)
 */
export const getMetricShortLabel = (metric: string): string => {
  const labels: Record<string, string> = {
    'tcc_p25': 'TCC P25',
    'tcc_p50': 'TCC P50',
    'tcc_p75': 'TCC P75',
    'tcc_p90': 'TCC P90',
    'wrvu_p25': 'wRVU P25',
    'wrvu_p50': 'wRVU P50',
    'wrvu_p75': 'wRVU P75',
    'wrvu_p90': 'wRVU P90',
    'cf_p25': 'CF P25',
    'cf_p50': 'CF P50',
    'cf_p75': 'CF P75',
    'cf_p90': 'CF P90'
  };
  return labels[metric] || metric;
};

