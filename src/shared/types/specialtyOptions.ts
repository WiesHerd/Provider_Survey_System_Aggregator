/**
 * Specialty Options Types
 * 
 * Types for enriched specialty options with mapping transparency metadata.
 * These types are used for display purposes only - they don't affect filtering logic.
 */

/**
 * Source specialty information for mapped specialties
 */
export interface SourceSpecialtyInfo {
  surveySource: string;
  specialty: string;
  originalName?: string;
}

/**
 * Enriched specialty option with mapping metadata
 * 
 * CRITICAL: The `name` field is the actual value used for filtering.
 * All other fields are for display/indicator purposes only.
 */
export interface SpecialtyOption {
  /** The standardized specialty name - this is what gets passed to filters (unchanged) */
  name: string;
  /** Whether this specialty is mapped (for indicator display) */
  isMapped: boolean;
  /** Whether this specialty is unmapped (for indicator display) */
  isUnmapped: boolean;
  /** Source specialties that map to this standardized name (for tooltip display) */
  sourceSpecialties: SourceSpecialtyInfo[];
  /** Formatted display label with indicators (for UI display only) */
  displayLabel: string;
}

/**
 * Grouped specialty options for dropdown display
 */
export interface GroupedSpecialtyOptions {
  mapped: SpecialtyOption[];
  unmapped: SpecialtyOption[];
}


