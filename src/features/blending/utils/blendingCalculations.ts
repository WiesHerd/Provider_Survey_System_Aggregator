/**
 * Blending Calculations Utility
 * 
 * Handles all blending calculation logic
 */

import { generatePieChartHTML, generateBarChartHTML, WeightDistributionData, CompensationRangeData } from './chartGenerators';

export interface BlendedMetrics {
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
  totalRecords: number;
  specialties: string[];
  method: 'weighted' | 'simple' | 'custom';
}

export type BlendingMethod = 'weighted' | 'simple' | 'custom';

/**
 * Validates a blend configuration
 * 
 * @param specialties - Array of specialty items
 * @param totalWeight - Total weight percentage
 * @returns Validation result
 */
export const validateBlend = (specialties: any[], totalWeight: number = 100): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalWeight: number;
  missingSpecialties: string[];
  duplicateSpecialties: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingSpecialties: string[] = [];
  const duplicateSpecialties: string[] = [];

  // Check if specialties exist
  if (!specialties || specialties.length === 0) {
    errors.push('At least one specialty must be selected');
    return {
      isValid: false,
      errors,
      warnings,
      totalWeight: 0,
      missingSpecialties,
      duplicateSpecialties
    };
  }

  // Check for duplicates
  const specialtyNames = specialties.map(s => s.name);
  const uniqueNames = new Set(specialtyNames);
  if (uniqueNames.size !== specialtyNames.length) {
    const duplicates = specialtyNames.filter((name, index) => specialtyNames.indexOf(name) !== index);
    duplicateSpecialties.push(...duplicates);
    errors.push(`Duplicate specialties found: ${duplicates.join(', ')}`);
  }

  // Check total weight
  const actualTotalWeight = specialties.reduce((sum, s) => sum + (s.weight || 0), 0);
  if (Math.abs(actualTotalWeight - totalWeight) > 0.1) {
    warnings.push(`Total weight is ${actualTotalWeight.toFixed(1)}%, expected ${totalWeight}%`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalWeight: actualTotalWeight,
    missingSpecialties,
    duplicateSpecialties
  };
};

/**
 * Normalizes weights to ensure they sum to 100%
 * 
 * @param weights - Array of weights
 * @returns Normalized weights array
 */
export const normalizeWeights = (weights: number[]): number[] => {
  if (weights.length === 0) return [];
  
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) {
    // If all weights are 0, distribute equally
    return weights.map(() => 100 / weights.length);
  }
  
  return weights.map(weight => (weight / total) * 100);
};

/**
 * Normalizes weights for specialty items to ensure they sum to 100%
 * 
 * @param specialties - Array of specialty items
 * @returns Array of specialty items with normalized weights
 */
export const normalizeSpecialtyWeights = (specialties: any[]): any[] => {
  if (specialties.length === 0) return [];
  
  const totalWeight = specialties.reduce((sum, specialty) => sum + (specialty.weight || 0), 0);
  if (totalWeight === 0) {
    // If all weights are 0, distribute equally
    const equalWeight = 100 / specialties.length;
    return specialties.map(specialty => ({ ...specialty, weight: equalWeight }));
  }
  
  return specialties.map(specialty => ({
    ...specialty,
    weight: ((specialty.weight || 0) / totalWeight) * 100
  }));
};

/**
 * Calculates weighted average for a set of values
 * 
 * @param values - Array of values
 * @param weights - Array of weights
 * @returns Weighted average
 */
export const calculateWeightedAverage = (values: number[], weights: number[]): number => {
  if (values.length !== weights.length || values.length === 0) {
    return 0;
  }
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = values.reduce((sum, value, index) => {
    return sum + (value * weights[index]);
  }, 0);
  
  return weightedSum / totalWeight;
};

/**
 * Calculates confidence score for a blend
 * 
 * @param specialties - Array of specialty items
 * @param data - Survey data
 * @returns Confidence score (0-1)
 */
export const calculateConfidence = (specialties: any[], data: any[]): number => {
  if (!specialties || specialties.length === 0 || !data || data.length === 0) {
    return 0;
  }
  
  // Simple confidence calculation based on sample size and data quality
  const totalRecords = data.reduce((sum, row) => sum + (row.tcc_n_orgs || 0), 0);
  const avgRecordsPerSpecialty = totalRecords / specialties.length;
  
  // Confidence based on sample size (more records = higher confidence)
  const sampleSizeConfidence = Math.min(avgRecordsPerSpecialty / 100, 1);
  
  // Confidence based on data completeness
  const completeDataPoints = data.filter(row => 
    row.tcc_p50 && row.wrvu_p50 && row.cf_p50
  ).length;
  const dataQualityConfidence = completeDataPoints / data.length;
  
  // Combined confidence score
  return (sampleSizeConfidence + dataQualityConfidence) / 2;
};

/**
 * Generates a unique blend ID
 * 
 * @returns Unique blend ID
 */
export const generateBlendId = (): string => {
  return `blend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Formats a weight value for display
 * 
 * @param weight - Weight value
 * @param precision - Decimal places
 * @returns Formatted weight string
 */
export const formatWeight = (weight: number, precision: number = 1): string => {
  return `${weight.toFixed(precision)}%`;
};

/**
 * Checks if weights are balanced (sum to 100%)
 * 
 * @param weights - Array of weights
 * @param tolerance - Tolerance for balance check
 * @returns True if weights are balanced
 */
export const areWeightsBalanced = (weights: number[], tolerance: number = 0.1): boolean => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return Math.abs(total - 100) <= tolerance;
};

/**
 * Calculates blended metrics for selected specialties (legacy signature)
 * 
 * @param specialties - Array of specialty items
 * @param data - Survey data
 * @returns Blended metrics or null if no data selected
 */
export const calculateBlendedMetrics = (
  specialties: any[],
  data: any[]
): BlendedMetrics | null => {
  if (!specialties || specialties.length === 0 || !data || data.length === 0) {
    return null;
  }

  const blended: BlendedMetrics = {
    tcc_p25: 0,
    tcc_p50: 0,
    tcc_p75: 0,
    tcc_p90: 0,
    wrvu_p25: 0,
    wrvu_p50: 0,
    wrvu_p75: 0,
    wrvu_p90: 0,
    cf_p25: 0,
    cf_p50: 0,
    cf_p75: 0,
    cf_p90: 0,
    totalRecords: 0,
    specialties: specialties.map(s => s.name),
    method: 'weighted'
  };

  // Calculate weights based on records
  const totalRecords = specialties.reduce((sum, s) => sum + (s.records || 0), 0);
  if (totalRecords === 0) return null;

  specialties.forEach(specialty => {
    const weight = (specialty.records || 0) / totalRecords;
    
    // Find matching data row
    const dataRow = data.find(row => 
      row.surveySpecialty === specialty.name &&
      row.surveySource === specialty.surveySource &&
      row.surveyYear === specialty.surveyYear
    );
    
    if (dataRow) {
      // TCC metrics
      blended.tcc_p25 += (dataRow.tcc_p25 || 0) * weight;
      blended.tcc_p50 += (dataRow.tcc_p50 || 0) * weight;
      blended.tcc_p75 += (dataRow.tcc_p75 || 0) * weight;
      blended.tcc_p90 += (dataRow.tcc_p90 || 0) * weight;
      
      // wRVU metrics
      blended.wrvu_p25 += (dataRow.wrvu_p25 || 0) * weight;
      blended.wrvu_p50 += (dataRow.wrvu_p50 || 0) * weight;
      blended.wrvu_p75 += (dataRow.wrvu_p75 || 0) * weight;
      blended.wrvu_p90 += (dataRow.wrvu_p90 || 0) * weight;
      
      // CF metrics
      blended.cf_p25 += (dataRow.cf_p25 || 0) * weight;
      blended.cf_p50 += (dataRow.cf_p50 || 0) * weight;
      blended.cf_p75 += (dataRow.cf_p75 || 0) * weight;
      blended.cf_p90 += (dataRow.cf_p90 || 0) * weight;
      
      blended.totalRecords += dataRow.tcc_n_orgs || 0;
    }
  });

  return blended;
};

/**
 * Calculates blended metrics for selected specialties (new signature)
 * 
 * @param selectedDataRows - Array of row indices that are selected
 * @param filteredSurveyData - The filtered survey data
 * @param blendingMethod - The method to use for blending
 * @param customWeights - Custom weights for each row (only used for custom method)
 * @returns Blended metrics or null if no data selected
 */
export const calculateBlendedMetricsNew = (
  selectedDataRows: number[],
  filteredSurveyData: any[],
  blendingMethod: BlendingMethod,
  customWeights: Record<number, number> = {}
): BlendedMetrics | null => {
  if (selectedDataRows.length === 0) {
    return null;
  }

  const selectedData = selectedDataRows.map(index => filteredSurveyData[index]).filter(row => row);
  
  const blended: BlendedMetrics = {
    tcc_p25: 0,
    tcc_p50: 0,
    tcc_p75: 0,
    tcc_p90: 0,
    wrvu_p25: 0,
    wrvu_p50: 0,
    wrvu_p75: 0,
    wrvu_p90: 0,
    cf_p25: 0,
    cf_p50: 0,
    cf_p75: 0,
    cf_p90: 0,
    totalRecords: 0,
    specialties: selectedData.map(row => row.surveySpecialty),
    method: blendingMethod
  };

  // Calculate weights based on blending method
  let weights: number[] = [];
  
  if (blendingMethod === 'weighted') {
    // Weight by incumbent count (number of people)
    const totalIncumbents = selectedData.reduce((sum, row) => sum + (row.tcc_n_incumbents || 0), 0);
    
    
    if (totalIncumbents === 0) {
      // Fallback to equal weights if no incumbent data available
      console.warn('No incumbent data available for weighted average, falling back to equal weights');
      weights = selectedData.map(() => 1 / selectedData.length);
    } else {
      weights = selectedData.map(row => (row.tcc_n_incumbents || 0) / totalIncumbents);
    }
    
    blended.totalRecords = selectedData.reduce((sum, row) => sum + (row.tcc_n_orgs || 0), 0);
  } else if (blendingMethod === 'simple') {
    // Equal weights
    weights = selectedData.map(() => 1 / selectedData.length);
    blended.totalRecords = selectedData.reduce((sum, row) => sum + (row.tcc_n_orgs || 0), 0);
  } else if (blendingMethod === 'custom') {
    // Custom weights from user input
    const totalCustomWeight = selectedDataRows.reduce((sum, index) => sum + (customWeights[index] || 0), 0);
    if (totalCustomWeight === 0) {
      // Fallback to equal weights if no custom weights set
      weights = selectedData.map(() => 1 / selectedData.length);
    } else {
      weights = selectedDataRows.map(index => (customWeights[index] || 0) / totalCustomWeight);
    }
    blended.totalRecords = selectedData.reduce((sum, row) => sum + (row.tcc_n_orgs || 0), 0);
  }

  selectedData.forEach((row, index) => {
    const weight = weights[index] || 0;
    
    // TCC metrics
    blended.tcc_p25 += (row.tcc_p25 || 0) * weight;
    blended.tcc_p50 += (row.tcc_p50 || 0) * weight;
    blended.tcc_p75 += (row.tcc_p75 || 0) * weight;
    blended.tcc_p90 += (row.tcc_p90 || 0) * weight;
    
    // wRVU metrics
    blended.wrvu_p25 += (row.wrvu_p25 || 0) * weight;
    blended.wrvu_p50 += (row.wrvu_p50 || 0) * weight;
    blended.wrvu_p75 += (row.wrvu_p75 || 0) * weight;
    blended.wrvu_p90 += (row.wrvu_p90 || 0) * weight;
    
    // CF metrics
    blended.cf_p25 += (row.cf_p25 || 0) * weight;
    blended.cf_p50 += (row.cf_p50 || 0) * weight;
    blended.cf_p75 += (row.cf_p75 || 0) * weight;
    blended.cf_p90 += (row.cf_p90 || 0) * weight;
  });
  
  // Round to 2 decimal places for currency and percentage values
  blended.tcc_p25 = Math.round(blended.tcc_p25 * 100) / 100;
  blended.tcc_p50 = Math.round(blended.tcc_p50 * 100) / 100;
  blended.tcc_p75 = Math.round(blended.tcc_p75 * 100) / 100;
  blended.tcc_p90 = Math.round(blended.tcc_p90 * 100) / 100;
  
  blended.wrvu_p25 = Math.round(blended.wrvu_p25 * 100) / 100;
  blended.wrvu_p50 = Math.round(blended.wrvu_p50 * 100) / 100;
  blended.wrvu_p75 = Math.round(blended.wrvu_p75 * 100) / 100;
  blended.wrvu_p90 = Math.round(blended.wrvu_p90 * 100) / 100;
  
  blended.cf_p25 = Math.round(blended.cf_p25 * 100) / 100;
  blended.cf_p50 = Math.round(blended.cf_p50 * 100) / 100;
  blended.cf_p75 = Math.round(blended.cf_p75 * 100) / 100;
  blended.cf_p90 = Math.round(blended.cf_p90 * 100) / 100;


  return blended;
};

/**
 * Generates chart data for HTML reports
 * 
 * @param blendedMetrics - The calculated blended metrics
 * @param blendingMethod - The blending method used
 * @param selectedDataRows - Selected row indices
 * @param filteredSurveyData - The filtered survey data
 * @param customWeights - Custom weights if applicable
 * @returns Chart data object
 */
export const generateChartData = (
  blendedMetrics: BlendedMetrics,
  blendingMethod: BlendingMethod,
  selectedDataRows: number[] = [],
  filteredSurveyData: any[] = [],
  customWeights: Record<number, number> = {}
) => {
  const selectedData = selectedDataRows.map(index => filteredSurveyData[index]).filter(row => row);
  
  // Prepare weight distribution data
  const weightDistributionData = selectedData.map((row, index) => {
    let weight = 0;
    
    if (blendingMethod === 'simple') {
      weight = 100 / selectedData.length;
    } else if (blendingMethod === 'weighted') {
      const totalIncumbents = selectedData.reduce((sum, r) => sum + (r.tcc_n_incumbents || 0), 0);
      weight = totalIncumbents > 0 ? ((row.tcc_n_incumbents || 0) / totalIncumbents) * 100 : 100 / selectedData.length;
    } else if (blendingMethod === 'custom') {
      const totalCustomWeight = selectedDataRows.reduce((sum, idx) => sum + (customWeights[idx] || 0), 0);
      weight = totalCustomWeight > 0 ? ((customWeights[index] || 0) / totalCustomWeight) * 100 : 100 / selectedData.length;
    }
    
    return {
      specialty: row.surveySpecialty,
      weight: weight,
      records: row.tcc_n_orgs || row.n_orgs || 0
    };
  });

  return {
    weightDistribution: weightDistributionData,
    compensationRange: {
      tcc: {
        p25: blendedMetrics.tcc_p25,
        p50: blendedMetrics.tcc_p50,
        p75: blendedMetrics.tcc_p75,
        p90: blendedMetrics.tcc_p90
      },
      wrvu: {
        p25: blendedMetrics.wrvu_p25,
        p50: blendedMetrics.wrvu_p50,
        p75: blendedMetrics.wrvu_p75,
        p90: blendedMetrics.wrvu_p90
      },
      cf: {
        p25: blendedMetrics.cf_p25,
        p50: blendedMetrics.cf_p50,
        p75: blendedMetrics.cf_p75,
        p90: blendedMetrics.cf_p90
      }
    }
  };
};

/**
 * Generates HTML report content for blended metrics
 * 
 * @param blendedMetrics - The calculated blended metrics
 * @param blendingMethod - The blending method used
 * @param customWeights - Custom weights if applicable
 * @param selectedDataRows - Selected row indices
 * @param filteredSurveyData - The filtered survey data
 * @returns HTML content string
 */
export const generateBlendedReportHTML = (
  blendedMetrics: BlendedMetrics,
  blendingMethod: BlendingMethod,
  customWeights: Record<number, number> = {},
  selectedDataRows: number[] = [],
  filteredSurveyData: any[] = []
): string => {
  const reportData = {
    title: 'Blended Compensation Report',
    generatedAt: new Date().toLocaleString(),
    blendMethod: blendingMethod,
    specialties: blendedMetrics.specialties,
    totalRecords: blendedMetrics.totalRecords,
    // Include custom weights for transparency when custom blending is used
    customWeights: blendingMethod === 'custom' ? selectedDataRows.map((index, i) => {
      const row = filteredSurveyData[index];
      const weight = customWeights[index] || 0;
      return {
        specialty: row?.surveySpecialty || 'Unknown',
        weight: weight,
        records: row?.tcc_n_orgs || row?.n_orgs || 0
      };
    }).filter(item => item.specialty !== 'Unknown') : null,
    metrics: {
      tcc: {
        p25: blendedMetrics.tcc_p25,
        p50: blendedMetrics.tcc_p50,
        p75: blendedMetrics.tcc_p75,
        p90: blendedMetrics.tcc_p90
      },
      wrvu: {
        p25: blendedMetrics.wrvu_p25,
        p50: blendedMetrics.wrvu_p50,
        p75: blendedMetrics.wrvu_p75,
        p90: blendedMetrics.wrvu_p90
      },
      cf: {
        p25: blendedMetrics.cf_p25,
        p50: blendedMetrics.cf_p50,
        p75: blendedMetrics.cf_p75,
        p90: blendedMetrics.cf_p90
      }
    }
  };
  
  // Generate chart data and SVGs
  const selectedData = selectedDataRows.map(index => filteredSurveyData[index]).filter(row => row);
  
  // Prepare weight distribution data for pie chart (for weighted and custom methods)
  let weightDistributionData: WeightDistributionData[] = [];
  if (blendingMethod === 'weighted' || blendingMethod === 'custom') {
    weightDistributionData = selectedData.map((row, index) => {
      let weight = 0;
      
      if (blendingMethod === 'weighted') {
        const totalIncumbents = selectedData.reduce((sum, r) => sum + (r.tcc_n_incumbents || 0), 0);
        weight = totalIncumbents > 0 ? ((row.tcc_n_incumbents || 0) / totalIncumbents) * 100 : 100 / selectedData.length;
      } else if (blendingMethod === 'custom') {
        const totalCustomWeight = selectedDataRows.reduce((sum, idx) => sum + (customWeights[idx] || 0), 0);
        weight = totalCustomWeight > 0 ? ((customWeights[index] || 0) / totalCustomWeight) * 100 : 100 / selectedData.length;
      }
      
      return {
        specialty: row.surveySpecialty,
        weight: weight,
        records: row.tcc_n_orgs || row.n_orgs || 0
      };
    });
  }
  
  // Prepare compensation range data for bar chart
  const compensationRangeData: CompensationRangeData = {
    tcc: {
      p25: blendedMetrics.tcc_p25,
      p50: blendedMetrics.tcc_p50,
      p75: blendedMetrics.tcc_p75,
      p90: blendedMetrics.tcc_p90
    },
    wrvu: {
      p25: blendedMetrics.wrvu_p25,
      p50: blendedMetrics.wrvu_p50,
      p75: blendedMetrics.wrvu_p75,
      p90: blendedMetrics.wrvu_p90
    },
    cf: {
      p25: blendedMetrics.cf_p25,
      p50: blendedMetrics.cf_p50,
      p75: blendedMetrics.cf_p75,
      p90: blendedMetrics.cf_p90
    }
  };
  
  // Debug the compensation data
  console.log('🔍 compensationRangeData:', compensationRangeData);
  console.log('🔍 TCC values:', [compensationRangeData.tcc.p25, compensationRangeData.tcc.p50, compensationRangeData.tcc.p75, compensationRangeData.tcc.p90]);
  console.log('🔍 wRVU values:', [compensationRangeData.wrvu.p25, compensationRangeData.wrvu.p50, compensationRangeData.wrvu.p75, compensationRangeData.wrvu.p90]);
  console.log('🔍 CF values:', [compensationRangeData.cf.p25, compensationRangeData.cf.p50, compensationRangeData.cf.p75, compensationRangeData.cf.p90]);
  
  // Generate HTML charts with Chart.js
  const weightChartHTML = (blendingMethod === 'weighted' || blendingMethod === 'custom') && weightDistributionData.length > 0
    ? generatePieChartHTML(
        weightDistributionData,
        blendingMethod === 'weighted' 
          ? 'Weight Distribution (by Incumbent Count)'
          : 'Custom Weight Distribution',
        400,
        350
      )
    : '';
    
  const compensationChartHTML = generateBarChartHTML(
    compensationRangeData,
    'Compensation Range Analysis',
    600,
    400
  );
  
  // Test if the HTML is being generated
  console.log('🔍 compensationChartHTML generated:', compensationChartHTML.length > 0);
  console.log('🔍 compensationChartHTML preview:', compensationChartHTML.substring(0, 200));
  
  // Debug logging
  console.log('🔍 weightChartHTML length:', weightChartHTML.length);
  console.log('🔍 compensationChartHTML length:', compensationChartHTML.length);
  console.log('🔍 blendingMethod:', blendingMethod);
  console.log('🔍 weightDistributionData length:', weightDistributionData.length);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Blended Compensation Report</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        * {
          font-family: inherit;
        }
        
        @media print {
          body { margin: 0; padding: 0.25in; }
          .no-print { display: none; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          .footer { page-break-inside: avoid; }
          @page {
            margin: 0.25in;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left { content: ""; }
            @bottom-center { content: ""; }
            @bottom-right { content: ""; }
          }
        }
        
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 0; 
          padding: 20px; 
          line-height: 1.5; 
          color: #333; 
          background: white;
        }
        .header { 
          border-bottom: 2px solid #6366f1; 
          padding-bottom: 15px; 
          margin-bottom: 20px; 
          margin-top: 0;
        }
        .title { 
          font-size: 28px; 
          font-weight: bold; 
          color: #1f2937; 
          margin: 0; 
        }
        .subtitle { 
          font-size: 16px; 
          color: #6b7280; 
          margin: 8px 0 0 0; 
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          margin: 20px 0; 
        }
        .info-item { 
          background: #f9fafb; 
          padding: 15px; 
          border-radius: 8px; 
          border: 1px solid #e5e7eb;
        }
        .info-label { 
          font-weight: 600; 
          color: #374151; 
          margin-bottom: 5px; 
        }
        .info-value { 
          color: #6b7280; 
        }
        .metrics-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
          page-break-inside: avoid;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
        }
        .metrics-table th { 
          background: #f3f4f6; 
          padding: 8px; 
          text-align: left; 
          font-weight: 600; 
          color: #374151; 
          border: 1px solid #d1d5db; 
        }
        .metrics-table td { 
          padding: 8px; 
          border: 1px solid #d1d5db; 
        }
        .metrics-table tr:nth-child(even) { 
          background: #f9fafb; 
        }
        .metric-name { 
          font-weight: 600; 
        }
        .percentile-value { 
          text-align: right; 
          font-family: 'SF Mono', Monaco, monospace; 
        }
        .p50 { 
          font-weight: bold; 
          background: #fef3c7; 
        }
        .footer { 
          margin-top: 20px; 
          padding-top: 15px; 
          border-top: 1px solid #e5e7eb; 
          color: #6b7280; 
          font-size: 12px; 
          page-break-inside: avoid;
        }
        .chart-section { 
          margin: 30px 0; 
          page-break-inside: avoid;
        }
        .chart-container { 
          display: flex; 
          justify-content: center; 
          align-items: center;
          margin: 20px 0; 
          background: #f9fafb; 
          border: 1px solid #e5e7eb; 
          border-radius: 8px; 
          padding: 20px;
          height: 320px;
          box-sizing: border-box;
          overflow: hidden;
        }
        .chart-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .chart-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 30px; 
          margin: 20px 0;
          align-items: start;
        }
        .chart-single { 
          display: flex; 
          justify-content: center; 
          margin: 20px 0;
        }
        .chart-title { 
          font-size: 18px; 
          font-weight: 600; 
          color: #1f2937; 
          margin-bottom: 15px; 
          text-align: center;
        }
        .chart-placeholder { 
          text-align: center; 
          color: #6b7280; 
          font-style: italic; 
          padding: 40px;
        }
        @media print {
          .chart-container { 
            background: white; 
            border: 1px solid #d1d5db;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">Blended Compensation Report</h1>
        <p class="subtitle">Generated on ${reportData.generatedAt}</p>
      </div>
      
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Blending Method</div>
          <div class="info-value">${reportData.blendMethod === 'weighted' ? 'Weighted by incumbent count' : reportData.blendMethod === 'simple' ? 'Simple average (equal weights)' : 'Custom weights applied'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Specialties Included</div>
          <div class="info-value">${reportData.specialties.join(', ')} (${reportData.totalRecords.toLocaleString()} records)</div>
        </div>
      </div>
      
      <!-- Charts Section -->
      <div class="chart-section">
        ${weightChartHTML && compensationChartHTML ? `
          <div class="chart-grid">
            <div class="chart-container">
              ${weightChartHTML}
            </div>
            <div class="chart-container">
              ${compensationChartHTML}
            </div>
          </div>
        ` : compensationChartHTML ? `
          <div class="chart-single">
            <div class="chart-container">
              ${compensationChartHTML}
            </div>
          </div>
        ` : weightChartHTML ? `
          <div class="chart-grid">
            <div class="chart-container">
              ${weightChartHTML}
            </div>
            <div class="chart-container">
              ${compensationChartHTML || `
                <div class="chart-placeholder">
                  <p>Bar chart failed to load</p>
                  <p>Debug: compensationChartHTML length: ${compensationChartHTML ? compensationChartHTML.length : 0}</p>
                  <p>Data available: ${compensationRangeData ? 'Yes' : 'No'}</p>
                </div>
              `}
            </div>
          </div>
        ` : `
          <div class="chart-placeholder">
            <p>No charts available. Debug info:</p>
            <p>weightChartHTML: ${weightChartHTML ? 'Present' : 'Missing'}</p>
            <p>compensationChartHTML: ${compensationChartHTML ? 'Present' : 'Missing'}</p>
            <p>blendingMethod: ${blendingMethod}</p>
            <p>weightChartHTML length: ${weightChartHTML ? weightChartHTML.length : 0}</p>
            <p>compensationChartHTML length: ${compensationChartHTML ? compensationChartHTML.length : 0}</p>
            <div style="background: #f0f0f0; padding: 10px; margin: 10px 0; border: 1px solid #ccc;">
              <strong>Bar Chart HTML Preview:</strong>
              <pre style="font-size: 10px; max-height: 200px; overflow: auto;">${compensationChartHTML ? compensationChartHTML.substring(0, 500) + '...' : 'No HTML generated'}</pre>
            </div>
          </div>
        `}
        
        <!-- Chart Explanation -->
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px; color: #0c4a6e;">
          <strong>📊 Chart Note:</strong> The primary chart shows Total Cash Compensation (TCC) across all percentiles with actual dollar values. Work RVU and Conversion Factor medians are displayed as compact indicators below for reference.
        </div>
      </div>
      
      ${reportData.customWeights ? `
      <div class="custom-weights-section">
        <h3 style="color: #374151; margin: 30px 0 15px 0; font-size: 18px; font-weight: 600;">Custom Weight Distribution</h3>
        <p style="color: #6b7280; margin-bottom: 20px; font-size: 14px;">The following percentages were applied to each specialty in the blended calculation:</p>
        <table class="metrics-table" style="margin-bottom: 30px;">
          <thead>
            <tr>
              <th>Specialty</th>
              <th style="text-align: right;">Weight Applied</th>
              <th style="text-align: right;">Records</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.customWeights.map(item => `
              <tr>
                <td class="metric-name">${item.specialty}</td>
                <td class="percentile-value">${item.weight.toFixed(1)}%</td>
                <td class="percentile-value">${item.records.toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr style="background: #f3f4f6; font-weight: 600;">
              <td class="metric-name">Total</td>
              <td class="percentile-value">${reportData.customWeights.reduce((sum, item) => sum + item.weight, 0).toFixed(1)}%</td>
              <td class="percentile-value">${reportData.customWeights.reduce((sum, item) => sum + item.records, 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>P25</th>
            <th>P50 (Median)</th>
            <th>P75</th>
            <th>P90</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="metric-name">Total Cash Compensation</td>
            <td class="percentile-value">$${reportData.metrics.tcc.p25.toLocaleString()}</td>
            <td class="percentile-value p50">$${reportData.metrics.tcc.p50.toLocaleString()}</td>
            <td class="percentile-value">$${reportData.metrics.tcc.p75.toLocaleString()}</td>
            <td class="percentile-value">$${reportData.metrics.tcc.p90.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="metric-name">Work RVUs</td>
            <td class="percentile-value">${reportData.metrics.wrvu.p25.toLocaleString()}</td>
            <td class="percentile-value p50">${reportData.metrics.wrvu.p50.toLocaleString()}</td>
            <td class="percentile-value">${reportData.metrics.wrvu.p75.toLocaleString()}</td>
            <td class="percentile-value">${reportData.metrics.wrvu.p90.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="metric-name">Conversion Factor</td>
            <td class="percentile-value">$${reportData.metrics.cf.p25.toFixed(2)}</td>
            <td class="percentile-value p50">$${reportData.metrics.cf.p50.toFixed(2)}</td>
            <td class="percentile-value">$${reportData.metrics.cf.p75.toFixed(2)}</td>
            <td class="percentile-value">$${reportData.metrics.cf.p90.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="footer">
        <p>This report was generated by the Survey Aggregator system. The data represents blended compensation metrics based on the selected specialties and blending method.</p>
        ${reportData.customWeights ? `
        <p><strong>Custom Blending Methodology:</strong> This report used custom weight percentages for each specialty as shown in the Custom Weight Distribution table above. These weights were applied to calculate the blended percentiles shown in the compensation metrics.</p>
        ` : ''}
        <p><strong>Note:</strong> P50 values represent the median (50th percentile) and are highlighted for emphasis.</p>
        <p><strong>Transparency:</strong> ${reportData.blendMethod === 'custom' ? 'Custom weights are disclosed above for full transparency and reproducibility.' : 'Blending methodology is clearly indicated in the report header.'}</p>
      </div>
    </body>
    </html>
  `;
};