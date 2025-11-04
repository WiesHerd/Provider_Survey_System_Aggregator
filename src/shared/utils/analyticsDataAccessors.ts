/**
 * Analytics Data Accessor Utilities
 * 
 * Helper functions to safely access data fields from both legacy and dynamic formats.
 * This ensures type safety when working with AnalyticsData union type.
 */

import { AnalyticsData } from '../../features/analytics/types/analytics';
import { DynamicAggregatedData } from '../../features/analytics/types/variables';

/**
 * Type guard to check if data is in legacy format
 */
function isLegacyFormat(data: AnalyticsData): data is Extract<AnalyticsData, { tcc_p50?: number }> {
  return 'tcc_p50' in data;
}

/**
 * Type guard to check if data is in dynamic format
 */
function isDynamicFormat(data: AnalyticsData): data is DynamicAggregatedData {
  return 'variables' in data && typeof (data as DynamicAggregatedData).variables === 'object';
}

/**
 * Get TCC percentile value from either format
 */
export function getTccP50(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).tcc_p50 || 0;
  }
  if (isDynamicFormat(data)) {
    // Check multiple possible normalized names for TCC
    const tccVar = data.variables.tcc || 
                   data.variables['total_cash_compensation'] ||
                   data.variables['total_compensation'] ||
                   data.variables['total_cash_comp'];
    return tccVar?.p50 || 0;
  }
  return 0;
}

export function getTccP25(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).tcc_p25 || 0;
  }
  if (isDynamicFormat(data)) {
    const tccVar = data.variables.tcc || 
                   data.variables['total_cash_compensation'] ||
                   data.variables['total_compensation'] ||
                   data.variables['total_cash_comp'];
    return tccVar?.p25 || 0;
  }
  return 0;
}

export function getTccP75(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).tcc_p75 || 0;
  }
  if (isDynamicFormat(data)) {
    const tccVar = data.variables.tcc || 
                   data.variables['total_cash_compensation'] ||
                   data.variables['total_compensation'] ||
                   data.variables['total_cash_comp'];
    return tccVar?.p75 || 0;
  }
  return 0;
}

export function getTccP90(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).tcc_p90 || 0;
  }
  if (isDynamicFormat(data)) {
    const tccVar = data.variables.tcc || 
                   data.variables['total_cash_compensation'] ||
                   data.variables['total_compensation'] ||
                   data.variables['total_cash_comp'];
    return tccVar?.p90 || 0;
  }
  return 0;
}

/**
 * Get CF percentile value from either format
 */
export function getCfP50(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).cf_p50 || 0;
  }
  if (isDynamicFormat(data)) {
    const cfVar = data.variables.cf || 
                  data.variables['tcc_per_work_rvu'] || 
                  data.variables['tcc_per_work_rvus'] ||
                  data.variables['conversion_factor'] ||
                  data.variables['tcc_per_wrvu'];
    return cfVar?.p50 || 0;
  }
  return 0;
}

export function getCfP25(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).cf_p25 || 0;
  }
  if (isDynamicFormat(data)) {
    const cfVar = data.variables.cf || 
                  data.variables['tcc_per_work_rvu'] || 
                  data.variables['tcc_per_work_rvus'] ||
                  data.variables['conversion_factor'] ||
                  data.variables['tcc_per_wrvu'];
    return cfVar?.p25 || 0;
  }
  return 0;
}

export function getCfP75(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).cf_p75 || 0;
  }
  if (isDynamicFormat(data)) {
    const cfVar = data.variables.cf || 
                  data.variables['tcc_per_work_rvu'] || 
                  data.variables['tcc_per_work_rvus'] ||
                  data.variables['conversion_factor'] ||
                  data.variables['tcc_per_wrvu'];
    return cfVar?.p75 || 0;
  }
  return 0;
}

export function getCfP90(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).cf_p90 || 0;
  }
  if (isDynamicFormat(data)) {
    const cfVar = data.variables.cf || 
                  data.variables['tcc_per_work_rvu'] || 
                  data.variables['tcc_per_work_rvus'] ||
                  data.variables['conversion_factor'] ||
                  data.variables['tcc_per_wrvu'];
    return cfVar?.p90 || 0;
  }
  return 0;
}

/**
 * Get wRVU percentile value from either format
 */
export function getWrvuP50(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).wrvu_p50 || 0;
  }
  if (isDynamicFormat(data)) {
    const wrvuVar = data.variables.wrvu || 
                    data.variables['work_rvus'] || 
                    data.variables['work_rvu'] ||
                    data.variables['wrvus'] ||
                    data.variables['work_relative_value_units'];
    return wrvuVar?.p50 || 0;
  }
  return 0;
}

export function getWrvuP25(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).wrvu_p25 || 0;
  }
  if (isDynamicFormat(data)) {
    const wrvuVar = data.variables.wrvu || 
                    data.variables['work_rvus'] || 
                    data.variables['work_rvu'] ||
                    data.variables['wrvus'] ||
                    data.variables['work_relative_value_units'];
    return wrvuVar?.p25 || 0;
  }
  return 0;
}

export function getWrvuP75(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).wrvu_p75 || 0;
  }
  if (isDynamicFormat(data)) {
    const wrvuVar = data.variables.wrvu || 
                    data.variables['work_rvus'] || 
                    data.variables['work_rvu'] ||
                    data.variables['wrvus'] ||
                    data.variables['work_relative_value_units'];
    return wrvuVar?.p75 || 0;
  }
  return 0;
}

export function getWrvuP90(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).wrvu_p90 || 0;
  }
  if (isDynamicFormat(data)) {
    const wrvuVar = data.variables.wrvu || 
                    data.variables['work_rvus'] || 
                    data.variables['work_rvu'] ||
                    data.variables['wrvus'] ||
                    data.variables['work_relative_value_units'];
    return wrvuVar?.p90 || 0;
  }
  return 0;
}

/**
 * Get TCC n_orgs from either format
 */
export function getTccNOrgs(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).tcc_n_orgs || 0;
  }
  if (isDynamicFormat(data)) {
    const tccVar = data.variables.tcc || 
                   data.variables['total_cash_compensation'] ||
                   data.variables['total_compensation'] ||
                   data.variables['total_cash_comp'];
    return tccVar?.n_orgs || 0;
  }
  return 0;
}

/**
 * Get TCC n_incumbents from either format
 */
export function getTccNIncumbents(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).tcc_n_incumbents || 0;
  }
  if (isDynamicFormat(data)) {
    const tccVar = data.variables.tcc || 
                   data.variables['total_cash_compensation'] ||
                   data.variables['total_compensation'] ||
                   data.variables['total_cash_comp'];
    return tccVar?.n_incumbents || 0;
  }
  return 0;
}

/**
 * Get wRVU n_orgs from either format
 */
export function getWrvuNOrgs(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).wrvu_n_orgs || 0;
  }
  if (isDynamicFormat(data)) {
    const wrvuVar = data.variables.wrvu || 
                    data.variables['work_rvus'] || 
                    data.variables['work_rvu'] ||
                    data.variables['wrvus'] ||
                    data.variables['work_relative_value_units'];
    return wrvuVar?.n_orgs || 0;
  }
  return 0;
}

/**
 * Get wRVU n_incumbents from either format
 */
export function getWrvuNIncumbents(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).wrvu_n_incumbents || 0;
  }
  if (isDynamicFormat(data)) {
    const wrvuVar = data.variables.wrvu || 
                    data.variables['work_rvus'] || 
                    data.variables['work_rvu'] ||
                    data.variables['wrvus'] ||
                    data.variables['work_relative_value_units'];
    return wrvuVar?.n_incumbents || 0;
  }
  return 0;
}

/**
 * Get CF n_orgs from either format
 */
export function getCfNOrgs(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).cf_n_orgs || 0;
  }
  if (isDynamicFormat(data)) {
    const cfVar = data.variables.cf || 
                  data.variables['tcc_per_work_rvu'] || 
                  data.variables['tcc_per_work_rvus'] ||
                  data.variables['conversion_factor'] ||
                  data.variables['tcc_per_wrvu'];
    return cfVar?.n_orgs || 0;
  }
  return 0;
}

/**
 * Get CF n_incumbents from either format
 */
export function getCfNIncumbents(data: AnalyticsData): number {
  if (isLegacyFormat(data)) {
    return (data as any).cf_n_incumbents || 0;
  }
  if (isDynamicFormat(data)) {
    const cfVar = data.variables.cf || 
                  data.variables['tcc_per_work_rvu'] || 
                  data.variables['tcc_per_work_rvus'] ||
                  data.variables['conversion_factor'] ||
                  data.variables['tcc_per_wrvu'];
    return cfVar?.n_incumbents || 0;
  }
  return 0;
}

