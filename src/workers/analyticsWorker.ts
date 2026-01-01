/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

/**
 * Analytics Web Worker
 * Handles heavy analytics calculations off the main thread
 * to prevent UI blocking during data aggregation
 */

const ctx = self as unknown as DedicatedWorkerGlobalScope;

interface AnalyticsWorkerMessage {
  type: 'CALCULATE_AGGREGATION' | 'CALCULATE_PERCENTILES' | 'FILTER_DATA';
  data: any;
  id?: string;
}

interface PercentileCalculationData {
  numbers: number[];
  percentiles: number[];
}

interface AggregationData {
  rows: any[];
  groupBy: string[];
  calculatePercentiles: boolean;
}

/**
 * Calculate percentiles for an array of numbers
 */
function calculatePercentiles(numbers: number[], percentiles: number[]): Record<number, number> {
  if (numbers.length === 0) {
    return percentiles.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});
  }

  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const result: Record<number, number> = {};

  percentiles.forEach(percentile => {
    const index = Math.floor((percentile / 100) * sortedNumbers.length);
    result[percentile] = sortedNumbers[Math.min(index, sortedNumbers.length - 1)] || 0;
  });

  return result;
}

/**
 * Aggregate data by grouping keys and calculating statistics
 */
function aggregateData(data: AggregationData): any[] {
  const { rows, groupBy, calculatePercentiles: calcPercentiles } = data;
  
  if (!rows || rows.length === 0) {
    return [];
  }

  // Group rows by the specified keys
  const grouped = new Map<string, any[]>();
  
  rows.forEach(row => {
    const key = groupBy.map(g => String(row[g] || '')).join('_');
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });

  // Calculate aggregates for each group
  const aggregated: any[] = [];
  const percentiles = [25, 50, 75, 90];

  grouped.forEach((groupRows, key) => {
    const firstRow = groupRows[0];
    const aggregatedRow: any = {
      ...firstRow,
      n_orgs: new Set(groupRows.map(r => r.organizationId || r.orgId)).size,
      n_incumbents: groupRows.length,
    };

    // Calculate percentiles for numeric fields
    if (calcPercentiles) {
      const numericFields = ['tcc', 'wrvu', 'cf', 'total_cash_compensation', 'work_rvus', 'conversion_factor'];
      
      numericFields.forEach(field => {
        const values = groupRows
          .map(r => r[field])
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));
        
        if (values.length > 0) {
          const percentileValues = calculatePercentiles(values, percentiles);
          aggregatedRow[`${field}_p25`] = percentileValues[25];
          aggregatedRow[`${field}_p50`] = percentileValues[50];
          aggregatedRow[`${field}_p75`] = percentileValues[75];
          aggregatedRow[`${field}_p90`] = percentileValues[90];
        }
      });
    }

    aggregated.push(aggregatedRow);
  });

  return aggregated;
}

/**
 * Filter data based on criteria
 */
function filterData(rows: any[], filters: Record<string, any>): any[] {
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.filter(row => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === '' || value === null) {
        return true;
      }

      const rowValue = row[key];
      if (typeof value === 'string') {
        return String(rowValue || '').toLowerCase().includes(String(value).toLowerCase());
      }

      return rowValue === value;
    });
  });
}

// Handle messages from main thread
ctx.onmessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'CALCULATE_AGGREGATION': {
        const startTime = performance.now();
        const result = aggregateData(data);
        const duration = performance.now() - startTime;
        
        ctx.postMessage({
          type: 'AGGREGATION_COMPLETE',
          id,
          data: result,
          duration
        });
        break;
      }

      case 'CALCULATE_PERCENTILES': {
        const { numbers, percentiles } = data as PercentileCalculationData;
        const startTime = performance.now();
        const result = calculatePercentiles(numbers, percentiles);
        const duration = performance.now() - startTime;
        
        ctx.postMessage({
          type: 'PERCENTILES_COMPLETE',
          id,
          data: result,
          duration
        });
        break;
      }

      case 'FILTER_DATA': {
        const { rows, filters } = data;
        const startTime = performance.now();
        const result = filterData(rows, filters);
        const duration = performance.now() - startTime;
        
        ctx.postMessage({
          type: 'FILTER_COMPLETE',
          id,
          data: result,
          duration
        });
        break;
      }

      default:
        ctx.postMessage({
          type: 'ERROR',
          id,
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    ctx.postMessage({
      type: 'ERROR',
      id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export {};





