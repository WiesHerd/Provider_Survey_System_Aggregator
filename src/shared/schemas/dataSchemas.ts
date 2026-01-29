/**
 * Enterprise Data Validation Schemas
 * 
 * Zod schemas for all data types to ensure data integrity before storage.
 * These schemas are used for pre-write validation in IndexedDBService.
 */

import { z } from 'zod';
import { ProviderType, DataCategory } from '../../types/provider';
import { SurveySource } from '../types';

/**
 * Survey Schema
 */
export const SurveySchema = z.object({
  id: z.string().min(1, 'Survey ID is required'),
  name: z.string().min(1, 'Survey name is required').max(200, 'Survey name too long'),
  year: z.string().regex(/^\d{4}$/, 'Year must be 4 digits'),
  type: z.string().min(1, 'Survey type is required'),
  uploadDate: z.date(),
  rowCount: z.number().int().nonnegative('Row count must be non-negative'),
  specialtyCount: z.number().int().nonnegative('Specialty count must be non-negative'),
  dataPoints: z.number().int().nonnegative('Data points must be non-negative'),
  colorAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color accent must be a valid hex color'),
  metadata: z.record(z.string(), z.any()).optional(),
  providerType: z.string().refine((val) => {
    if (!val) return true; // Optional field, allow undefined/empty
    const normalized = val.toUpperCase().trim();
    // Accept exact matches or variations that contain the base type
    return ['PHYSICIAN', 'APP', 'CALL', 'CUSTOM'].includes(normalized) ||
           normalized.includes('PHYSICIAN') ||
           normalized.includes('APP') ||
           normalized.includes('CALL');
  }, { message: 'Invalid provider type' }).optional(),
  dataCategory: z.string().refine((val) => ['COMPENSATION', 'CALL_PAY', 'MOONLIGHTING', 'CUSTOM'].includes(val), { message: 'Invalid data category' }).optional(),
  source: z.string().optional(),
  surveyLabel: z.string().max(100).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type SurveyInput = z.infer<typeof SurveySchema>;

/**
 * Survey Data Schema
 */
export const SurveyDataSchema = z.object({
  id: z.string().min(1, 'Survey data ID is required'),
  surveyId: z.string().min(1, 'Survey ID is required'),
  data: z.record(z.string(), z.any()),
  specialty: z.string().optional(),
  providerType: z.string().optional(),
  region: z.string().optional(),
  variable: z.string().optional(),
  tcc: z.number().optional(),
  cf: z.number().optional(),
  wrvu: z.number().optional(),
  count: z.number().int().nonnegative().optional(),
  // Percentile-specific compensation data
  tcc_p25: z.number().nonnegative().optional(),
  tcc_p50: z.number().nonnegative().optional(),
  tcc_p75: z.number().nonnegative().optional(),
  tcc_p90: z.number().nonnegative().optional(),
  cf_p25: z.number().nonnegative().optional(),
  cf_p50: z.number().nonnegative().optional(),
  cf_p75: z.number().nonnegative().optional(),
  cf_p90: z.number().nonnegative().optional(),
  wrvu_p25: z.number().nonnegative().optional(),
  wrvu_p50: z.number().nonnegative().optional(),
  wrvu_p75: z.number().nonnegative().optional(),
  wrvu_p90: z.number().nonnegative().optional(),
  n_orgs: z.number().int().nonnegative().optional(),
  n_incumbents: z.number().int().nonnegative().optional()
});

export type SurveyDataInput = z.infer<typeof SurveyDataSchema>;

/**
 * Survey Row Schema (for normalized data)
 */
export const SurveyRowSchema = z.object({
  normalizedSpecialty: z.string().min(1, 'Normalized specialty is required'),
  providerType: z.string().min(1, 'Provider type is required'),
  geographicRegion: z.string().min(1, 'Geographic region is required'),
  tcc_p25: z.number().nonnegative(),
  tcc_p50: z.number().nonnegative(),
  tcc_p75: z.number().nonnegative(),
  tcc_p90: z.number().nonnegative(),
  wrvu_p25: z.number().nonnegative(),
  wrvu_p50: z.number().nonnegative(),
  wrvu_p75: z.number().nonnegative(),
  wrvu_p90: z.number().nonnegative(),
  variable: z.string().optional(),
  p25: z.number().nonnegative().optional(),
  p50: z.number().nonnegative().optional(),
  p75: z.number().nonnegative().optional(),
  p90: z.number().nonnegative().optional()
}).passthrough(); // Allow additional fields

export type SurveyRowInput = z.infer<typeof SurveyRowSchema>;

/**
 * Source Specialty Schema
 */
export const SourceSpecialtySchema = z.object({
  id: z.string().min(1, 'Source specialty ID is required'),
  specialty: z.string().min(1, 'Specialty name is required'),
  originalName: z.string().optional(),
  surveySource: z.string().min(1, 'Survey source is required'),
  frequency: z.number().int().nonnegative().optional(),
  mappingId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type SourceSpecialtyInput = z.infer<typeof SourceSpecialtySchema>;

/**
 * Specialty Mapping Schema
 */
export const SpecialtyMappingSchema = z.object({
  id: z.string().min(1, 'Mapping ID is required'),
  standardizedName: z.string().min(1, 'Standardized name is required'),
  sourceSpecialties: z.array(SourceSpecialtySchema).min(1, 'At least one source specialty is required'),
  providerType: z.string().refine((val) => {
    if (!val) return true; // Optional field, allow undefined/empty
    const normalized = val.toUpperCase().trim();
    return ['PHYSICIAN', 'APP'].includes(normalized) ||
           normalized.includes('PHYSICIAN') ||
           normalized.includes('APP');
  }, { message: 'Invalid provider type' }).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type SpecialtyMappingInput = z.infer<typeof SpecialtyMappingSchema>;

/**
 * Unmapped Specialty Schema
 */
export const UnmappedSpecialtySchema = z.object({
  id: z.string().min(1, 'Unmapped specialty ID is required'),
  name: z.string().min(1, 'Specialty name is required'),
  surveySource: z.string().min(1, 'Survey source is required'),
  frequency: z.number().int().nonnegative('Frequency must be non-negative'),
  providerType: z.string().refine((val) => {
    if (!val) return true; // Optional field, allow undefined/empty
    const normalized = val.toUpperCase().trim();
    return ['PHYSICIAN', 'APP', 'CALL', 'CUSTOM'].includes(normalized) ||
           normalized.includes('PHYSICIAN') ||
           normalized.includes('APP') ||
           normalized.includes('CALL');
  }, { message: 'Invalid provider type' }).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type UnmappedSpecialtyInput = z.infer<typeof UnmappedSpecialtySchema>;

/**
 * Column Info Schema
 */
export const ColumnInfoSchema = z.object({
  id: z.string().min(1, 'Column info ID is required'),
  name: z.string().min(1, 'Column name is required'),
  surveySource: z.string().min(1, 'Survey source is required'),
  dataType: z.string().min(1, 'Data type is required'),
  frequency: z.number().int().nonnegative().optional(),
  mappingId: z.string().optional()
});

export type ColumnInfoInput = z.infer<typeof ColumnInfoSchema>;

/**
 * Column Mapping Schema
 */
export const ColumnMappingSchema = z.object({
  id: z.string().min(1, 'Column mapping ID is required'),
  standardizedName: z.string().min(1, 'Standardized name is required'),
  sourceColumns: z.array(ColumnInfoSchema).min(1, 'At least one source column is required'),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type ColumnMappingInput = z.infer<typeof ColumnMappingSchema>;

/**
 * Variable Mapping Schema
 */
export const VariableMappingSchema = z.object({
  id: z.string().min(1, 'Variable mapping ID is required'),
  standardizedName: z.string().min(1, 'Standardized name is required'),
  sourceVariables: z.array(z.object({
    variableName: z.string().min(1),
    surveySource: z.string().min(1),
    variableType: z.string().optional()
  })).min(1, 'At least one source variable is required'),
  variableType: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type VariableMappingInput = z.infer<typeof VariableMappingSchema>;

/**
 * Region Mapping Schema
 */
export const RegionMappingSchema = z.object({
  id: z.string().min(1, 'Region mapping ID is required'),
  standardizedName: z.string().min(1, 'Standardized name is required'),
  sourceRegions: z.array(z.object({
    regionName: z.string().min(1),
    surveySource: z.string().min(1)
  })).min(1, 'At least one source region is required'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type RegionMappingInput = z.infer<typeof RegionMappingSchema>;

/**
 * Provider Type Mapping Schema
 */
export const ProviderTypeMappingSchema = z.object({
  id: z.string().min(1, 'Provider type mapping ID is required'),
  standardizedName: z.string().refine((val) => ['PHYSICIAN', 'APP', 'CALL', 'CUSTOM'].includes(val), { message: 'Invalid standardized name' }),
  sourceProviderTypes: z.array(z.object({
    providerType: z.string().min(1),
    surveySource: z.string().min(1)
  })).min(1, 'At least one source provider type is required'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type ProviderTypeMappingInput = z.infer<typeof ProviderTypeMappingSchema>;

/**
 * Survey Metadata Schema
 */
export const SurveyMetadataSchema = z.object({
  totalRows: z.number().int().nonnegative(),
  uniqueSpecialties: z.array(z.string()),
  uniqueProviderTypes: z.array(z.string()),
  uniqueRegions: z.array(z.string()),
  columnMappings: z.record(z.string(), z.string())
});

export type SurveyMetadataInput = z.infer<typeof SurveyMetadataSchema>;

/**
 * Validation helper functions
 */
export function validateSurvey(data: unknown): SurveyInput {
  return SurveySchema.parse(data);
}

export function validateSurveyData(data: unknown): SurveyDataInput {
  return SurveyDataSchema.parse(data);
}

export function validateSurveyRow(data: unknown): SurveyRowInput {
  return SurveyRowSchema.parse(data);
}

export function validateSpecialtyMapping(data: unknown): SpecialtyMappingInput {
  return SpecialtyMappingSchema.parse(data);
}

export function validateColumnMapping(data: unknown): ColumnMappingInput {
  return ColumnMappingSchema.parse(data);
}

export function validateVariableMapping(data: unknown): VariableMappingInput {
  return VariableMappingSchema.parse(data);
}

export function validateRegionMapping(data: unknown): RegionMappingInput {
  return RegionMappingSchema.parse(data);
}

export function validateProviderTypeMapping(data: unknown): ProviderTypeMappingInput {
  return ProviderTypeMappingSchema.parse(data);
}

/**
 * Safe validation (returns result instead of throwing)
 */
export function safeValidateSurvey(data: unknown): { success: true; data: SurveyInput } | { success: false; error: z.ZodError } {
  const result = SurveySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateSurveyData(data: unknown): { success: true; data: SurveyDataInput } | { success: false; error: z.ZodError } {
  const result = SurveyDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateSpecialtyMapping(data: unknown): { success: true; data: SpecialtyMappingInput } | { success: false; error: z.ZodError } {
  const result = SpecialtyMappingSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

