/**
 * Report Templates System
 * 
 * Pre-defined report templates for quick report creation
 * Following enterprise patterns for template-based reporting
 */

import React from 'react';
import {
  CurrencyDollarIcon,
  MapIcon,
  ChartBarIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  AdjustmentsHorizontalIcon,
  CalendarIcon,
  TrophyIcon,
  DocumentTextIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';

export type ReportCategory = 'compensation' | 'comparison' | 'trends' | 'custom';
export type ChartType = 'bar' | 'line' | 'pie' | 'table';
export type GroupingDimension = 'specialty' | 'region' | 'surveySource' | 'providerType' | 'year';

export interface ReportConfigSchema {
  requiresFilters: boolean;
  requiresMetrics: boolean;
  requiresGrouping: boolean;
  allowsMultipleMetrics: boolean;
  defaultChartType: ChartType;
  availableChartTypes: ChartType[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  icon: React.ComponentType<any>;
  iconColor: string;
  defaultMetrics: string[];
  defaultGrouping: GroupingDimension;
  defaultChartType: ChartType;
  configSchema: ReportConfigSchema;
  previewDescription: string;
}

/**
 * Available report templates
 */
export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'total-cash-compensation',
    name: 'Total Cash Compensation',
    description: 'Total cash compensation report with specialty blending support',
    category: 'compensation',
    icon: CurrencyDollarIcon,
    iconColor: 'bg-emerald-500',
    defaultMetrics: ['tcc_p50'],
    defaultGrouping: 'specialty',
    defaultChartType: 'table',
    configSchema: {
      requiresFilters: true,
      requiresMetrics: false,
      requiresGrouping: false,
      allowsMultipleMetrics: false,
      defaultChartType: 'table',
      availableChartTypes: ['table']
    },
    previewDescription: 'Generate a comprehensive total cash compensation report with filtering and blending options'
  },
  {
    id: 'work-rvus',
    name: 'Work RVUs',
    description: 'Work RVUs report with specialty blending support',
    category: 'compensation',
    icon: DocumentTextIcon,
    iconColor: 'bg-blue-500',
    defaultMetrics: ['wrvu_p50'],
    defaultGrouping: 'specialty',
    defaultChartType: 'table',
    configSchema: {
      requiresFilters: true,
      requiresMetrics: false,
      requiresGrouping: false,
      allowsMultipleMetrics: false,
      defaultChartType: 'table',
      availableChartTypes: ['table']
    },
    previewDescription: 'Generate a comprehensive work RVUs report with filtering and blending options'
  },
  {
    id: 'conversion-factors',
    name: 'Conversion Factors',
    description: 'Conversion factors report with specialty blending support',
    category: 'compensation',
    icon: CalculatorIcon,
    iconColor: 'bg-purple-500',
    defaultMetrics: ['cf_p50'],
    defaultGrouping: 'specialty',
    defaultChartType: 'table',
    configSchema: {
      requiresFilters: true,
      requiresMetrics: false,
      requiresGrouping: false,
      allowsMultipleMetrics: false,
      defaultChartType: 'table',
      availableChartTypes: ['table']
    },
    previewDescription: 'Generate a comprehensive conversion factors report with filtering and blending options'
  },
  {
    id: 'specialty-compensation-summary',
    name: 'Specialty Compensation Summary',
    description: 'Compare TCC, wRVU, and CF metrics across specialties',
    category: 'compensation',
    icon: CurrencyDollarIcon,
    iconColor: 'bg-emerald-500',
    defaultMetrics: ['tcc_p50', 'wrvu_p50', 'cf_p50'],
    defaultGrouping: 'specialty',
    defaultChartType: 'bar',
    configSchema: {
      requiresFilters: true,
      requiresMetrics: true,
      requiresGrouping: false,
      allowsMultipleMetrics: true,
      defaultChartType: 'bar',
      availableChartTypes: ['bar', 'line', 'table']
    },
    previewDescription: 'Shows compensation metrics grouped by specialty'
  },
  {
    id: 'regional-comparison',
    name: 'Regional Comparison',
    description: 'Compare compensation across geographic regions',
    category: 'comparison',
    icon: MapIcon,
    iconColor: 'bg-blue-500',
    defaultMetrics: ['tcc_p50'],
    defaultGrouping: 'region',
    defaultChartType: 'bar',
    configSchema: {
      requiresFilters: true,
      requiresMetrics: true,
      requiresGrouping: false,
      allowsMultipleMetrics: true,
      defaultChartType: 'bar',
      availableChartTypes: ['bar', 'line', 'table']
    },
    previewDescription: 'Compares compensation metrics across different regions'
  },
  {
    id: 'survey-source-comparison',
    name: 'Survey Source Comparison',
    description: 'Compare data from MGMA, SullivanCotter, and Gallagher',
    category: 'comparison',
    icon: ChartBarIcon,
    iconColor: 'bg-amber-500',
    defaultMetrics: ['tcc_p50'],
    defaultGrouping: 'surveySource',
    defaultChartType: 'bar',
    configSchema: {
      requiresFilters: true,
      requiresMetrics: true,
      requiresGrouping: false,
      allowsMultipleMetrics: true,
      defaultChartType: 'bar',
      availableChartTypes: ['bar', 'line', 'table']
    },
    previewDescription: 'Compares metrics across different survey sources'
  },
  {
    id: 'provider-type-analysis',
    name: 'Provider Type Analysis',
    description: 'Compare compensation between Physicians and APPs',
    category: 'comparison',
    icon: UserIcon,
    iconColor: 'bg-purple-500',
    defaultMetrics: ['tcc_p50'],
    defaultGrouping: 'providerType',
    defaultChartType: 'bar',
    configSchema: {
      requiresFilters: true,
      requiresMetrics: true,
      requiresGrouping: false,
      allowsMultipleMetrics: true,
      defaultChartType: 'bar',
      availableChartTypes: ['bar', 'line', 'table']
    },
    previewDescription: 'Compares compensation between provider types'
  },
  {
    id: 'percentile-distribution',
    name: 'Percentile Distribution',
    description: 'View P25, P50, P75, P90 trends for selected metrics',
    category: 'trends',
    icon: ArrowTrendingUpIcon,
    iconColor: 'bg-red-500',
    defaultMetrics: ['tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90'],
    defaultGrouping: 'specialty',
    defaultChartType: 'line',
    configSchema: {
      requiresFilters: true,
      requiresMetrics: true,
      requiresGrouping: true,
      allowsMultipleMetrics: true,
      defaultChartType: 'line',
      availableChartTypes: ['line', 'bar', 'table']
    },
    previewDescription: 'Shows percentile distribution trends'
  },
  {
    id: 'custom-multi-metric',
    name: 'Custom Multi-Metric Report',
    description: 'Create a report with your selected metrics and grouping',
    category: 'custom',
    icon: AdjustmentsHorizontalIcon,
    iconColor: 'bg-violet-500',
    defaultMetrics: ['tcc_p50'],
    defaultGrouping: 'specialty',
    defaultChartType: 'table',
    configSchema: {
      requiresFilters: false,
      requiresMetrics: true,
      requiresGrouping: true,
      allowsMultipleMetrics: true,
      defaultChartType: 'table',
      availableChartTypes: ['bar', 'line', 'pie', 'table']
    },
    previewDescription: 'Fully customizable report with your selected options'
  },
  {
    id: 'year-over-year-trends',
    name: 'Year-over-Year Trends',
    description: 'Compare compensation trends across multiple years',
    category: 'trends',
    icon: CalendarIcon,
    iconColor: 'bg-teal-500',
    defaultMetrics: ['tcc_p50'],
    defaultGrouping: 'year',
    defaultChartType: 'line',
    configSchema: {
      requiresFilters: true,
      requiresMetrics: true,
      requiresGrouping: false,
      allowsMultipleMetrics: true,
      defaultChartType: 'line',
      availableChartTypes: ['line', 'bar', 'table']
    },
    previewDescription: 'Shows compensation trends over multiple years'
  },
  {
    id: 'top-bottom-performers',
    name: 'Top/Bottom Performers',
    description: 'Identify highest and lowest compensation by specialty',
    category: 'compensation',
    icon: TrophyIcon,
    iconColor: 'bg-yellow-500',
    defaultMetrics: ['tcc_p50'],
    defaultGrouping: 'specialty',
    defaultChartType: 'bar',
    configSchema: {
      requiresFilters: true,
      requiresMetrics: true,
      requiresGrouping: false,
      allowsMultipleMetrics: false,
      defaultChartType: 'bar',
      availableChartTypes: ['bar', 'table']
    },
    previewDescription: 'Highlights top and bottom performing specialties'
  }
];

/**
 * Get template by ID
 */
export const getTemplateById = (id: string): ReportTemplate | undefined => {
  return REPORT_TEMPLATES.find(t => t.id === id);
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category: ReportCategory): ReportTemplate[] => {
  return REPORT_TEMPLATES.filter(t => t.category === category);
};

/**
 * Get all available metrics
 */
export const getAvailableMetrics = (): string[] => {
  return [
    'tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90',
    'wrvu_p25', 'wrvu_p50', 'wrvu_p75', 'wrvu_p90',
    'cf_p25', 'cf_p50', 'cf_p75', 'cf_p90'
  ];
};

/**
 * Get metric display name
 */
export const getMetricDisplayName = (metric: string): string => {
  const metricMap: Record<string, string> = {
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
  return metricMap[metric] || metric;
};

