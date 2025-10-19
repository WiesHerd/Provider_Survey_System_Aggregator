/**
 * Analytics Feature - Variable Type Definitions
 * 
 * Type definitions for dynamic variable discovery and management.
 * Following enterprise patterns for type safety and maintainability.
 */

/**
 * Discovered variable from survey data scanning
 */
export interface DiscoveredVariable {
  name: string; // Display name: "Base Salary", "TCC", "Work RVUs"
  normalizedName: string; // Internal name: "base_salary", "tcc", "work_rvus"
  category: 'compensation' | 'productivity' | 'ratio' | 'other';
  availableSources: string[]; // Which surveys have this: ["SullivanCotter", "MGMA"]
  recordCount: number; // Number of records with this variable
  firstSeen: Date; // When this variable first appeared
  dataQuality: number; // % of records with non-zero values (0-1)
  format: 'long' | 'wide'; // How this variable is stored
}

/**
 * Variable metrics for a specific variable in aggregated data
 */
export interface VariableMetrics {
  variableName: string; // Display name of the variable
  n_orgs: number; // Number of organizations
  n_incumbents: number; // Number of incumbents
  p25: number; // 25th percentile
  p50: number; // 50th percentile (median)
  p75: number; // 75th percentile
  p90: number; // 90th percentile
}

/**
 * Dynamic aggregated data structure supporting any variables
 */
export interface DynamicAggregatedData {
  standardizedName: string;
  surveySource: string;
  surveySpecialty: string;
  originalSpecialty: string;
  geographicRegion: string;
  providerType?: string;
  surveyYear?: string;
  
  // Dynamic variables - structure adapts to selected variables
  variables: Record<string, VariableMetrics>;
}

/**
 * Normalized row with dynamic variables
 */
export interface DynamicNormalizedRow {
  specialty: string;
  providerType: string;
  region: string;
  surveySource: string;
  surveyYear: string;
  variables: Record<string, VariableMetrics>;
}

/**
 * Variable category for grouping and display
 */
export type VariableCategory = 'compensation' | 'productivity' | 'ratio' | 'other';

/**
 * Variable discovery result
 */
export interface VariableDiscoveryResult {
  variables: DiscoveredVariable[];
  totalSurveys: number;
  totalRecords: number;
  discoveryTime: number;
}

/**
 * Variable selection state
 */
export interface VariableSelectionState {
  selectedVariables: string[];
  availableVariables: string[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Variable formatter options
 */
export interface VariableFormatterOptions {
  showCurrency?: boolean;
  showDecimals?: number;
  showUnits?: boolean;
}

/**
 * Variable color mapping for UI display
 */
export const VARIABLE_COLORS = [
  '#E3F2FD', // Blue (TCC)
  '#E8F5E8', // Green (wRVU)
  '#FFF3E0', // Orange (CF)
  '#F3E5F5', // Purple (Base Salary)
  '#E0F2F1', // Teal (ASA Units)
  '#FCE4EC', // Pink (Panel Size)
  '#F1F8E9', // Light Green (Other)
  '#FFF8E1', // Light Yellow (Other)
] as const;

/**
 * Default variable selections for new users
 * These use standardized names that will match normalized variations
 */
export const DEFAULT_VARIABLES = ['tcc', 'work_rvus', 'tcc_per_work_rvu'] as const;

/**
 * Maximum number of variables that can be selected
 */
export const MAX_SELECTED_VARIABLES = 5;
