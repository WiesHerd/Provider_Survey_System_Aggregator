/**
 * Report Blending Utilities
 * 
 * Utilities for blending specialty data across multiple surveys
 */

import { DynamicAggregatedData } from '../../analytics/types/variables';
import { BlendingMethod, BlendedSpecialtyResult, ReportMetric, Percentile } from '../types/reports';

/**
 * Blend multiple rows for the same specialty
 */
export function blendSpecialtyData(
  rows: DynamicAggregatedData[],
  method: BlendingMethod,
  metric: ReportMetric,
  selectedPercentiles: Percentile[]
): BlendedSpecialtyResult | null {
  if (rows.length === 0) return null;

  // If no blending, return null (caller should handle individual rows)
  if (method === 'none') return null;

  // Get metric prefix
  const metricPrefix = metric === 'tcc' ? 'tcc' : metric === 'wrvu' ? 'wrvu' : 'cf';

  // Calculate weights based on method
  let weights: number[] = [];
  
  if (method === 'weighted') {
    // Weight by incumbent count
    const totalIncumbents = rows.reduce((sum, row) => {
      const variableKey = Object.keys(row.variables).find(k => 
        k.toLowerCase().includes(metricPrefix.toLowerCase())
      );
      if (variableKey) {
        return sum + (row.variables[variableKey]?.n_incumbents || 0);
      }
      return sum;
    }, 0);

    if (totalIncumbents === 0) {
      // Fallback to simple average if no incumbent data
      weights = rows.map(() => 1 / rows.length);
    } else {
      weights = rows.map(row => {
        const variableKey = Object.keys(row.variables).find(k => 
          k.toLowerCase().includes(metricPrefix.toLowerCase())
        );
        const incumbents = variableKey ? (row.variables[variableKey]?.n_incumbents || 0) : 0;
        return incumbents / totalIncumbents;
      });
    }
  } else {
    // Simple average - equal weights
    weights = rows.map(() => 1 / rows.length);
  }

  // Find the variable key for this metric
  const variableKey = Object.keys(rows[0].variables).find(k => 
    k.toLowerCase().includes(metricPrefix.toLowerCase())
  );

  if (!variableKey) {
    console.warn(`No variable found for metric: ${metric}`);
    return null;
  }

  // Calculate blended percentiles
  const blended: BlendedSpecialtyResult = {
    specialty: rows[0].standardizedName,
    p25: 0,
    p50: 0,
    p75: 0,
    p90: 0,
    n_orgs: 0,
    n_incumbents: 0,
    sourceRows: rows.length
  };

  // Blend each percentile
  selectedPercentiles.forEach(percentile => {
    const blendedValue = rows.reduce((sum, row, index) => {
      const metrics = row.variables[variableKey];
      if (!metrics) return sum;
      const value = metrics[percentile] || 0;
      return sum + (value * weights[index]);
    }, 0);
    
    // Assign to the correct percentile property
    if (percentile === 'p25') blended.p25 = blendedValue;
    else if (percentile === 'p50') blended.p50 = blendedValue;
    else if (percentile === 'p75') blended.p75 = blendedValue;
    else if (percentile === 'p90') blended.p90 = blendedValue;
  });

  // Aggregate sample sizes
  blended.n_orgs = rows.reduce((sum, row) => {
    return sum + (row.variables[variableKey]?.n_orgs || 0);
  }, 0);

  blended.n_incumbents = rows.reduce((sum, row) => {
    return sum + (row.variables[variableKey]?.n_incumbents || 0);
  }, 0);

  return blended;
}

/**
 * Check if a specialty is mapped (has multiple source specialties)
 */
export function isSpecialtyMapped(
  standardizedName: string,
  mappings: Array<{ standardizedName: string }>
): boolean {
  const mapping = mappings.find(m => m.standardizedName.toLowerCase() === standardizedName.toLowerCase());
  return !!mapping;
}

/**
 * Group rows by standardized specialty name
 */
export function groupRowsBySpecialty(
  rows: DynamicAggregatedData[]
): Map<string, DynamicAggregatedData[]> {
  const grouped = new Map<string, DynamicAggregatedData[]>();

  rows.forEach(row => {
    const key = row.standardizedName || row.surveySpecialty || 'Unknown';
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });

  return grouped;
}

/**
 * Group rows by standardized specialty name and region
 * Uses composite key format: "specialty|region"
 */
export function groupRowsBySpecialtyAndRegion(
  rows: DynamicAggregatedData[]
): Map<string, DynamicAggregatedData[]> {
  const grouped = new Map<string, DynamicAggregatedData[]>();

  rows.forEach(row => {
    const specialty = row.standardizedName || row.surveySpecialty || 'Unknown';
    const region = row.geographicRegion || 'All Regions';
    const key = `${specialty}|${region}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });

  return grouped;
}

/**
 * Group rows by standardized specialty name, region, and provider type
 * Uses composite key format: "specialty|region|providerType"
 */
export function groupRowsBySpecialtyRegionAndProviderType(
  rows: DynamicAggregatedData[]
): Map<string, DynamicAggregatedData[]> {
  const grouped = new Map<string, DynamicAggregatedData[]>();

  rows.forEach(row => {
    const specialty = row.standardizedName || row.surveySpecialty || 'Unknown';
    const region = row.geographicRegion || 'All Regions';
    const providerType = row.providerType || 'Unknown';
    const key = `${specialty}|${region}|${providerType}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });

  return grouped;
}

/**
 * Group rows by standardized specialty name, region, provider type, survey source, and year
 * Uses composite key format: "specialty|region|providerType|surveySource|year"
 */
export function groupRowsBySpecialtyRegionProviderTypeSourceAndYear(
  rows: DynamicAggregatedData[]
): Map<string, DynamicAggregatedData[]> {
  const grouped = new Map<string, DynamicAggregatedData[]>();

  rows.forEach(row => {
    const specialty = row.standardizedName || row.surveySpecialty || 'Unknown';
    const region = row.geographicRegion || 'All Regions';
    const providerType = row.providerType || 'Unknown';
    const surveySource = row.surveySource || 'Unknown';
    const year = row.surveyYear || 'Unknown';
    const key = `${specialty}|${region}|${providerType}|${surveySource}|${year}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });

  return grouped;
}

/**
 * Group rows by standardized specialty name and provider type
 * Uses composite key format: "specialty|providerType"
 */
export function groupRowsBySpecialtyAndProviderType(
  rows: DynamicAggregatedData[]
): Map<string, DynamicAggregatedData[]> {
  const grouped = new Map<string, DynamicAggregatedData[]>();

  rows.forEach(row => {
    const specialty = row.standardizedName || row.surveySpecialty || 'Unknown';
    const providerType = row.providerType || 'Unknown';
    const key = `${specialty}|${providerType}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });

  return grouped;
}

/**
 * Group rows by standardized specialty name, provider type, survey source, and year
 * Uses composite key format: "specialty|providerType|surveySource|year"
 */
export function groupRowsBySpecialtyProviderTypeSourceAndYear(
  rows: DynamicAggregatedData[]
): Map<string, DynamicAggregatedData[]> {
  const grouped = new Map<string, DynamicAggregatedData[]>();

  rows.forEach(row => {
    const specialty = row.standardizedName || row.surveySpecialty || 'Unknown';
    const providerType = row.providerType || 'Unknown';
    const surveySource = row.surveySource || 'Unknown';
    const year = row.surveyYear || 'Unknown';
    const key = `${specialty}|${providerType}|${surveySource}|${year}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });

  return grouped;
}
