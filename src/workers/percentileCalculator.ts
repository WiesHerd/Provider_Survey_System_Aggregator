/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

/**
 * Percentile Calculator Web Worker
 * Specialized worker for calculating percentiles on large datasets
 * Uses efficient algorithms to handle millions of data points
 */

const ctx = self as unknown as DedicatedWorkerGlobalScope;

interface PercentileRequest {
  type: 'CALCULATE_PERCENTILES';
  data: {
    numbers: number[];
    percentiles: number[];
  };
  id?: string;
}

/**
 * Efficient percentile calculation using quickselect algorithm
 * O(n) average case, O(n²) worst case (rare)
 */
function quickSelect(arr: number[], k: number): number {
  if (arr.length === 0) return 0;
  if (arr.length === 1) return arr[0];

  const pivotIndex = Math.floor(Math.random() * arr.length);
  const pivot = arr[pivotIndex];

  const lows = arr.filter(x => x < pivot);
  const highs = arr.filter(x => x > pivot);
  const pivots = arr.filter(x => x === pivot);

  if (k < lows.length) {
    return quickSelect(lows, k);
  } else if (k < lows.length + pivots.length) {
    return pivot;
  } else {
    return quickSelect(highs, k - lows.length - pivots.length);
  }
}

/**
 * Calculate multiple percentiles efficiently
 * Uses a single sort for all percentiles when dataset is small,
 * or quickselect for large datasets
 */
function calculatePercentiles(numbers: number[], percentiles: number[]): Record<number, number> {
  if (numbers.length === 0) {
    return percentiles.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});
  }

  // Filter out invalid numbers
  const validNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n) && isFinite(n));
  
  if (validNumbers.length === 0) {
    return percentiles.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});
  }

  const result: Record<number, number> = {};
  const THRESHOLD = 10000; // Use quickselect for datasets larger than this

  if (validNumbers.length > THRESHOLD) {
    // For large datasets, use quickselect for each percentile
    percentiles.forEach(percentile => {
      const index = Math.floor((percentile / 100) * validNumbers.length);
      const clampedIndex = Math.min(Math.max(0, index), validNumbers.length - 1);
      result[percentile] = quickSelect([...validNumbers], clampedIndex);
    });
  } else {
    // For smaller datasets, sort once and use indices
    const sorted = [...validNumbers].sort((a, b) => a - b);
    percentiles.forEach(percentile => {
      const index = Math.floor((percentile / 100) * sorted.length);
      const clampedIndex = Math.min(Math.max(0, index), sorted.length - 1);
      result[percentile] = sorted[clampedIndex];
    });
  }

  return result;
}

/**
 * Calculate percentiles for multiple arrays (batch processing)
 */
function calculateBatchPercentiles(
  dataArrays: Array<{ name: string; numbers: number[] }>,
  percentiles: number[]
): Record<string, Record<number, number>> {
  const results: Record<string, Record<number, number>> = {};

  dataArrays.forEach(({ name, numbers }) => {
    results[name] = calculatePercentiles(numbers, percentiles);
  });

  return results;
}

// Handle messages from main thread
ctx.onmessage = (event: MessageEvent<PercentileRequest>) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'CALCULATE_PERCENTILES': {
        const { numbers, percentiles } = data;
        const startTime = performance.now();
        
        // Check if this is a batch request
        if (Array.isArray(numbers) && numbers.length > 0 && Array.isArray(numbers[0])) {
          // Batch processing
          const batchData = numbers as any[];
          const result = calculateBatchPercentiles(
            batchData.map((arr, idx) => ({ name: `array_${idx}`, numbers: arr })),
            percentiles
          );
          
          const duration = performance.now() - startTime;
          ctx.postMessage({
            type: 'PERCENTILES_COMPLETE',
            id,
            data: result,
            duration,
            count: batchData.length
          });
        } else {
          // Single array processing
          const result = calculatePercentiles(numbers as number[], percentiles);
          const duration = performance.now() - startTime;
          
          ctx.postMessage({
            type: 'PERCENTILES_COMPLETE',
            id,
            data: result,
            duration,
            count: 1
          });
        }
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





