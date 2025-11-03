/**
 * Query Telemetry Hook
 * 
 * Tracks performance metrics for TanStack Query:
 * - Cache hit/miss rate
 * - Fetch time
 * - Render time
 * - Route-change latency
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface TelemetryMetrics {
  cacheHits: number;
  cacheMisses: number;
  totalFetches: number;
  fetchTimes: number[];
  renderTimes: number[];
  routeChangeLatencies: number[];
}

interface UseQueryTelemetryOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  sampleRate?: number; // 0-1, percentage of events to track
}

const defaultMetrics: TelemetryMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  totalFetches: 0,
  fetchTimes: [],
  renderTimes: [],
  routeChangeLatencies: [],
};

// Global metrics store (persists across component unmounts)
let globalMetrics: TelemetryMetrics = { ...defaultMetrics };

/**
 * Hook for tracking query performance metrics
 */
export const useQueryTelemetry = (options: UseQueryTelemetryOptions = {}) => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    logToConsole = process.env.NODE_ENV === 'development',
    sampleRate = 1.0,
  } = options;

  const queryClient = useQueryClient();
  const renderStartTime = useRef<number>(0);
  const routeChangeStartTime = useRef<number>(0);

  // Track render time
  useEffect(() => {
    if (!enabled) return;

    renderStartTime.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      if (Math.random() < sampleRate) {
        globalMetrics.renderTimes.push(renderTime);
        // Keep only last 100 render times
        if (globalMetrics.renderTimes.length > 100) {
          globalMetrics.renderTimes.shift();
        }
      }
    };
  }, [enabled, sampleRate]);

  // Track route changes
  useEffect(() => {
    if (!enabled) return;

    routeChangeStartTime.current = performance.now();

    return () => {
      const latency = performance.now() - routeChangeStartTime.current;
      if (Math.random() < sampleRate) {
        globalMetrics.routeChangeLatencies.push(latency);
        // Keep only last 50 route changes
        if (globalMetrics.routeChangeLatencies.length > 50) {
          globalMetrics.routeChangeLatencies.shift();
        }
      }
    };
  }, [enabled, sampleRate]);

  // Monitor query cache
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && event.query) {
        const queryState = event.query.state;
        
        if (queryState.dataUpdatedAt > queryState.dataUpdatedAt) {
          // This is a fresh fetch (cache miss)
          globalMetrics.cacheMisses++;
        } else {
          // This is from cache (cache hit)
          globalMetrics.cacheHits++;
        }
        
        globalMetrics.totalFetches++;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, queryClient]);

  // Log metrics periodically
  useEffect(() => {
    if (!logToConsole || !enabled) return;

    const interval = setInterval(() => {
      const metrics = getMetrics();
      if (metrics.totalFetches > 0) {
        console.log('📊 Query Telemetry:', {
          cacheHitRate: `${((metrics.cacheHits / metrics.totalFetches) * 100).toFixed(1)}%`,
          avgFetchTime: `${calculateAverage(metrics.fetchTimes).toFixed(2)}ms`,
          avgRenderTime: `${calculateAverage(metrics.renderTimes).toFixed(2)}ms`,
          avgRouteChangeLatency: `${calculateAverage(metrics.routeChangeLatencies).toFixed(2)}ms`,
          p95RouteChangeLatency: `${calculatePercentile(metrics.routeChangeLatencies, 95).toFixed(2)}ms`,
        });
      }
    }, 30000); // Log every 30 seconds

    return () => clearInterval(interval);
  }, [logToConsole, enabled]);

  return {
    getMetrics: () => getMetrics(),
    resetMetrics: () => {
      globalMetrics = { ...defaultMetrics };
    },
  };
};

/**
 * Get current metrics snapshot
 */
export function getMetrics(): TelemetryMetrics {
  return { ...globalMetrics };
}

/**
 * Track a fetch operation
 */
export function trackFetch(fetchTime: number) {
  globalMetrics.fetchTimes.push(fetchTime);
  // Keep only last 100 fetch times
  if (globalMetrics.fetchTimes.length > 100) {
    globalMetrics.fetchTimes.shift();
  }
}

/**
 * Calculate average of array
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate percentile of array
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] || 0;
}

/**
 * Get formatted metrics report
 */
export function getMetricsReport(): string {
  const metrics = getMetrics();
  const cacheHitRate = metrics.totalFetches > 0
    ? ((metrics.cacheHits / metrics.totalFetches) * 100).toFixed(1)
    : '0.0';

  return `
Query Performance Metrics:
- Cache Hit Rate: ${cacheHitRate}%
- Average Fetch Time: ${calculateAverage(metrics.fetchTimes).toFixed(2)}ms
- Average Render Time: ${calculateAverage(metrics.renderTimes).toFixed(2)}ms
- Average Route Change Latency: ${calculateAverage(metrics.routeChangeLatencies).toFixed(2)}ms
- 95th Percentile Route Change Latency: ${calculatePercentile(metrics.routeChangeLatencies, 95).toFixed(2)}ms
- Total Fetches: ${metrics.totalFetches}
- Cache Hits: ${metrics.cacheHits}
- Cache Misses: ${metrics.cacheMisses}
  `.trim();
}

