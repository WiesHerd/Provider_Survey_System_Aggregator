/**
 * Multi-Year Blending Calculation Utilities
 * 
 * Handles the complex calculations for blending multiple years of survey data
 * with percentage-based, weighted, or equal blending methods.
 * 
 * This provides the backend logic for multi-year analytics blending.
 */

import { 
  AggregatedData, 
  YearBlendingConfig, 
  BlendedAnalyticsResult,
  SummaryCalculation 
} from '../types/analytics';
import { groupBySpecialty, calculateSummaryRows } from './analyticsCalculations';

/**
 * Calculate multi-year blended analytics data
 * 
 * Two-stage blending process:
 * Stage 1: Within each year, blend all surveys (using existing calculateSummaryRows)
 * Stage 2: Across years, blend the year results using year blending method
 * 
 * @param allData - All analytics data (multiple years, multiple surveys)
 * @param blendingConfig - Multi-year blending configuration
 * @returns Blended analytics result with year breakdown and quality metrics
 */
export const calculateMultiYearBlending = (
  allData: AggregatedData[],
  blendingConfig: YearBlendingConfig
): BlendedAnalyticsResult => {
  console.log('🔍 MultiYearBlending: Starting calculation with', allData.length, 'total records');
  console.log('🔍 MultiYearBlending: Blending config:', blendingConfig);
  
  // Validate blending configuration
  validateBlendingConfig(blendingConfig);
  
  // Stage 1: Group data by year and calculate year-level aggregations
  const yearData = new Map<string, AggregatedData[]>();
  
  blendingConfig.years.forEach(yearItem => {
    const yearRecords = allData.filter(row => row.surveyYear === yearItem.year);
    console.log(`🔍 MultiYearBlending: Year ${yearItem.year} has ${yearRecords.length} records`);
    yearData.set(yearItem.year, yearRecords);
  });
  
  // Stage 2: Calculate aggregated data for each year (blend surveys within year)
  const yearAggregations = new Map<string, AggregatedData[]>();
  
  yearData.forEach((records, year) => {
    if (records.length === 0) {
      console.warn(`⚠️ MultiYearBlending: No data found for year ${year}`);
      return;
    }
    
    // Group by specialty within this year
    const groupedBySpecialty = groupBySpecialty(records);
    
    // Calculate weighted averages for each specialty in this year
    const yearAggregatedData: AggregatedData[] = [];
    
    Object.entries(groupedBySpecialty).forEach(([specialty, rows]) => {
      const { weighted } = calculateSummaryRows(rows);
      
      // Create aggregated record for this specialty in this year
      yearAggregatedData.push({
        standardizedName: specialty,
        surveySpecialty: specialty,
        originalSpecialty: rows[0]?.originalSpecialty || specialty,
        surveySource: `${year} - Blended`,
        geographicRegion: rows[0]?.geographicRegion || 'Multiple',
        providerType: rows[0]?.providerType || 'Multiple',
        surveyYear: year,
        
        // Use weighted averages from calculateSummaryRows
        tcc_n_orgs: weighted.tcc_n_orgs,
        tcc_n_incumbents: weighted.tcc_n_incumbents,
        tcc_p25: weighted.tcc_p25,
        tcc_p50: weighted.tcc_p50,
        tcc_p75: weighted.tcc_p75,
        tcc_p90: weighted.tcc_p90,
        
        wrvu_n_orgs: weighted.wrvu_n_orgs,
        wrvu_n_incumbents: weighted.wrvu_n_incumbents,
        wrvu_p25: weighted.wrvu_p25,
        wrvu_p50: weighted.wrvu_p50,
        wrvu_p75: weighted.wrvu_p75,
        wrvu_p90: weighted.wrvu_p90,
        
        cf_n_orgs: weighted.cf_n_orgs,
        cf_n_incumbents: weighted.cf_n_incumbents,
        cf_p25: weighted.cf_p25,
        cf_p50: weighted.cf_p50,
        cf_p75: weighted.cf_p75,
        cf_p90: weighted.cf_p90
      });
    });
    
    console.log(`🔍 MultiYearBlending: Year ${year} aggregated to ${yearAggregatedData.length} specialty records`);
    yearAggregations.set(year, yearAggregatedData);
  });
  
  // Stage 3: Blend across years
  const blendedData = blendAcrossYears(yearAggregations, blendingConfig);
  
  // Build year breakdown for transparency
  const yearBreakdown = buildYearBreakdown(yearAggregations, blendingConfig);
  
  // Calculate quality metrics
  const confidence = calculateBlendingConfidence(yearAggregations, blendingConfig);
  const qualityWarnings = generateQualityWarnings(yearAggregations, blendingConfig, confidence);
  
  // Calculate metadata
  const totalSampleSize = Array.from(yearAggregations.values()).reduce((sum, yearData) => {
    return sum + yearData.reduce((s, row) => s + row.tcc_n_incumbents, 0);
  }, 0);
  
  const totalSurveyCount = Array.from(yearData.values()).reduce((sum, records) => {
    return sum + new Set(records.map(r => r.surveySource)).size;
  }, 0);
  
  console.log('🔍 MultiYearBlending: Final blended data:', blendedData.length, 'records');
  console.log('🔍 MultiYearBlending: Total sample size:', totalSampleSize);
  console.log('🔍 MultiYearBlending: Confidence:', confidence);
  
  return {
    blendedData,
    yearBreakdown,
    confidence,
    qualityWarnings,
    totalSampleSize,
    totalSurveyCount,
    yearsIncluded: blendingConfig.years.map(y => y.year),
    blendingMethod: blendingConfig.method
  };
};

/**
 * Validate blending configuration
 */
const validateBlendingConfig = (config: YearBlendingConfig): void => {
  console.log('🔍 validateBlendingConfig: Config received:', config);
  console.log('🔍 validateBlendingConfig: Years array:', config.years);
  console.log('🔍 validateBlendingConfig: Years length:', config.years?.length);
  
  if (!config.years || config.years.length === 0) {
    console.error('🔍 validateBlendingConfig: No years provided in config');
    throw new Error('At least one year is required for blending');
  }
  
  if (config.method === 'percentage') {
    const totalPercentage = config.years.reduce((sum, y) => sum + y.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      throw new Error(`Total percentage must equal 100%, got ${totalPercentage.toFixed(1)}%`);
    }
  }
};

/**
 * Blend aggregated data across multiple years
 */
const blendAcrossYears = (
  yearAggregations: Map<string, AggregatedData[]>,
  blendingConfig: YearBlendingConfig
): AggregatedData[] => {
  
  if (blendingConfig.method === 'percentage') {
    return blendYearsWithPercentage(yearAggregations, blendingConfig);
  } else if (blendingConfig.method === 'weighted') {
    return blendYearsWithWeight(yearAggregations, blendingConfig);
  } else {
    return blendYearsEqually(yearAggregations, blendingConfig);
  }
};

/**
 * Percentage-based year blending (e.g., 70% 2023 + 30% 2024)
 */
const blendYearsWithPercentage = (
  yearAggregations: Map<string, AggregatedData[]>,
  blendingConfig: YearBlendingConfig
): AggregatedData[] => {
  console.log('🔍 MultiYearBlending: Using percentage-based blending');
  
  // Get all unique specialties across all years
  const allSpecialties = new Set<string>();
  yearAggregations.forEach(yearData => {
    yearData.forEach(row => allSpecialties.add(row.surveySpecialty));
  });
  
  // Blend each specialty across years
  const blendedData: AggregatedData[] = [];
  
  allSpecialties.forEach(specialty => {
    const blendedRow: AggregatedData = {
      standardizedName: specialty,
      surveySpecialty: specialty,
      originalSpecialty: specialty,
      surveySource: 'Multi-Year Blended',
      geographicRegion: 'Multi-Year Blend',
      providerType: 'Multi-Year Blend',
      surveyYear: blendingConfig.years.map(y => `${y.percentage}% ${y.year}`).join(' + '),
      
      // Initialize all metrics
      tcc_n_orgs: 0,
      tcc_n_incumbents: 0,
      tcc_p25: 0,
      tcc_p50: 0,
      tcc_p75: 0,
      tcc_p90: 0,
      
      wrvu_n_orgs: 0,
      wrvu_n_incumbents: 0,
      wrvu_p25: 0,
      wrvu_p50: 0,
      wrvu_p75: 0,
      wrvu_p90: 0,
      
      cf_n_orgs: 0,
      cf_n_incumbents: 0,
      cf_p25: 0,
      cf_p50: 0,
      cf_p75: 0,
      cf_p90: 0
    };
    
    // Apply percentage weighting for each year
    blendingConfig.years.forEach(yearItem => {
      const yearData = yearAggregations.get(yearItem.year) || [];
      const specialtyRow = yearData.find(r => r.surveySpecialty === specialty);
      
      if (specialtyRow) {
        const weight = yearItem.percentage / 100;
        
        // Blend all metrics with percentage weight
        blendedRow.tcc_n_orgs += specialtyRow.tcc_n_orgs * weight;
        blendedRow.tcc_n_incumbents += specialtyRow.tcc_n_incumbents * weight;
        blendedRow.tcc_p25 += specialtyRow.tcc_p25 * weight;
        blendedRow.tcc_p50 += specialtyRow.tcc_p50 * weight;
        blendedRow.tcc_p75 += specialtyRow.tcc_p75 * weight;
        blendedRow.tcc_p90 += specialtyRow.tcc_p90 * weight;
        
        blendedRow.wrvu_n_orgs += specialtyRow.wrvu_n_orgs * weight;
        blendedRow.wrvu_n_incumbents += specialtyRow.wrvu_n_incumbents * weight;
        blendedRow.wrvu_p25 += specialtyRow.wrvu_p25 * weight;
        blendedRow.wrvu_p50 += specialtyRow.wrvu_p50 * weight;
        blendedRow.wrvu_p75 += specialtyRow.wrvu_p75 * weight;
        blendedRow.wrvu_p90 += specialtyRow.wrvu_p90 * weight;
        
        blendedRow.cf_n_orgs += specialtyRow.cf_n_orgs * weight;
        blendedRow.cf_n_incumbents += specialtyRow.cf_n_incumbents * weight;
        blendedRow.cf_p25 += specialtyRow.cf_p25 * weight;
        blendedRow.cf_p50 += specialtyRow.cf_p50 * weight;
        blendedRow.cf_p75 += specialtyRow.cf_p75 * weight;
        blendedRow.cf_p90 += specialtyRow.cf_p90 * weight;
      }
    });
    
    // Round organizational counts to integers
    blendedRow.tcc_n_orgs = Math.round(blendedRow.tcc_n_orgs);
    blendedRow.tcc_n_incumbents = Math.round(blendedRow.tcc_n_incumbents);
    blendedRow.wrvu_n_orgs = Math.round(blendedRow.wrvu_n_orgs);
    blendedRow.wrvu_n_incumbents = Math.round(blendedRow.wrvu_n_incumbents);
    blendedRow.cf_n_orgs = Math.round(blendedRow.cf_n_orgs);
    blendedRow.cf_n_incumbents = Math.round(blendedRow.cf_n_incumbents);
    
    blendedData.push(blendedRow);
  });
  
  return blendedData;
};

/**
 * Weighted year blending (weight by sample size)
 */
const blendYearsWithWeight = (
  yearAggregations: Map<string, AggregatedData[]>,
  blendingConfig: YearBlendingConfig
): AggregatedData[] => {
  console.log('🔍 MultiYearBlending: Using weighted blending (by sample size)');
  
  // Calculate total weight (sample size) for each year
  const yearWeights = new Map<string, number>();
  blendingConfig.years.forEach(yearItem => {
    const yearData = yearAggregations.get(yearItem.year) || [];
    const totalSampleSize = yearData.reduce((sum, row) => sum + row.tcc_n_incumbents, 0);
    yearWeights.set(yearItem.year, totalSampleSize);
  });
  
  const totalWeight = Array.from(yearWeights.values()).reduce((sum, w) => sum + w, 0);
  
  // Get all unique specialties
  const allSpecialties = new Set<string>();
  yearAggregations.forEach(yearData => {
    yearData.forEach(row => allSpecialties.add(row.surveySpecialty));
  });
  
  // Blend each specialty
  const blendedData: AggregatedData[] = [];
  
  allSpecialties.forEach(specialty => {
    const blendedRow: AggregatedData = {
      standardizedName: specialty,
      surveySpecialty: specialty,
      originalSpecialty: specialty,
      surveySource: 'Multi-Year Weighted',
      geographicRegion: 'Multi-Year Blend',
      providerType: 'Multi-Year Blend',
      surveyYear: blendingConfig.years.map(y => y.year).join(' + '),
      
      tcc_n_orgs: 0, tcc_n_incumbents: 0,
      tcc_p25: 0, tcc_p50: 0, tcc_p75: 0, tcc_p90: 0,
      wrvu_n_orgs: 0, wrvu_n_incumbents: 0,
      wrvu_p25: 0, wrvu_p50: 0, wrvu_p75: 0, wrvu_p90: 0,
      cf_n_orgs: 0, cf_n_incumbents: 0,
      cf_p25: 0, cf_p50: 0, cf_p75: 0, cf_p90: 0
    };
    
    // Apply sample size weighting
    blendingConfig.years.forEach(yearItem => {
      const yearData = yearAggregations.get(yearItem.year) || [];
      const specialtyRow = yearData.find(r => r.surveySpecialty === specialty);
      const yearWeight = yearWeights.get(yearItem.year) || 0;
      
      if (specialtyRow && totalWeight > 0) {
        const weight = yearWeight / totalWeight;
        
        // Apply weighted blending
        blendedRow.tcc_n_orgs += specialtyRow.tcc_n_orgs * weight;
        blendedRow.tcc_n_incumbents += specialtyRow.tcc_n_incumbents * weight;
        blendedRow.tcc_p25 += specialtyRow.tcc_p25 * weight;
        blendedRow.tcc_p50 += specialtyRow.tcc_p50 * weight;
        blendedRow.tcc_p75 += specialtyRow.tcc_p75 * weight;
        blendedRow.tcc_p90 += specialtyRow.tcc_p90 * weight;
        
        blendedRow.wrvu_n_orgs += specialtyRow.wrvu_n_orgs * weight;
        blendedRow.wrvu_n_incumbents += specialtyRow.wrvu_n_incumbents * weight;
        blendedRow.wrvu_p25 += specialtyRow.wrvu_p25 * weight;
        blendedRow.wrvu_p50 += specialtyRow.wrvu_p50 * weight;
        blendedRow.wrvu_p75 += specialtyRow.wrvu_p75 * weight;
        blendedRow.wrvu_p90 += specialtyRow.wrvu_p90 * weight;
        
        blendedRow.cf_n_orgs += specialtyRow.cf_n_orgs * weight;
        blendedRow.cf_n_incumbents += specialtyRow.cf_n_incumbents * weight;
        blendedRow.cf_p25 += specialtyRow.cf_p25 * weight;
        blendedRow.cf_p50 += specialtyRow.cf_p50 * weight;
        blendedRow.cf_p75 += specialtyRow.cf_p75 * weight;
        blendedRow.cf_p90 += specialtyRow.cf_p90 * weight;
      }
    });
    
    // Round counts
    blendedRow.tcc_n_orgs = Math.round(blendedRow.tcc_n_orgs);
    blendedRow.tcc_n_incumbents = Math.round(blendedRow.tcc_n_incumbents);
    blendedRow.wrvu_n_orgs = Math.round(blendedRow.wrvu_n_orgs);
    blendedRow.wrvu_n_incumbents = Math.round(blendedRow.wrvu_n_incumbents);
    blendedRow.cf_n_orgs = Math.round(blendedRow.cf_n_orgs);
    blendedRow.cf_n_incumbents = Math.round(blendedRow.cf_n_incumbents);
    
    blendedData.push(blendedRow);
  });
  
  return blendedData;
};

/**
 * Equal year blending (simple average)
 */
const blendYearsEqually = (
  yearAggregations: Map<string, AggregatedData[]>,
  blendingConfig: YearBlendingConfig
): AggregatedData[] => {
  console.log('🔍 MultiYearBlending: Using equal blending (simple average)');
  
  const yearCount = blendingConfig.years.length;
  const weight = 1 / yearCount;
  
  // Get all unique specialties
  const allSpecialties = new Set<string>();
  yearAggregations.forEach(yearData => {
    yearData.forEach(row => allSpecialties.add(row.surveySpecialty));
  });
  
  // Blend each specialty
  const blendedData: AggregatedData[] = [];
  
  allSpecialties.forEach(specialty => {
    const blendedRow: AggregatedData = {
      standardizedName: specialty,
      surveySpecialty: specialty,
      originalSpecialty: specialty,
      surveySource: 'Multi-Year Equal',
      geographicRegion: 'Multi-Year Blend',
      providerType: 'Multi-Year Blend',
      surveyYear: blendingConfig.years.map(y => y.year).join(' + '),
      
      tcc_n_orgs: 0, tcc_n_incumbents: 0,
      tcc_p25: 0, tcc_p50: 0, tcc_p75: 0, tcc_p90: 0,
      wrvu_n_orgs: 0, wrvu_n_incumbents: 0,
      wrvu_p25: 0, wrvu_p50: 0, wrvu_p75: 0, wrvu_p90: 0,
      cf_n_orgs: 0, cf_n_incumbents: 0,
      cf_p25: 0, cf_p50: 0, cf_p75: 0, cf_p90: 0
    };
    
    // Apply equal weighting
    blendingConfig.years.forEach(yearItem => {
      const yearData = yearAggregations.get(yearItem.year) || [];
      const specialtyRow = yearData.find(r => r.surveySpecialty === specialty);
      
      if (specialtyRow) {
        blendedRow.tcc_n_orgs += specialtyRow.tcc_n_orgs * weight;
        blendedRow.tcc_n_incumbents += specialtyRow.tcc_n_incumbents * weight;
        blendedRow.tcc_p25 += specialtyRow.tcc_p25 * weight;
        blendedRow.tcc_p50 += specialtyRow.tcc_p50 * weight;
        blendedRow.tcc_p75 += specialtyRow.tcc_p75 * weight;
        blendedRow.tcc_p90 += specialtyRow.tcc_p90 * weight;
        
        blendedRow.wrvu_n_orgs += specialtyRow.wrvu_n_orgs * weight;
        blendedRow.wrvu_n_incumbents += specialtyRow.wrvu_n_incumbents * weight;
        blendedRow.wrvu_p25 += specialtyRow.wrvu_p25 * weight;
        blendedRow.wrvu_p50 += specialtyRow.wrvu_p50 * weight;
        blendedRow.wrvu_p75 += specialtyRow.wrvu_p75 * weight;
        blendedRow.wrvu_p90 += specialtyRow.wrvu_p90 * weight;
        
        blendedRow.cf_n_orgs += specialtyRow.cf_n_orgs * weight;
        blendedRow.cf_n_incumbents += specialtyRow.cf_n_incumbents * weight;
        blendedRow.cf_p25 += specialtyRow.cf_p25 * weight;
        blendedRow.cf_p50 += specialtyRow.cf_p50 * weight;
        blendedRow.cf_p75 += specialtyRow.cf_p75 * weight;
        blendedRow.cf_p90 += specialtyRow.cf_p90 * weight;
      }
    });
    
    // Round counts
    blendedRow.tcc_n_orgs = Math.round(blendedRow.tcc_n_orgs);
    blendedRow.tcc_n_incumbents = Math.round(blendedRow.tcc_n_incumbents);
    blendedRow.wrvu_n_orgs = Math.round(blendedRow.wrvu_n_orgs);
    blendedRow.wrvu_n_incumbents = Math.round(blendedRow.wrvu_n_incumbents);
    blendedRow.cf_n_orgs = Math.round(blendedRow.cf_n_orgs);
    blendedRow.cf_n_incumbents = Math.round(blendedRow.cf_n_incumbents);
    
    blendedData.push(blendedRow);
  });
  
  return blendedData;
};

/**
 * Build year breakdown for transparency
 */
const buildYearBreakdown = (
  yearAggregations: Map<string, AggregatedData[]>,
  blendingConfig: YearBlendingConfig
): { [year: string]: any } => {
  const breakdown: { [year: string]: any } = {};
  
  blendingConfig.years.forEach(yearItem => {
    const yearData = yearAggregations.get(yearItem.year) || [];
    const sampleSize = yearData.reduce((sum, row) => sum + row.tcc_n_incumbents, 0);
    const surveyCount = new Set(yearData.map(r => r.surveySource)).size;
    
    breakdown[yearItem.year] = {
      data: yearData,
      sampleSize,
      surveyCount,
      contribution: yearItem.percentage || 0
    };
  });
  
  return breakdown;
};

/**
 * Calculate blending confidence based on sample sizes and data quality
 */
const calculateBlendingConfidence = (
  yearAggregations: Map<string, AggregatedData[]>,
  blendingConfig: YearBlendingConfig
): number => {
  // Factors: sample size, year count, data consistency
  
  const totalSampleSize = Array.from(yearAggregations.values()).reduce((sum, yearData) => {
    return sum + yearData.reduce((s, row) => s + row.tcc_n_incumbents, 0);
  }, 0);
  
  const yearCount = blendingConfig.years.length;
  
  // Base confidence on sample size (0-1 scale)
  let confidence = Math.min(totalSampleSize / 1000, 1.0); // Max at 1000+ incumbents
  
  // Adjust for year count (more years = slightly lower confidence)
  confidence *= (1 - (yearCount - 1) * 0.05);
  
  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
};

/**
 * Generate quality warnings
 */
const generateQualityWarnings = (
  yearAggregations: Map<string, AggregatedData[]>,
  blendingConfig: YearBlendingConfig,
  confidence: number
): string[] => {
  const warnings: string[] = [];
  
  // Check for low confidence
  if (confidence < 0.5) {
    warnings.push('Low confidence: Limited sample size across years');
  }
  
  // Check for missing years
  blendingConfig.years.forEach(yearItem => {
    const yearData = yearAggregations.get(yearItem.year);
    if (!yearData || yearData.length === 0) {
      warnings.push(`No data available for year ${yearItem.year}`);
    }
  });
  
  // Check for imbalanced sample sizes
  const sampleSizes = blendingConfig.years.map(yearItem => {
    const yearData = yearAggregations.get(yearItem.year) || [];
    return yearData.reduce((sum, row) => sum + row.tcc_n_incumbents, 0);
  });
  
  const maxSampleSize = Math.max(...sampleSizes);
  const minSampleSize = Math.min(...sampleSizes);
  
  if (maxSampleSize > 0 && minSampleSize / maxSampleSize < 0.3) {
    warnings.push('Imbalanced sample sizes across years - consider using weighted blending');
  }
  
  return warnings;
};

