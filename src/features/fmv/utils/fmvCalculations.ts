import { 
  FMVFilters, 
  MarketData, 
  UserPercentiles, 
  NormalizedSurveyRow, 
  CompensationComponent,
  FMVCalculationResult,
  FMVCalculationParams,
  FMVValidationResult,
  CompareType,
  AggregationMethod,
  MarketPercentiles,
  CallPayAdjustments
} from '../types/fmv';
import { calculatePercentile } from '../../../shared/utils/calculations';

/**
 * Normalizes a survey row for FMV calculations
 * 
 * @param row - Raw survey data row
 * @param surveyMeta - Survey metadata
 * @param columnMappings - Column mapping configuration
 * @returns Normalized survey row
 */
export const normalizeSurveyRow = (
  row: any, 
  surveyMeta: any, 
  columnMappings: any = {}
): NormalizedSurveyRow => {
  // Check if this is a Call Pay survey (dataCategory or providerType)
  const isCallPaySurvey = (surveyMeta as any)?.dataCategory === 'CALL_PAY' || 
                         row.providerType === 'CALL' ||
                         (surveyMeta?.type && surveyMeta.type.toLowerCase().includes('call pay'));
  
  // Extract Call Pay percentiles - check for Call Pay specific columns first, then fallback to TCC structure
  const callPayP25 = Number(row[columnMappings.callPay_p25 || 'callPay_p25']) || 
                     (isCallPaySurvey ? Number(row[columnMappings.tcc_p25 || 'tcc_p25']) || 0 : 0);
  const callPayP50 = Number(row[columnMappings.callPay_p50 || 'callPay_p50']) || 
                     (isCallPaySurvey ? Number(row[columnMappings.tcc_p50 || 'tcc_p50']) || 0 : 0);
  const callPayP75 = Number(row[columnMappings.callPay_p75 || 'callPay_p75']) || 
                     (isCallPaySurvey ? Number(row[columnMappings.tcc_p75 || 'tcc_p75']) || 0 : 0);
  const callPayP90 = Number(row[columnMappings.callPay_p90 || 'callPay_p90']) || 
                     (isCallPaySurvey ? Number(row[columnMappings.tcc_p90 || 'tcc_p90']) || 0 : 0);
  const callPayNOrgs = Number(row[columnMappings.callPay_n_orgs || 'callPay_n_orgs']) || 
                       (isCallPaySurvey ? Number(row[columnMappings.tcc_n_orgs || 'tcc_n_orgs']) || 0 : 0);
  const callPayNIncumbents = Number(row[columnMappings.callPay_n_incumbents || 'callPay_n_incumbents']) || 
                             (isCallPaySurvey ? Number(row[columnMappings.tcc_n_incumbents || 'tcc_n_incumbents']) || 0 : 0);

  return {
    id: row.id || '',
    providerType: row[columnMappings.providerType || 'providerType'] || row.providerType || row.provider_type || '',
    geographicRegion: row[columnMappings.geographicRegion || 'geographicRegion'] || row.geographicRegion || row.geographic_region || '',
    specialty: row[columnMappings.specialty || 'specialty'] || row.specialty || row.normalizedSpecialty || '',
    normalizedSpecialty: row.normalizedSpecialty || '',
    surveySource: surveyMeta?.surveyType || '',
    year: String(row[columnMappings.year || 'year'] || row.year || surveyMeta?.surveyYear || surveyMeta?.metadata?.surveyYear || ''),
    // TCC metrics with organizational data
    tcc_n_orgs: Number(row[columnMappings.tcc_n_orgs || 'tcc_n_orgs']) || 0,
    tcc_n_incumbents: Number(row[columnMappings.tcc_n_incumbents || 'tcc_n_incumbents']) || 0,
    tcc_p25: Number(row[columnMappings.tcc_p25 || 'tcc_p25']) || 0,
    tcc_p50: Number(row[columnMappings.tcc_p50 || 'tcc_p50']) || 0,
    tcc_p75: Number(row[columnMappings.tcc_p75 || 'tcc_p75']) || 0,
    tcc_p90: Number(row[columnMappings.tcc_p90 || 'tcc_p90']) || 0,
    // wRVU metrics with organizational data
    wrvu_n_orgs: Number(row[columnMappings.wrvu_n_orgs || 'wrvu_n_orgs']) || 0,
    wrvu_n_incumbents: Number(row[columnMappings.wrvu_n_incumbents || 'wrvu_n_incumbents']) || 0,
    wrvu_p25: Number(row[columnMappings.wrvu_p25 || 'wrvu_p25']) || 0,
    wrvu_p50: Number(row[columnMappings.wrvu_p50 || 'wrvu_p50']) || 0,
    wrvu_p75: Number(row[columnMappings.wrvu_p75 || 'wrvu_p75']) || 0,
    wrvu_p90: Number(row[columnMappings.wrvu_p90 || 'wrvu_p90']) || 0,
    // CF metrics with organizational data
    cf_n_orgs: Number(row[columnMappings.cf_n_orgs || 'cf_n_orgs']) || 0,
    cf_n_incumbents: Number(row[columnMappings.cf_n_incumbents || 'cf_n_incumbents']) || 0,
    cf_p25: Number(row[columnMappings.cf_p25 || 'cf_p25']) || 0,
    cf_p50: Number(row[columnMappings.cf_p50 || 'cf_p50']) || 0,
    cf_p75: Number(row[columnMappings.cf_p75 || 'cf_p75']) || 0,
    cf_p90: Number(row[columnMappings.cf_p90 || 'cf_p90']) || 0,
    // Call Pay metrics with organizational data (with fallback to TCC for Call Pay surveys)
    callPay_n_orgs: callPayNOrgs,
    callPay_n_incumbents: callPayNIncumbents,
    callPay_p25: callPayP25,
    callPay_p50: callPayP50,
    callPay_p75: callPayP75,
    callPay_p90: callPayP90,
  };
};

/**
 * Normalizes strings for comparison
 * 
 * @param str - String to normalize
 * @returns Normalized string
 */
export const normalizeString = (str: string): string => {
  return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
};

/**
 * Applies filters to survey data
 * 
 * @param rows - Array of normalized survey rows
 * @param filters - FMV filters to apply
 * @param mappedSpecialties - Array of mapped specialty names
 * @returns Filtered rows
 */
export const applyFMVFilters = (
  rows: NormalizedSurveyRow[],
  filters: FMVFilters,
  mappedSpecialties: string[] = []
): NormalizedSurveyRow[] => {
  
  const filteredRows = rows.filter(row => {
    // Specialty filter - use fuzzy matching for specialty names (like Analytics screen)
    if (filters.specialty && filters.specialty !== '') {
      const specialtyFilters = mappedSpecialties.length > 0 
        ? mappedSpecialties 
        : [normalizeString(filters.specialty)];
      
      const rowSpecialty = normalizeString(row.specialty);
      const matches = specialtyFilters.some(filterSpecialty => 
        rowSpecialty === filterSpecialty || 
        rowSpecialty.includes(filterSpecialty) || 
        filterSpecialty.includes(rowSpecialty)
      );
      
      if (!matches) {
        return false;
      }
    }
    
    // Survey source filter (exclude "All Sources")
    if (filters.surveySource && filters.surveySource !== '' && filters.surveySource !== 'All Sources' && normalizeString(row.surveySource) !== normalizeString(filters.surveySource)) {
      return false;
    }
    
    // Geographic region filter
    if (filters.region && filters.region !== '' && filters.region !== 'All Regions' && normalizeString(row.geographicRegion) !== normalizeString(filters.region)) {
      return false;
    }
    
    // Provider type filter (exclude "All Types")
    if (filters.providerType && filters.providerType !== '' && filters.providerType !== 'All Types' && normalizeString(row.providerType) !== normalizeString(filters.providerType)) {
      return false;
    }
    
    // Year filter (exclude "All Years")
    if (filters.year && filters.year !== '' && filters.year !== 'All Years' && String(row.year) !== String(filters.year)) {
      return false;
    }
    
    return true;
  });
  
  return filteredRows;
};

/**
 * Calculates market data percentiles from filtered rows using specified aggregation method
 * 
 * @param filteredRows - Filtered survey rows (already aggregated data from AnalyticsDataService)
 * @param aggregationMethod - Method for aggregating multiple surveys ('simple' or 'weighted')
 * @returns Market data with percentiles
 */
export const calculateMarketData = (filteredRows: NormalizedSurveyRow[], aggregationMethod: AggregationMethod = 'simple'): MarketData => {
  
  if (filteredRows.length === 0) {
    return {
      tcc: { p25: 0, p50: 0, p75: 0, p90: 0 },
      wrvu: { p25: 0, p50: 0, p75: 0, p90: 0 },
      cf: { p25: 0, p50: 0, p75: 0, p90: 0 },
      callPay: { p25: 0, p50: 0, p75: 0, p90: 0 }
    };
  }

  // Always calculate both simple and weighted averages (like Analytics screen)
  // Then return the one selected by the aggregation method
  
  // Filter rows that have Call Pay data
  const callPayRows = filteredRows.filter(row => {
    const hasCallPayData = (row.callPay_p25 || row.callPay_p50 || row.callPay_p75 || row.callPay_p90);
    const hasPositiveCallPayData = (row.callPay_p25 ?? 0) > 0 || (row.callPay_p50 ?? 0) > 0 || (row.callPay_p75 ?? 0) > 0 || (row.callPay_p90 ?? 0) > 0;
    return hasCallPayData && hasPositiveCallPayData;
  });

  // Simple average - mean of all percentile values
  const simpleResult = {
    tcc: {
      p25: filteredRows.reduce((sum, row) => sum + (row.tcc_p25 || 0), 0) / filteredRows.length,
      p50: filteredRows.reduce((sum, row) => sum + (row.tcc_p50 || 0), 0) / filteredRows.length,
      p75: filteredRows.reduce((sum, row) => sum + (row.tcc_p75 || 0), 0) / filteredRows.length,
      p90: filteredRows.reduce((sum, row) => sum + (row.tcc_p90 || 0), 0) / filteredRows.length,
    },
    wrvu: {
      p25: filteredRows.reduce((sum, row) => sum + (row.wrvu_p25 || 0), 0) / filteredRows.length,
      p50: filteredRows.reduce((sum, row) => sum + (row.wrvu_p50 || 0), 0) / filteredRows.length,
      p75: filteredRows.reduce((sum, row) => sum + (row.wrvu_p75 || 0), 0) / filteredRows.length,
      p90: filteredRows.reduce((sum, row) => sum + (row.wrvu_p90 || 0), 0) / filteredRows.length,
    },
    cf: {
      p25: filteredRows.reduce((sum, row) => sum + (row.cf_p25 || 0), 0) / filteredRows.length,
      p50: filteredRows.reduce((sum, row) => sum + (row.cf_p50 || 0), 0) / filteredRows.length,
      p75: filteredRows.reduce((sum, row) => sum + (row.cf_p75 || 0), 0) / filteredRows.length,
      p90: filteredRows.reduce((sum, row) => sum + (row.cf_p90 || 0), 0) / filteredRows.length,
    },
    callPay: callPayRows.length > 0 ? {
      p25: callPayRows.reduce((sum, row) => sum + (row.callPay_p25 || 0), 0) / callPayRows.length,
      p50: callPayRows.reduce((sum, row) => sum + (row.callPay_p50 || 0), 0) / callPayRows.length,
      p75: callPayRows.reduce((sum, row) => sum + (row.callPay_p75 || 0), 0) / callPayRows.length,
      p90: callPayRows.reduce((sum, row) => sum + (row.callPay_p90 || 0), 0) / callPayRows.length,
    } : undefined,
  };

  // Weighted average - weighted by number of incumbents for each metric type
  const totalTccIncumbents = filteredRows.reduce((sum, row) => sum + (row.tcc_n_incumbents || 0), 0);
  const totalWrvuIncumbents = filteredRows.reduce((sum, row) => sum + (row.wrvu_n_incumbents || 0), 0);
  const totalCfIncumbents = filteredRows.reduce((sum, row) => sum + (row.cf_n_incumbents || 0), 0);
  const totalCallPayIncumbents = callPayRows.reduce((sum, row) => sum + (row.callPay_n_incumbents || 0), 0);
  
  const weightedResult = {
    tcc: {
      p25: totalTccIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.tcc_p25 || 0) * (row.tcc_n_incumbents || 0)), 0) / totalTccIncumbents : 0,
      p50: totalTccIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.tcc_p50 || 0) * (row.tcc_n_incumbents || 0)), 0) / totalTccIncumbents : 0,
      p75: totalTccIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.tcc_p75 || 0) * (row.tcc_n_incumbents || 0)), 0) / totalTccIncumbents : 0,
      p90: totalTccIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.tcc_p90 || 0) * (row.tcc_n_incumbents || 0)), 0) / totalTccIncumbents : 0,
    },
    wrvu: {
      p25: totalWrvuIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.wrvu_p25 || 0) * (row.wrvu_n_incumbents || 0)), 0) / totalWrvuIncumbents : 0,
      p50: totalWrvuIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.wrvu_p50 || 0) * (row.wrvu_n_incumbents || 0)), 0) / totalWrvuIncumbents : 0,
      p75: totalWrvuIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.wrvu_p75 || 0) * (row.wrvu_n_incumbents || 0)), 0) / totalWrvuIncumbents : 0,
      p90: totalWrvuIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.wrvu_p90 || 0) * (row.wrvu_n_incumbents || 0)), 0) / totalWrvuIncumbents : 0,
    },
    cf: {
      p25: totalCfIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.cf_p25 || 0) * (row.cf_n_incumbents || 0)), 0) / totalCfIncumbents : 0,
      p50: totalCfIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.cf_p50 || 0) * (row.cf_n_incumbents || 0)), 0) / totalCfIncumbents : 0,
      p75: totalCfIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.cf_p75 || 0) * (row.cf_n_incumbents || 0)), 0) / totalCfIncumbents : 0,
      p90: totalCfIncumbents > 0 ? filteredRows.reduce((sum, row) => sum + ((row.cf_p90 || 0) * (row.cf_n_incumbents || 0)), 0) / totalCfIncumbents : 0,
    },
    callPay: callPayRows.length > 0 && totalCallPayIncumbents > 0 ? {
      p25: totalCallPayIncumbents > 0 ? callPayRows.reduce((sum, row) => sum + ((row.callPay_p25 || 0) * (row.callPay_n_incumbents || 0)), 0) / totalCallPayIncumbents : 0,
      p50: totalCallPayIncumbents > 0 ? callPayRows.reduce((sum, row) => sum + ((row.callPay_p50 || 0) * (row.callPay_n_incumbents || 0)), 0) / totalCallPayIncumbents : 0,
      p75: totalCallPayIncumbents > 0 ? callPayRows.reduce((sum, row) => sum + ((row.callPay_p75 || 0) * (row.callPay_n_incumbents || 0)), 0) / totalCallPayIncumbents : 0,
      p90: totalCallPayIncumbents > 0 ? callPayRows.reduce((sum, row) => sum + ((row.callPay_p90 || 0) * (row.callPay_n_incumbents || 0)), 0) / totalCallPayIncumbents : 0,
    } : undefined,
  };

  // Handle pure survey method - use the first survey's data only
  let result;
  if (aggregationMethod === 'pure') {
    if (filteredRows.length === 1) {
      // Single survey - use its data directly
      const row = filteredRows[0];
      const hasCallPayData = (row.callPay_p25 || row.callPay_p50 || row.callPay_p75 || row.callPay_p90);
      const hasCallPay = hasCallPayData && ((row.callPay_p25 ?? 0) > 0 || (row.callPay_p50 ?? 0) > 0 || (row.callPay_p75 ?? 0) > 0 || (row.callPay_p90 ?? 0) > 0);
      result = {
        tcc: {
          p25: row.tcc_p25 || 0,
          p50: row.tcc_p50 || 0,
          p75: row.tcc_p75 || 0,
          p90: row.tcc_p90 || 0,
        },
        wrvu: {
          p25: row.wrvu_p25 || 0,
          p50: row.wrvu_p50 || 0,
          p75: row.wrvu_p75 || 0,
          p90: row.wrvu_p90 || 0,
        },
        cf: {
          p25: row.cf_p25 || 0,
          p50: row.cf_p50 || 0,
          p75: row.cf_p75 || 0,
          p90: row.cf_p90 || 0,
        },
        callPay: hasCallPay ? {
          p25: row.callPay_p25 || 0,
          p50: row.callPay_p50 || 0,
          p75: row.callPay_p75 || 0,
          p90: row.callPay_p90 || 0,
        } : undefined,
      };
    } else {
      // Multiple surveys - use the first one and warn user
      const row = filteredRows[0];
      const hasCallPayData = (row.callPay_p25 || row.callPay_p50 || row.callPay_p75 || row.callPay_p90);
      const hasCallPay = hasCallPayData && ((row.callPay_p25 ?? 0) > 0 || (row.callPay_p50 ?? 0) > 0 || (row.callPay_p75 ?? 0) > 0 || (row.callPay_p90 ?? 0) > 0);
      result = {
        tcc: {
          p25: row.tcc_p25 || 0,
          p50: row.tcc_p50 || 0,
          p75: row.tcc_p75 || 0,
          p90: row.tcc_p90 || 0,
        },
        wrvu: {
          p25: row.wrvu_p25 || 0,
          p50: row.wrvu_p50 || 0,
          p75: row.wrvu_p75 || 0,
          p90: row.wrvu_p90 || 0,
        },
        cf: {
          p25: row.cf_p25 || 0,
          p50: row.cf_p50 || 0,
          p75: row.cf_p75 || 0,
          p90: row.cf_p90 || 0,
        },
        callPay: hasCallPay ? {
          p25: row.callPay_p25 || 0,
          p50: row.callPay_p50 || 0,
          p75: row.callPay_p75 || 0,
          p90: row.callPay_p90 || 0,
        } : undefined,
      };
    }
  } else {
    // Return the selected aggregation method (simple or weighted)
    result = aggregationMethod === 'simple' ? simpleResult : weightedResult;
  }
  
  
  return result;
};

/**
 * Calculates percentile rank using linear interpolation
 * 
 * @param percentileObj - Object containing percentile values
 * @param value - Value to find percentile for
 * @returns Percentile rank (0-100) or null if invalid
 */
export const getPercentileRank = (
  percentileObj: any, 
  value: number
): number | null => {
  if (!percentileObj || value === null || value === undefined || isNaN(value)) {
    return null;
  }

  const points = [
    { p: 0, v: percentileObj.p0 ?? 0 },
    { p: 25, v: percentileObj.p25 },
    { p: 50, v: percentileObj.p50 },
    { p: 75, v: percentileObj.p75 },
    { p: 90, v: percentileObj.p90 },
    { p: 100, v: percentileObj.p100 ?? percentileObj.p90 + (percentileObj.p90 - percentileObj.p75) },
  ];

  // Below 25th percentile
  if (value < points[1].v) {
    const { p: p0, v: v0 } = points[0];
    const { p: p1, v: v1 } = points[1];
    if (v1 === v0) return p0;
    return p0 + ((value - v0) / (v1 - v0)) * (p1 - p0);
  }

  // Above 90th percentile
  if (value > points[4].v) {
    const { p: p1, v: v1 } = points[4];
    const { p: p2, v: v2 } = points[5];
    if (v2 === v1) return p1;
    return p1 + ((value - v1) / (v2 - v1)) * (p2 - p1);
  }

  // Between 25th and 90th
  for (let i = 1; i < points.length - 2; i++) {
    if (value >= points[i].v && value < points[i + 1].v) {
      const { p: p1, v: v1 } = points[i];
      const { p: p2, v: v2 } = points[i + 1];
      if (v2 === v1) return p1;
      return p1 + ((value - v1) / (v2 - v1)) * (p2 - p1);
    }
  }

  return null;
};

/**
 * Calculates user percentiles for all metrics
 * 
 * @param marketData - Market data with percentiles
 * @param tccValue - User's TCC value (FTE-adjusted)
 * @param wrvuValue - User's wRVU value (FTE-adjusted)
 * @param cfValue - User's conversion factor value
 * @param callPayValue - User's Call Pay value (FTE-adjusted, optional)
 * @returns User percentile rankings
 */
export const calculateUserPercentiles = (
  marketData: MarketData,
  tccValue: number,
  wrvuValue: number,
  cfValue: number,
  callPayValue?: number
): UserPercentiles => {
  return {
    tcc: getPercentileRank(marketData?.tcc, tccValue),
    wrvu: getPercentileRank(marketData?.wrvu, wrvuValue),
    cf: getPercentileRank(marketData?.cf, cfValue),
    callPay: callPayValue !== undefined && marketData?.callPay ? getPercentileRank(marketData.callPay, callPayValue) : null,
  };
};

/**
 * Applies Call Pay adjustments to market percentiles
 * 
 * @param marketData - Market percentiles to adjust
 * @param adjustments - Adjustment factors to apply
 * @returns Adjusted market percentiles
 */
export const applyCallPayAdjustments = (
  marketData: MarketPercentiles,
  adjustments: CallPayAdjustments
): MarketPercentiles => {
  // Calculate total multiplier from all adjustment factors
  let multiplier = 1.0;
  
  // Weekend premium (e.g., 50% = 1.5x)
  if (adjustments.weekendPremium > 0) {
    multiplier *= (1 + adjustments.weekendPremium / 100);
  }
  
  // Major holiday premium (e.g., 100% = 2x)
  if (adjustments.majorHolidayPremium > 0) {
    multiplier *= (1 + adjustments.majorHolidayPremium / 100);
  }
  
  // High-value holiday premium (e.g., 200% = 3x)
  if (adjustments.highValueHolidayPremium > 0) {
    multiplier *= (1 + adjustments.highValueHolidayPremium / 100);
  }
  
  // Frequency multiplier (e.g., 25% = 1.25x)
  if (adjustments.frequencyMultiplier > 0) {
    multiplier *= (1 + adjustments.frequencyMultiplier / 100);
  }
  
  // Acuity multiplier (e.g., 20% = 1.2x)
  if (adjustments.acuityMultiplier > 0) {
    multiplier *= (1 + adjustments.acuityMultiplier / 100);
  }
  
  return {
    p25: marketData.p25 * multiplier,
    p50: marketData.p50 * multiplier,
    p75: marketData.p75 * multiplier,
    p90: marketData.p90 * multiplier,
  };
};

/**
 * Applies Call Pay adjustments to a user input value
 * 
 * @param value - Base call pay value
 * @param adjustments - Adjustment factors to apply
 * @returns Adjusted call pay value
 */
export const applyCallPayAdjustmentsToValue = (
  value: number,
  adjustments: CallPayAdjustments
): number => {
  // Calculate total multiplier from all adjustment factors
  let multiplier = 1.0;
  
  // Weekend premium
  if (adjustments.weekendPremium > 0) {
    multiplier *= (1 + adjustments.weekendPremium / 100);
  }
  
  // Major holiday premium
  if (adjustments.majorHolidayPremium > 0) {
    multiplier *= (1 + adjustments.majorHolidayPremium / 100);
  }
  
  // High-value holiday premium
  if (adjustments.highValueHolidayPremium > 0) {
    multiplier *= (1 + adjustments.highValueHolidayPremium / 100);
  }
  
  // Frequency multiplier
  if (adjustments.frequencyMultiplier > 0) {
    multiplier *= (1 + adjustments.frequencyMultiplier / 100);
  }
  
  // Acuity multiplier
  if (adjustments.acuityMultiplier > 0) {
    multiplier *= (1 + adjustments.acuityMultiplier / 100);
  }
  
  return value * multiplier;
};

/**
 * Calculates total TCC from compensation components
 * 
 * @param components - Array of compensation components
 * @returns Total TCC amount
 */
export const calculateTotalTCC = (components: CompensationComponent[]): number => {
  return components.reduce((sum, component) => sum + Number(component.amount || 0), 0);
};

/**
 * Applies FTE adjustment to a value
 * 
 * @param value - Raw value
 * @param fte - FTE value
 * @returns FTE-adjusted value
 */
export const applyFTEAdjustment = (value: number, fte: number): number => {
  return fte ? value / fte : value;
};

/**
 * Validates FMV calculation parameters
 * 
 * @param params - FMV calculation parameters
 * @returns Validation result
 */
export const validateFMVCalculation = (params: FMVCalculationParams): FMVValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate filters
  if (!params.filters.specialty && !params.filters.providerType && !params.filters.region) {
    warnings.push('No filters applied - results may include broad market data');
  }

  if (params.filters.fte <= 0 || params.filters.fte > 2) {
    errors.push('FTE must be between 0 and 2');
  }

  // Validate values based on comparison type
  switch (params.compareType) {
    case 'TCC':
      if (params.tcc <= 0) {
        errors.push('TCC value must be greater than 0');
      }
      break;
    case 'wRVUs':
      if (params.wrvus <= 0) {
        errors.push('wRVU value must be greater than 0');
      }
      break;
    case 'CFs':
      if (params.cf <= 0) {
        errors.push('Conversion factor must be greater than 0');
      }
      break;
    case 'CallPay':
      // Call Pay validation will be handled in the component
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Formats value for display based on comparison type
 * 
 * @param value - Value to format
 * @param compareType - Type of comparison
 * @returns Formatted value string
 */
export const formatFMVValue = (value: number, compareType: CompareType): string => {
  if (compareType === 'wRVUs') {
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }
  
  // Format as currency for TCC, CFs, and CallPay
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Extracts unique values from survey data for filters
 * 
 * @param rows - Array of normalized survey rows
 * @returns Object with unique values for each filter category
 */
export const extractUniqueFilterValues = (rows: NormalizedSurveyRow[]) => {
  const specialties = [...new Set(rows.map(row => row.specialty))].sort();
  const providerTypes = [...new Set(rows.map(row => row.providerType))].sort();
  const regions = [...new Set(rows.map(row => row.geographicRegion))].sort();
  const surveySources = [...new Set(rows.map(row => row.surveySource))].sort();
  const years = [...new Set(rows.map(row => row.year))].sort((a, b) => Number(b) - Number(a));

  return {
    specialties,
    providerTypes,
    regions,
    surveySources,
    years
  };
};
