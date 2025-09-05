/**
 * Analytics feature type definitions
 * Extracted from SurveyAnalytics.tsx for better organization
 */

// Variable mapping interface
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

// Aggregated data interface
export interface AggregatedData {
  standardizedName: string;
  surveySource: string;
  surveySpecialty: string;
  geographicRegion: string;
  providerType?: string;
  surveyYear?: string;
  n_orgs: number;
  n_incumbents: number;
  
  // TCC metrics with their own organizational data
  tcc_n_orgs?: number;
  tcc_n_incumbents?: number;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  
  // wRVU metrics with their own organizational data
  wrvu_n_orgs?: number;
  wrvu_n_incumbents?: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  
  // CF metrics with their own organizational data
  cf_n_orgs?: number;
  cf_n_incumbents?: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
}

// Analytics filters interface
export interface AnalyticsFilters {
  specialty: string;
  providerType: string;
  region: string;
  variable: string;
  surveySource: string;
}

// Analytics state interface
export interface AnalyticsState {
  data: AggregatedData[];
  loading: boolean;
  error: string | null;
  filters: AnalyticsFilters;
  uniqueValues: {
    specialties: string[];
    providerTypes: string[];
    regions: string[];
    variables: string[];
    surveySources: string[];
  };
}

// Export functions interface
export interface ExportFunctions {
  exportToExcel: () => void;
  exportToCSV: () => void;
  exportToPDF: () => void;
}

// Component props interfaces
export interface AnalyticsContainerProps {
  className?: string;
}

export interface AnalyticsTableProps {
  data: AggregatedData[];
  loading: boolean;
  onRowClick?: (row: AggregatedData) => void;
}

export interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  uniqueValues: AnalyticsState['uniqueValues'];
  onFilterChange: (filterName: keyof AnalyticsFilters, value: string) => void;
  onClearFilters: () => void;
}

export interface AnalyticsSummaryProps {
  data: AggregatedData[];
  loading: boolean;
}

export interface AnalyticsExportProps {
  data: AggregatedData[];
  onExport: (format: 'excel' | 'csv' | 'pdf') => void;
  loading: boolean;
}