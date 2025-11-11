/**
 * Report Types and Interfaces
 * 
 * Type definitions for the three core reports system
 */

import { DynamicAggregatedData } from '../../analytics/types/variables';
import { ISpecialtyMapping } from '../../../types/specialty';

/**
 * Report metric types
 */
export type ReportMetric = 'tcc' | 'wrvu' | 'cf';

/**
 * Blending method types
 */
export type BlendingMethod = 'weighted' | 'simple' | 'none';

/**
 * Percentile selection
 */
export type Percentile = 'p25' | 'p50' | 'p75' | 'p90';

/**
 * Report configuration interface
 */
export interface ReportConfig {
  metric: ReportMetric;
  selectedProviderType: string[]; // Multi-select
  selectedSurveySource: string[]; // Multi-select
  selectedRegion: string[]; // Multi-select
  selectedYear: string[]; // Multi-select
  enableBlending: boolean;
  blendingMethod: BlendingMethod;
  selectedPercentiles: Percentile[];
}

/**
 * Report data row structure
 */
export interface ReportDataRow {
  specialty: string;
  region?: string;
  providerType?: string;
  surveySource?: string;
  surveyYear?: string; // Year of the survey data
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  n_orgs: number;
  n_incumbents: number;
  isBlended: boolean; // Indicates if this row is a blended result
}

/**
 * Report data structure
 */
export interface ReportData {
  config: ReportConfig;
  rows: ReportDataRow[];
  metadata: {
    generatedAt: Date;
    totalRows: number;
    blendedRows: number;
    unmappedRows: number;
  };
}

/**
 * Report generation options
 */
export interface ReportGenerationOptions {
  data: DynamicAggregatedData[];
  mappings: ISpecialtyMapping[];
  config: ReportConfig;
}

/**
 * Blending result for a specialty
 */
export interface BlendedSpecialtyResult {
  specialty: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  n_orgs: number;
  n_incumbents: number;
  sourceRows: number; // Number of rows that were blended
}
