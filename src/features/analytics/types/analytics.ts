/**
 * Analytics Feature - Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the analytics feature.
 * Following enterprise patterns for type safety and maintainability.
 */

import { DynamicAggregatedData } from './variables';

// Union type to support both legacy and dynamic data formats
export type AnalyticsData = AggregatedData | DynamicAggregatedData;

/**
 * Variable mapping interface for analytics data
 */
export interface VariableMapping {
  id: string;
  standardizedName: string;
  variableType: 'compensation' | 'categorical';
  variableSubType: string;
  sourceVariables: Array<{
    surveySource: string;
    originalVariableName: string;
    frequency?: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregated analytics data structure
 * Each metric section (TCC, wRVU, CF) has independent organizational data
 */
export interface AggregatedData {
  standardizedName: string;
  surveySource: string;
  surveySpecialty: string;
  originalSpecialty: string; // Original specialty name from the survey source
  geographicRegion: string;
  providerType?: string;
  surveyYear?: string;
  dataCategory?: string; // NEW: Data category from survey (COMPENSATION, CALL_PAY, MOONLIGHTING, CUSTOM)
  
  // TCC (Total Cash Compensation) metrics with independent organizational data
  tcc_n_orgs: number;
  tcc_n_incumbents: number;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  
  // wRVU (Productivity - wRVUs) metrics with independent organizational data
  wrvu_n_orgs: number;
  wrvu_n_incumbents: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  
  // CF (Conversion Factors) metrics with independent organizational data
  cf_n_orgs: number;
  cf_n_incumbents: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
}


/**
 * Analytics filter state
 */
export interface AnalyticsFilters {
  specialty: string;
  surveySource: string;
  geographicRegion: string;
  providerType: string;
  dataCategory?: string; // NEW: Data category filter (COMPENSATION, CALL_PAY, MOONLIGHTING, CUSTOM)
  year: string;
}

/**
 * Summary calculation result
 */
export interface SummaryCalculation {
  simple: {
    tcc_n_orgs: number;
    tcc_n_incumbents: number;
    tcc_p25: number;
    tcc_p50: number;
    tcc_p75: number;
    tcc_p90: number;
    wrvu_n_orgs: number;
    wrvu_n_incumbents: number;
    wrvu_p25: number;
    wrvu_p50: number;
    wrvu_p75: number;
    wrvu_p90: number;
    cf_n_orgs: number;
    cf_n_incumbents: number;
    cf_p25: number;
    cf_p50: number;
    cf_p75: number;
    cf_p90: number;
  };
  weighted: {
    tcc_n_orgs: number;
    tcc_n_incumbents: number;
    tcc_p25: number;
    tcc_p50: number;
    tcc_p75: number;
    tcc_p90: number;
    wrvu_n_orgs: number;
    wrvu_n_incumbents: number;
    wrvu_p25: number;
    wrvu_p50: number;
    wrvu_p75: number;
    wrvu_p90: number;
    cf_n_orgs: number;
    cf_n_incumbents: number;
    cf_p25: number;
    cf_p50: number;
    cf_p75: number;
    cf_p90: number;
  };
}

/**
 * Analytics component props
 */
export interface AnalyticsTableProps {
  data: AnalyticsData[]; // Support both old and new data formats
  loading: boolean;
  loadingProgress?: number;
  error: string | null;
  onExport: () => void;
  onFormatVariables: () => void;
  isExporting?: boolean; // Export loading state
  // NEW: Dynamic variable support
  selectedVariables?: string[]; // For dynamic table generation
  // NEW: Variable formatting support
  formattingRules?: any[]; // User-defined formatting rules
}

export interface AnalyticsSummaryProps {
  data: AnalyticsData[];
  filters: AnalyticsFilters;
}

export interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  availableSpecialties: string[];
  availableSources: string[];
  availableRegions: string[];
  regionMapping?: Map<string, string>;
  availableProviderTypes: string[];
  availableDataCategories?: string[]; // NEW: Available data category options
  availableYears: string[];
  // NEW: Variable selection props
  selectedVariables: string[];
  availableVariables: string[];
  onVariablesChange: (variables: string[]) => void;
}


/**
 * Analytics hook return type
 */
export interface UseAnalyticsReturn {
  data: AnalyticsData[];
  allData: AnalyticsData[];
  loading: boolean;
  loadingProgress: number;
  error: string | null;
  filters: AnalyticsFilters;
  setFilters: (filters: AnalyticsFilters) => void;
  refetch: () => Promise<void>;
  forceRefresh: () => Promise<void>; // New: Force refresh on-demand
  exportToExcel: () => void;
  exportToCSV: () => void;
}