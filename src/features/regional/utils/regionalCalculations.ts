import { RegionalData, RegionalFilters, RegionalSummary, RegionalCalculationParams, RegionalCalculationResult, RegionalChartData, RegionalMapData } from '../types/regional';
import { calculatePercentile, calculateAverage } from '../../../shared/utils/calculations';
import { formatCurrency, formatNumber } from '../../../shared/utils/formatters';

/**
 * Standard region names for consistent data processing
 */
export const REGION_NAMES = ['National', 'Northeast', 'Midwest', 'South', 'West'];

/**
 * Regional metric configurations
 */
export const REGIONAL_METRICS = [
  {
    key: 'tcc',
    label: 'Total Cash Compensation (TCC)',
    format: (v: number) => formatCurrency(v, 0),
    color: '#3B82F6',
  },
  {
    key: 'cf',
    label: 'Conversion Factor (CF)',
    format: (v: number) => formatCurrency(v, 2),
    color: '#10B981',
  },
  {
    key: 'wrvus',
    label: 'Work RVUs (wRVUs)',
    format: (v: number) => formatNumber(v),
    color: '#F59E0B',
  },
];

/**
 * Percentile configurations for regional analysis
 */
export const PERCENTILES = [
  { key: 'p25', label: '25th Percentile', value: 25 },
  { key: 'p50', label: '50th Percentile', value: 50 },
  { key: 'p75', label: '75th Percentile', value: 75 },
  { key: 'p90', label: '90th Percentile', value: 90 },
];

/**
 * Applies regional filters to raw data
 * 
 * @param data - Raw survey data
 * @param filters - Regional filters to apply
 * @param mappings - Specialty mappings for filtering
 * @returns Filtered data rows
 */
export const applyRegionalFilters = (
  data: any[],
  filters: RegionalFilters,
  mappings: any[] = []
): any[] => {
  let filtered = [...data];

  // Filter by specialty using mappings
  if (filters.specialty) {
    const mapping = mappings.find(m => m.standardizedName === filters.specialty);
    if (mapping) {
      const mappedSpecialtyNames = mapping.sourceSpecialties.map((spec: any) => spec.specialty);
      filtered = filtered.filter(row => {
        const rowSpecialty = String(row.specialty || row.normalizedSpecialty || '');
        return mappedSpecialtyNames.some((mappedName: string) => 
          rowSpecialty.toLowerCase().includes(mappedName.toLowerCase()) ||
          mappedName.toLowerCase().includes(rowSpecialty.toLowerCase())
        );
      });
    }
  }

  // Filter by provider type
  if (filters.providerType) {
    filtered = filtered.filter(row => row.providerType === filters.providerType);
  }

  // Filter by region
  if (filters.region) {
    filtered = filtered.filter(row => row.geographicRegion === filters.region);
  }

  // Filter by survey source
  if (filters.surveySource) {
    filtered = filtered.filter(row => row.surveySource === filters.surveySource);
  }

  // Filter by year
  if (filters.year) {
    filtered = filtered.filter(row => row.surveyYear === filters.year);
  }

  return filtered;
};

/**
 * Calculates regional data by aggregating metrics for each region
 * 
 * @param filteredData - Filtered survey data
 * @param regions - List of regions to include
 * @returns Regional data with aggregated metrics
 */
export const calculateRegionalData = (
  filteredData: any[],
  regions: string[] = REGION_NAMES
): RegionalData[] => {
  return regions.map(regionName => {
    // For 'National', use all filtered rows
    const regionRows = regionName === 'National'
      ? filteredData
      : filteredData.filter(r => r.geographicRegion === regionName);

    const regionData: RegionalData = {
      region: regionName,
      tcc_p25: calculateAverage(regionRows.map(r => Number(r.tcc_p25) || 0)),
      tcc_p50: calculateAverage(regionRows.map(r => Number(r.tcc_p50) || 0)),
      tcc_p75: calculateAverage(regionRows.map(r => Number(r.tcc_p75) || 0)),
      tcc_p90: calculateAverage(regionRows.map(r => Number(r.tcc_p90) || 0)),
      cf_p25: calculateAverage(regionRows.map(r => Number(r.cf_p25) || 0)),
      cf_p50: calculateAverage(regionRows.map(r => Number(r.cf_p50) || 0)),
      cf_p75: calculateAverage(regionRows.map(r => Number(r.cf_p75) || 0)),
      cf_p90: calculateAverage(regionRows.map(r => Number(r.cf_p90) || 0)),
      wrvus_p25: calculateAverage(regionRows.map(r => Number(r.wrvu_p25) || 0)),
      wrvus_p50: calculateAverage(regionRows.map(r => Number(r.wrvu_p50) || 0)),
      wrvus_p75: calculateAverage(regionRows.map(r => Number(r.wrvu_p75) || 0)),
      wrvus_p90: calculateAverage(regionRows.map(r => Number(r.wrvu_p90) || 0)),
    };

    return regionData;
  });
};

/**
 * Calculates regional summary statistics
 * 
 * @param regionalData - Regional data array
 * @param totalRecords - Total number of records used
 * @returns Regional summary statistics
 */
export const calculateRegionalSummary = (
  regionalData: RegionalData[],
  totalRecords: number
): RegionalSummary => {
  const tccValues = regionalData.map(r => r.tcc_p50);
  const cfValues = regionalData.map(r => r.cf_p50);
  const wrvusValues = regionalData.map(r => r.wrvus_p50);

  const maxTCCIndex = tccValues.indexOf(Math.max(...tccValues));
  const minTCCIndex = tccValues.indexOf(Math.min(...tccValues));

  return {
    totalRegions: regionalData.length,
    totalRecords,
    averageTCC: calculateAverage(tccValues),
    averageCF: calculateAverage(cfValues),
    averageWRVUs: calculateAverage(wrvusValues),
    regionWithHighestTCC: regionalData[maxTCCIndex]?.region || 'Unknown',
    regionWithLowestTCC: regionalData[minTCCIndex]?.region || 'Unknown',
    dataDiversity: calculateDataDiversity(regionalData),
  };
};

/**
 * Calculates data diversity score based on regional variation
 * 
 * @param regionalData - Regional data array
 * @returns Diversity score (0-1)
 */
export const calculateDataDiversity = (regionalData: RegionalData[]): number => {
  if (regionalData.length <= 1) return 0;

  const tccValues = regionalData.map(r => r.tcc_p50);
  const mean = calculateAverage(tccValues);
  const variance = calculateAverage(tccValues.map(v => Math.pow(v - mean, 2)));
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = standardDeviation / mean;

  // Normalize to 0-1 range (typical CV values are 0.1-0.5)
  return Math.min(coefficientOfVariation / 0.5, 1);
};

/**
 * Generates chart data for regional visualizations
 * 
 * @param regionalData - Regional data array
 * @param metric - Metric to visualize (tcc, cf, wrvus)
 * @param percentile - Percentile to use (p25, p50, p75, p90)
 * @returns Chart data for visualization
 */
export const generateRegionalChartData = (
  regionalData: RegionalData[],
  metric: string = 'tcc',
  percentile: string = 'p50'
): RegionalChartData => {
  const labels = regionalData.map(r => r.region);
  const data = regionalData.map(r => r[`${metric}_${percentile}` as keyof RegionalData] as number);
  
  const metricConfig = REGIONAL_METRICS.find(m => m.key === metric);
  
  return {
    labels,
    datasets: [{
      label: `${metricConfig?.label || metric} (${PERCENTILES.find(p => p.key === percentile)?.label})`,
      data,
      backgroundColor: metricConfig?.color || '#3B82F6',
      borderColor: metricConfig?.color || '#3B82F6',
    }],
  };
};

/**
 * Generates map data for geographic visualization
 * 
 * @param regionalData - Regional data array
 * @param metric - Metric to visualize
 * @param percentile - Percentile to use
 * @returns Map data for geographic visualization
 */
export const generateRegionalMapData = (
  regionalData: RegionalData[],
  metric: string = 'tcc',
  percentile: string = 'p50'
): RegionalMapData[] => {
  const values = regionalData.map(r => r[`${metric}_${percentile}` as keyof RegionalData] as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return regionalData.map(region => {
    const value = region[`${metric}_${percentile}` as keyof RegionalData] as number;
    const normalizedValue = (value - min) / (max - min);
    
    // Generate color based on value (green to red)
    const red = Math.round(255 * (1 - normalizedValue));
    const green = Math.round(255 * normalizedValue);
    const color = `rgb(${red}, ${green}, 0)`;
    
    const metricConfig = REGIONAL_METRICS.find(m => m.key === metric);
    const percentileConfig = PERCENTILES.find(p => p.key === percentile);
    
    return {
      region: region.region,
      value,
      color,
      tooltip: `${region.region}: ${metricConfig?.format(value) || value} (${percentileConfig?.label})`,
    };
  });
};

/**
 * Sorts regional data by specified column and direction
 * 
 * @param data - Regional data array
 * @param column - Column to sort by
 * @param direction - Sort direction
 * @returns Sorted regional data
 */
export const sortRegionalData = (
  data: RegionalData[],
  column: keyof RegionalData,
  direction: 'asc' | 'desc'
): RegionalData[] => {
  return [...data].sort((a, b) => {
    const aValue = a[column] as number;
    const bValue = b[column] as number;
    
    if (direction === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });
};

/**
 * Validates regional calculation parameters
 * 
 * @param params - Calculation parameters
 * @returns Validation result
 */
export const validateRegionalCalculation = (params: RegionalCalculationParams): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!params.data || params.data.length === 0) {
    errors.push('No data provided for regional calculation');
  }

  if (!params.regions || params.regions.length === 0) {
    errors.push('No regions specified for regional calculation');
  }

  if (!params.metrics || params.metrics.length === 0) {
    errors.push('No metrics specified for regional calculation');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Main regional calculation function
 * 
 * @param params - Calculation parameters
 * @param mappings - Specialty mappings
 * @returns Complete regional calculation result
 */
export const calculateRegionalAnalytics = (
  params: RegionalCalculationParams,
  mappings: any[] = []
): RegionalCalculationResult => {
  // Validate parameters
  const validation = validateRegionalCalculation(params);
  if (!validation.isValid) {
    throw new Error(`Regional calculation validation failed: ${validation.errors.join(', ')}`);
  }

  // Apply filters
  const filteredData = applyRegionalFilters(params.data, params.filters, mappings);

  // Calculate regional data
  const regionalData = calculateRegionalData(filteredData, params.regions);

  // Calculate summary
  const summary = calculateRegionalSummary(regionalData, filteredData.length);

  // Generate chart data (default to TCC P50)
  const chartData = generateRegionalChartData(regionalData, 'tcc', 'p50');

  // Generate map data (default to TCC P50)
  const mapData = generateRegionalMapData(regionalData, 'tcc', 'p50');

  return {
    regionalData,
    summary,
    chartData,
    mapData,
  };
};
