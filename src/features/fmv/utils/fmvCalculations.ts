import { 
  FMVFilters, 
  MarketData, 
  UserPercentiles, 
  NormalizedSurveyRow, 
  CompensationComponent,
  FMVCalculationResult,
  FMVCalculationParams,
  FMVValidationResult,
  CompareType
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
  return {
    id: row.id || '',
    providerType: row[columnMappings.providerType || 'providerType'] || row.providerType || row.provider_type || '',
    geographicRegion: row[columnMappings.geographicRegion || 'geographicRegion'] || row.geographicRegion || row.geographic_region || '',
    specialty: row[columnMappings.specialty || 'specialty'] || row.specialty || row.normalizedSpecialty || '',
    normalizedSpecialty: row.normalizedSpecialty || '',
    surveySource: surveyMeta?.surveyType || '',
    year: String(row[columnMappings.year || 'year'] || row.year || surveyMeta?.surveyYear || surveyMeta?.metadata?.surveyYear || ''),
    tcc_p25: Number(row[columnMappings.tcc_p25 || 'tcc_p25']) || 0,
    tcc_p50: Number(row[columnMappings.tcc_p50 || 'tcc_p50']) || 0,
    tcc_p75: Number(row[columnMappings.tcc_p75 || 'tcc_p75']) || 0,
    tcc_p90: Number(row[columnMappings.tcc_p90 || 'tcc_p90']) || 0,
    wrvu_p25: Number(row[columnMappings.wrvu_p25 || 'wrvu_p25']) || 0,
    wrvu_p50: Number(row[columnMappings.wrvu_p50 || 'wrvu_p50']) || 0,
    wrvu_p75: Number(row[columnMappings.wrvu_p75 || 'wrvu_p75']) || 0,
    wrvu_p90: Number(row[columnMappings.wrvu_p90 || 'wrvu_p90']) || 0,
    cf_p25: Number(row[columnMappings.cf_p25 || 'cf_p25']) || 0,
    cf_p50: Number(row[columnMappings.cf_p50 || 'cf_p50']) || 0,
    cf_p75: Number(row[columnMappings.cf_p75 || 'cf_p75']) || 0,
    cf_p90: Number(row[columnMappings.cf_p90 || 'cf_p90']) || 0,
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
  let filteredRows = rows;

  if (filters.specialty) {
    const specialtyFilters = mappedSpecialties.length > 0 
      ? mappedSpecialties 
      : [normalizeString(filters.specialty)];
    
    filteredRows = filteredRows.filter(row => 
      specialtyFilters.includes(normalizeString(row.specialty))
    );
  }

  if (filters.providerType) {
    filteredRows = filteredRows.filter(row => 
      normalizeString(row.providerType) === normalizeString(filters.providerType)
    );
  }

  if (filters.region) {
    filteredRows = filteredRows.filter(row => 
      normalizeString(row.geographicRegion) === normalizeString(filters.region)
    );
  }

  if (filters.surveySource) {
    filteredRows = filteredRows.filter(row => 
      normalizeString(row.surveySource) === normalizeString(filters.surveySource)
    );
  }

  if (filters.year) {
    filteredRows = filteredRows.filter(row => 
      String(row.year) === String(filters.year)
    );
  }

  return filteredRows;
};

/**
 * Calculates market data percentiles from filtered rows
 * 
 * @param filteredRows - Filtered survey rows
 * @returns Market data with percentiles
 */
export const calculateMarketData = (filteredRows: NormalizedSurveyRow[]): MarketData => {
  // Use median (p50) values from each row to create a proper distribution
  const tccs = filteredRows
    .map(row => row.tcc_p50)
    .filter(value => value !== null && value !== undefined && !isNaN(value));
  
  const wrvus = filteredRows
    .map(row => row.wrvu_p50)
    .filter(value => value !== null && value !== undefined && !isNaN(value));
  
  const cfs = filteredRows
    .map(row => row.cf_p50)
    .filter(value => value !== null && value !== undefined && !isNaN(value));

  return {
    tcc: {
      p25: calculatePercentile(tccs, 25),
      p50: calculatePercentile(tccs, 50),
      p75: calculatePercentile(tccs, 75),
      p90: calculatePercentile(tccs, 90),
    },
    wrvu: {
      p25: calculatePercentile(wrvus, 25),
      p50: calculatePercentile(wrvus, 50),
      p75: calculatePercentile(wrvus, 75),
      p90: calculatePercentile(wrvus, 90),
    },
    cf: {
      p25: calculatePercentile(cfs, 25),
      p50: calculatePercentile(cfs, 50),
      p75: calculatePercentile(cfs, 75),
      p90: calculatePercentile(cfs, 90),
    },
  };
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
 * @returns User percentile rankings
 */
export const calculateUserPercentiles = (
  marketData: MarketData,
  tccValue: number,
  wrvuValue: number,
  cfValue: number
): UserPercentiles => {
  return {
    tcc: getPercentileRank(marketData?.tcc, tccValue),
    wrvu: getPercentileRank(marketData?.wrvu, wrvuValue),
    cf: getPercentileRank(marketData?.cf, cfValue),
  };
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
