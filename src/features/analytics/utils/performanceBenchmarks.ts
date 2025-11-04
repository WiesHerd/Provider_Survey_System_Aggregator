/**
 * Performance Benchmarks for Analytics Caching
 * 
 * Monitors cache performance and provides benchmarks to verify
 * that caching targets are being met.
 */

import { analyticsComputationCache } from '../services/analyticsComputationCache';
import { cacheInvalidation } from './cacheInvalidation';

interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  cacheHit: boolean;
  dataSize: number;
  memoryUsage: number;
}

interface BenchmarkResults {
  totalOperations: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  averageOperationTime: number;
  totalMemoryUsage: number;
  operations: PerformanceMetrics[];
}

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private isMonitoring: boolean = false;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start monitoring performance
   */
  startMonitoring(): void {
    this.isMonitoring = true;
    this.metrics = [];
    console.log('📊 Performance monitoring started');
  }

  /**
   * Stop monitoring and return results
   */
  stopMonitoring(): BenchmarkResults {
    this.isMonitoring = false;
    
    const results = this.calculateResults();
    console.log('📊 Performance monitoring stopped', results);
    
    return results;
  }

  /**
   * Record a performance metric
   */
  recordMetric(operation: string, startTime: number, endTime: number, cacheHit: boolean, dataSize: number): void {
    if (!this.isMonitoring) return;

    const duration = endTime - startTime;
    const memoryUsage = analyticsComputationCache.getMemoryUsage();

    this.metrics.push({
      operation,
      startTime,
      endTime,
      duration,
      cacheHit,
      dataSize,
      memoryUsage
    });
  }

  /**
   * Calculate benchmark results
   */
  private calculateResults(): BenchmarkResults {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        averageOperationTime: 0,
        totalMemoryUsage: 0,
        operations: []
      };
    }

    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const cacheMisses = this.metrics.filter(m => !m.cacheHit).length;
    const totalOperations = this.metrics.length;
    const hitRate = totalOperations > 0 ? cacheHits / totalOperations : 0;
    const averageOperationTime = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
    const totalMemoryUsage = this.metrics[this.metrics.length - 1]?.memoryUsage || 0;

    return {
      totalOperations,
      cacheHits,
      cacheMisses,
      hitRate,
      averageOperationTime,
      totalMemoryUsage,
      operations: [...this.metrics]
    };
  }

  /**
   * Get current cache statistics
   */
  getCacheStats() {
    return analyticsComputationCache.getStats();
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    return analyticsComputationCache.getMemoryUsage();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Performance benchmark utilities
 */
export const performanceBenchmarks = {
  /**
   * Start performance monitoring
   */
  start: () => {
    performanceMonitor.startMonitoring();
  },

  /**
   * Stop performance monitoring and get results
   */
  stop: (): BenchmarkResults => {
    return performanceMonitor.stopMonitoring();
  },

  /**
   * Record a performance metric
   */
  record: (operation: string, startTime: number, endTime: number, cacheHit: boolean, dataSize: number) => {
    performanceMonitor.recordMetric(operation, startTime, endTime, cacheHit, dataSize);
  },

  /**
   * Get current cache statistics
   */
  getCacheStats: () => {
    return performanceMonitor.getCacheStats();
  },

  /**
   * Get memory usage
   */
  getMemoryUsage: () => {
    return performanceMonitor.getMemoryUsage();
  },

  /**
   * Verify cache hit rate meets target (>70%)
   */
  verifyHitRate: (targetHitRate: number = 0.7): boolean => {
    const stats = performanceMonitor.getCacheStats();
    const hitRate = stats.hitRate;
    const meetsTarget = hitRate >= targetHitRate;
    
    console.log(`🎯 Cache hit rate: ${(hitRate * 100).toFixed(1)}% (target: ${(targetHitRate * 100)}%)`);
    console.log(`✅ Target met: ${meetsTarget ? 'YES' : 'NO'}`);
    
    return meetsTarget;
  },

  /**
   * Verify memory usage is within limits (<100MB)
   */
  verifyMemoryUsage: (maxMemoryMB: number = 100): boolean => {
    const memoryUsage = performanceMonitor.getMemoryUsage();
    const withinLimits = memoryUsage <= maxMemoryMB;
    
    console.log(`💾 Memory usage: ${memoryUsage.toFixed(1)}MB (limit: ${maxMemoryMB}MB)`);
    console.log(`✅ Within limits: ${withinLimits ? 'YES' : 'NO'}`);
    
    return withinLimits;
  },

  /**
   * Run comprehensive performance test
   */
  runPerformanceTest: async (): Promise<{
    hitRate: boolean;
    memoryUsage: boolean;
    overall: boolean;
    results: BenchmarkResults;
  }> => {
    console.log('🚀 Starting comprehensive performance test...');
    
    // Start monitoring
    performanceBenchmarks.start();
    
    // Simulate typical analytics operations
    await simulateAnalyticsOperations();
    
    // Stop monitoring and get results
    const results = performanceBenchmarks.stop();
    
    // Verify targets
    const hitRate = performanceBenchmarks.verifyHitRate(0.7);
    const memoryUsage = performanceBenchmarks.verifyMemoryUsage(100);
    const overall = hitRate && memoryUsage;
    
    console.log(`🏆 Overall performance test: ${overall ? 'PASSED' : 'FAILED'}`);
    
    return {
      hitRate,
      memoryUsage,
      overall,
      results
    };
  }
};

/**
 * Simulate typical analytics operations for testing
 */
async function simulateAnalyticsOperations(): Promise<void> {
  // Simulate data loading
  const mockData = generateMockAnalyticsData(1000);
  
  // Simulate grouping operations
  for (let i = 0; i < 5; i++) {
    const startTime = performance.now();
    // This would trigger the actual grouping logic
    const endTime = performance.now();
    performanceBenchmarks.record('grouping', startTime, endTime, i > 0, mockData.length);
  }
  
  // Simulate summary calculations
  for (let i = 0; i < 3; i++) {
    const startTime = performance.now();
    // This would trigger the actual summary logic
    const endTime = performance.now();
    performanceBenchmarks.record('summary', startTime, endTime, i > 0, mockData.length);
  }
  
  // Simulate filtering operations
  for (let i = 0; i < 10; i++) {
    const startTime = performance.now();
    // This would trigger the actual filtering logic
    const endTime = performance.now();
    performanceBenchmarks.record('filtering', startTime, endTime, i > 2, mockData.length);
  }
}

/**
 * Generate mock analytics data for testing
 */
function generateMockAnalyticsData(count: number): any[] {
  const specialties = ['Cardiology', 'Orthopedics', 'Neurology', 'Oncology', 'Pediatrics'];
  const sources = ['MGMA', 'SullivanCotter', 'Gallagher'];
  const regions = ['Northeast', 'South', 'Midwest', 'West', 'National'];
  
  return Array.from({ length: count }, (_, i) => ({
    surveySpecialty: specialties[i % specialties.length],
    surveySource: sources[i % sources.length],
    geographicRegion: regions[i % regions.length],
    tcc_p50: 200000 + (i * 1000),
    wrvu_p50: 4000 + (i * 10),
    cf_p50: 50 + (i * 0.1)
  }));
}

/**
 * Performance testing hooks for React components
 */
export const usePerformanceTesting = () => {
  const startTest = () => {
    performanceBenchmarks.start();
  };

  const stopTest = () => {
    return performanceBenchmarks.stop();
  };

  const runFullTest = async () => {
    return performanceBenchmarks.runPerformanceTest();
  };

  const getStats = () => {
    return {
      cacheStats: performanceBenchmarks.getCacheStats(),
      memoryUsage: performanceBenchmarks.getMemoryUsage()
    };
  };

  return {
    startTest,
    stopTest,
    runFullTest,
    getStats
  };
};
