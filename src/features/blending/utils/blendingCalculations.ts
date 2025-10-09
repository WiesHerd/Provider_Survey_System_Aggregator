/**
 * Specialty Blending Calculations
 * 
 * This file contains the core calculation logic for specialty blending,
 * including weighted averages, validation, and result generation.
 */

import { SpecialtyItem, BlendedResult, BlendingValidation } from '../types/blending';

/**
 * Validates a specialty blend configuration
 */
export const validateBlend = (specialties: SpecialtyItem[]): BlendingValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if specialties exist
  if (specialties.length === 0) {
    errors.push('At least one specialty must be selected for blending');
  }
  
  // Check for duplicate specialties
  const specialtyNames = specialties.map(s => s.name);
  const duplicateNames = specialtyNames.filter((name, index) => 
    specialtyNames.indexOf(name) !== index
  );
  
  if (duplicateNames.length > 0) {
    errors.push(`Duplicate specialties found: ${duplicateNames.join(', ')}`);
  }
  
  // Calculate total weight
  const totalWeight = specialties.reduce((sum, specialty) => sum + specialty.weight, 0);
  
  // Check weight constraints
  if (totalWeight === 0) {
    errors.push('Total weight cannot be zero');
  } else if (Math.abs(totalWeight - 100) > 0.01) {
    warnings.push(`Total weight is ${totalWeight.toFixed(2)}%. Consider normalizing to 100%`);
  }
  
  // Check individual weights
  const negativeWeights = specialties.filter(s => s.weight < 0);
  if (negativeWeights.length > 0) {
    errors.push('Weights cannot be negative');
  }
  
  const zeroWeights = specialties.filter(s => s.weight === 0);
  if (zeroWeights.length > 0) {
    warnings.push('Some specialties have zero weight and will not contribute to the blend');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalWeight,
    missingSpecialties: [],
    duplicateSpecialties: duplicateNames
  };
};

/**
 * Normalizes weights to ensure they sum to 100%
 */
export const normalizeWeights = (specialties: SpecialtyItem[]): SpecialtyItem[] => {
  const totalWeight = specialties.reduce((sum, specialty) => sum + specialty.weight, 0);
  
  if (totalWeight === 0) return specialties;
  
  return specialties.map(specialty => ({
    ...specialty,
    weight: Math.round((specialty.weight / totalWeight) * 100 * 100) / 100 // Round to 2 decimal places
  }));
};

/**
 * Calculates weighted average for a metric
 */
export const calculateWeightedAverage = (
  specialties: SpecialtyItem[],
  metric: keyof Pick<SpecialtyItem, 'records'>,
  values: number[]
): number => {
  if (specialties.length === 0 || values.length === 0) return 0;
  
  const totalWeight = specialties.reduce((sum, specialty) => sum + specialty.weight, 0);
  
  if (totalWeight === 0) return 0;
  
  const weightedSum = specialties.reduce((sum, specialty, index) => {
    const value = values[index] || 0;
    return sum + (specialty.weight * value);
  }, 0);
  
  return Math.round((weightedSum / totalWeight) * 100) / 100;
};

/**
 * Calculates blended compensation metrics
 */
export const calculateBlendedMetrics = (
  specialties: SpecialtyItem[],
  specialtyData: Array<{
    tcc_p25: number;
    tcc_p50: number;
    tcc_p75: number;
    tcc_p90: number;
    wrvu_p25: number;
    wrvu_p50: number;
    wrvu_p75: number;
    wrvu_p90: number;
    cf_p25: number;
    cf_p50: number;
    cf_p75: number;
    cf_p90: number;
    n_orgs: number;
    n_incumbents: number;
  }>
): BlendedResult['blendedData'] => {
  if (specialties.length === 0 || specialtyData.length === 0) {
    return {
      tcc_p25: 0, tcc_p50: 0, tcc_p75: 0, tcc_p90: 0,
      wrvu_p25: 0, wrvu_p50: 0, wrvu_p75: 0, wrvu_p90: 0,
      cf_p25: 0, cf_p50: 0, cf_p75: 0, cf_p90: 0,
      n_orgs: 0, n_incumbents: 0
    };
  }
  
  const metrics = [
    'tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90',
    'wrvu_p25', 'wrvu_p50', 'wrvu_p75', 'wrvu_p90',
    'cf_p25', 'cf_p50', 'cf_p75', 'cf_p90'
  ] as const;
  
  const result: any = {};
  
  metrics.forEach(metric => {
    const values = specialtyData.map(data => data[metric]);
    result[metric] = calculateWeightedAverage(specialties, 'records', values);
  });
  
  // Calculate sample sizes
  result.n_orgs = Math.round(
    specialties.reduce((sum, specialty, index) => {
      const data = specialtyData[index];
      return sum + (specialty.weight / 100) * (data?.n_orgs || 0);
    }, 0)
  );
  
  result.n_incumbents = Math.round(
    specialties.reduce((sum, specialty, index) => {
      const data = specialtyData[index];
      return sum + (specialty.weight / 100) * (data?.n_incumbents || 0);
    }, 0)
  );
  
  return result;
};

/**
 * Calculates confidence score for a blend
 */
export const calculateConfidence = (
  specialties: SpecialtyItem[],
  specialtyData: Array<{ n_incumbents: number }>
): number => {
  if (specialties.length === 0) return 0;
  
  const totalSampleSize = specialtyData.reduce((sum, data) => sum + data.n_incumbents, 0);
  const avgSampleSize = totalSampleSize / specialtyData.length;
  
  // Confidence based on sample size and number of specialties
  const sampleSizeScore = Math.min(avgSampleSize / 1000, 1); // Max confidence at 1000+ samples
  const specialtyCountScore = Math.min(specialties.length / 5, 1); // Max confidence at 5+ specialties
  
  return Math.round((sampleSizeScore * 0.7 + specialtyCountScore * 0.3) * 100) / 100;
};

/**
 * Generates a unique blend ID
 */
export const generateBlendId = (): string => {
  return `blend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Formats weight for display
 */
export const formatWeight = (weight: number, precision: number = 2): string => {
  return `${weight.toFixed(precision)}%`;
};

/**
 * Checks if weights are balanced
 */
export const areWeightsBalanced = (specialties: SpecialtyItem[]): boolean => {
  const totalWeight = specialties.reduce((sum, specialty) => sum + specialty.weight, 0);
  return Math.abs(totalWeight - 100) < 0.01;
};
