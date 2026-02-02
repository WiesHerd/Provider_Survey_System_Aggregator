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
  selectedSpecialty: string[]; // Multi-select – filter to specific specialties (e.g. Cardiology, Family Medicine)
  selectedSurveySource: string[]; // Multi-select
  selectedRegion: string[]; // Multi-select
  selectedYear: string[]; // Multi-select
  enableBlending: boolean;
  blendYears: boolean; // When true and 2+ years selected, blend across years (one row per specialty/source/region)
  blendingMethod: BlendingMethod;
  selectedPercentiles: Percentile[];
}

/**
 * One source row that contributed to a blended report row (for transparency / "how was this calculated")
 */
export interface BlendBreakdownItem {
  year: string;
  surveySource: string;
  n_incumbents: number;
  n_orgs?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  weight: number;
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
  /** When isBlended, optional breakdown of source rows (year, source, n, percentiles, weight) for drawer */
  blendBreakdown?: BlendBreakdownItem[];
  /** When isBlended, method used: weighted by n_incumbents or simple average */
  blendMethod?: BlendingMethod;
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
