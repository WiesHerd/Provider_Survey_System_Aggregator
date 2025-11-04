/**
 * Specialty Blending Calculation Utilities
 * 
 * Handles the complex calculations for blending multiple specialties
 * in FMV calculations with both percentage-based and weighted methods.
 */

import { 
  SpecialtyBlendingConfig, 
  BlendedMarketData, 
  MarketData, 
  MarketPercentiles
} from '../types/fmv';

/**
 * Calculate blended market data from multiple specialties
 * 
 * @param specialties - Array of specialty data with weights
 * @param blendingConfig - Configuration for blending method
 * @returns Blended market data with confidence indicators
 */
export const calculateBlendedMarketData = (
  specialties: Array<{
    specialty: string;
    data: MarketData;
    percentage: number;
    weight: number;
    sampleSize: number;
  }>,
  blendingConfig: SpecialtyBlendingConfig
): BlendedMarketData => {
  if (specialties.length === 0) {
    throw new Error('At least one specialty is required for blending');
  }

  // Validate percentage-based blending
  if (blendingConfig.blendingMethod === 'percentage') {
    const totalPercentage = specialties.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      throw new Error(`Total percentage must equal 100%, got ${totalPercentage}%`);
    }
  }

  // Calculate blended percentiles for each metric
  const blendedTcc = calculateBlendedPercentiles(
    specialties.map(s => ({
      data: s.data.tcc,
      percentage: s.percentage,
      weight: s.weight,
      sampleSize: s.sampleSize
    })),
    blendingConfig.blendingMethod
  );

  const blendedWrvu = calculateBlendedPercentiles(
    specialties.map(s => ({
      data: s.data.wrvu,
      percentage: s.percentage,
      weight: s.weight,
      sampleSize: s.sampleSize
    })),
    blendingConfig.blendingMethod
  );

  const blendedCf = calculateBlendedPercentiles(
    specialties.map(s => ({
      data: s.data.cf,
      percentage: s.percentage,
      weight: s.weight,
      sampleSize: s.sampleSize
    })),
    blendingConfig.blendingMethod
  );

  // Calculate blended Call Pay percentiles if available
  const hasCallPayData = specialties.some(s => s.data.callPay);
  const blendedCallPay = hasCallPayData ? calculateBlendedPercentiles(
    specialties.map(s => ({
      data: s.data.callPay || { p25: 0, p50: 0, p75: 0, p90: 0 },
      percentage: s.percentage,
      weight: s.weight,
      sampleSize: s.sampleSize
    })),
    blendingConfig.blendingMethod
  ) : undefined;

  // Calculate confidence based on sample sizes and data quality
  const confidence = calculateBlendingConfidence(specialties);

  // Generate quality warnings
  const qualityWarnings = generateQualityWarnings(specialties, confidence);

  // Create source data mapping
  const sourceData: { [specialty: string]: MarketData } = {};
  specialties.forEach(s => {
    sourceData[s.specialty] = s.data;
  });

  return {
    specialties: blendingConfig,
    blendedPercentiles: {
      tcc: blendedTcc,
      wrvu: blendedWrvu,
      cf: blendedCf,
      callPay: blendedCallPay
    },
    sourceData,
    confidence,
    totalSampleSize: specialties.reduce((sum, s) => sum + s.sampleSize, 0),
    qualityWarnings
  };
};

/**
 * Calculate blended percentiles for a specific metric
 */
const calculateBlendedPercentiles = (
  metricData: Array<{
    data: MarketPercentiles;
    percentage: number;
    weight: number;
    sampleSize: number;
  }>,
  blendingMethod: 'percentage' | 'weighted'
): MarketPercentiles => {
  const percentiles: (keyof MarketPercentiles)[] = ['p25', 'p50', 'p75', 'p90'];
  const result: MarketPercentiles = { p25: 0, p50: 0, p75: 0, p90: 0 };

  percentiles.forEach(percentile => {
    if (blendingMethod === 'percentage') {
      // Simple percentage-based blending
      result[percentile] = metricData.reduce((sum, item) => {
        return sum + (item.data[percentile] * item.percentage / 100);
      }, 0);
    } else {
      // Weighted blending based on sample sizes and weights
      const totalWeight = metricData.reduce((sum, item) => {
        return sum + (item.weight * item.sampleSize);
      }, 0);

      result[percentile] = metricData.reduce((sum, item) => {
        const itemWeight = (item.weight * item.sampleSize) / totalWeight;
        return sum + (item.data[percentile] * itemWeight);
      }, 0);
    }
  });

  return result;
};

/**
 * Calculate confidence level for blended data
 */
const calculateBlendingConfidence = (
  specialties: Array<{
    specialty: string;
    sampleSize: number;
    percentage: number;
  }>
): number => {
  // Base confidence on sample sizes and specialty distribution
  const totalSampleSize = specialties.reduce((sum, s) => sum + s.sampleSize, 0);
  
  // Minimum sample size threshold
  const minSampleSize = 30;
  const sampleSizeConfidence = Math.min(1, totalSampleSize / (minSampleSize * specialties.length));
  
  // Distribution balance (avoid extreme imbalances)
  const maxPercentage = Math.max(...specialties.map(s => s.percentage));
  const distributionConfidence = maxPercentage <= 80 ? 1 : Math.max(0.5, 1 - (maxPercentage - 80) / 20);
  
  // Number of specialties (more specialties = lower confidence due to complexity)
  const specialtyCountConfidence = specialties.length <= 3 ? 1 : Math.max(0.7, 1 - (specialties.length - 3) * 0.1);
  
  // Weighted average of confidence factors
  return (sampleSizeConfidence * 0.5 + distributionConfidence * 0.3 + specialtyCountConfidence * 0.2);
};

/**
 * Generate quality warnings for blended data
 */
const generateQualityWarnings = (
  specialties: Array<{
    specialty: string;
    sampleSize: number;
    percentage: number;
  }>,
  confidence: number
): string[] => {
  const warnings: string[] = [];

  // Low confidence warning
  if (confidence < 0.6) {
    warnings.push('Low confidence in blended results due to data quality issues');
  }

  // Sample size warnings
  const lowSampleSpecialties = specialties.filter(s => s.sampleSize < 30);
  if (lowSampleSpecialties.length > 0) {
    warnings.push(`Low sample sizes for: ${lowSampleSpecialties.map(s => s.specialty).join(', ')}`);
  }

  // Distribution warnings
  const maxPercentage = Math.max(...specialties.map(s => s.percentage));
  if (maxPercentage > 80) {
    warnings.push('One specialty dominates the blend (>80%), results may be skewed');
  }

  // Too many specialties warning
  if (specialties.length > 4) {
    warnings.push('Complex blending with many specialties may reduce reliability');
  }

  return warnings;
};

/**
 * Validate specialty blending configuration
 */
export const validateSpecialtyBlending = (config: SpecialtyBlendingConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if specialties are selected
  if (config.specialties.length === 0) {
    errors.push('At least one specialty must be selected');
    return { isValid: false, errors, warnings };
  }

  // Check for duplicate specialties
  const specialtyNames = config.specialties.map(s => s.specialty);
  const duplicates = specialtyNames.filter((name, index) => specialtyNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate specialties: ${duplicates.join(', ')}`);
  }

  // Validate percentages
  if (config.blendingMethod === 'percentage') {
    const totalPercentage = config.specialties.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      errors.push(`Total percentage must equal 100%, got ${totalPercentage}%`);
    }

    // Check for negative percentages
    const negativePercentages = config.specialties.filter(s => s.percentage < 0);
    if (negativePercentages.length > 0) {
      errors.push('Percentages cannot be negative');
    }
  }

  // Validate weights
  const invalidWeights = config.specialties.filter(s => s.weight <= 0);
  if (invalidWeights.length > 0) {
    errors.push('Weights must be greater than 0');
  }

  // Warnings for potential issues
  if (config.specialties.length > 4) {
    warnings.push('Using more than 4 specialties may reduce calculation reliability');
  }

  const maxPercentage = Math.max(...config.specialties.map(s => s.percentage));
  if (maxPercentage > 80) {
    warnings.push('One specialty dominates the blend (>80%)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Get recommended blending method based on data characteristics
 */
export const getRecommendedBlendingMethod = (
  specialties: Array<{
    specialty: string;
    sampleSize: number;
    percentage: number;
  }>
): 'percentage' | 'weighted' => {
  // If sample sizes are very different, recommend weighted
  const sampleSizes = specialties.map(s => s.sampleSize);
  const minSample = Math.min(...sampleSizes);
  const maxSample = Math.max(...sampleSizes);
  
  if (maxSample / minSample > 3) {
    return 'weighted';
  }
  
  // If percentages are balanced, percentage is fine
  const maxPercentage = Math.max(...specialties.map(s => s.percentage));
  if (maxPercentage <= 70) {
    return 'percentage';
  }
  
  // Default to weighted for complex cases
  return 'weighted';
};
