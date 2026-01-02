/**
 * Enterprise-Grade Upload Metrics Collection
 * 
 * Tracks upload performance, errors, and health metrics
 */

import { logger } from '../utils/logger';

export interface UploadMetric {
  id: string;
  timestamp: number;
  type: 'upload_start' | 'upload_complete' | 'upload_error' | 'upload_cancel' | 'batch_complete' | 'verification';
  data: {
    fileName?: string;
    fileSize?: number;
    rowCount?: number;
    batchIndex?: number;
    totalBatches?: number;
    duration?: number;
    throughput?: {
      bytesPerSecond: number;
      rowsPerSecond: number;
    };
    error?: {
      type: string;
      message: string;
      recoverable: boolean;
    };
    memoryUsage?: {
      used: number;
      total: number;
    };
  };
}

export interface UploadHealthMetrics {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  cancelledUploads: number;
  averageDuration: number;
  averageThroughput: number;
  errorRate: number;
  lastUploadTime: number | null;
}

class UploadMetricsService {
  private metrics: UploadMetric[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics
  private readonly storageKey = 'upload_metrics';

  constructor() {
    this.loadMetrics();
  }

  /**
   * Record upload metric
   */
  record(metric: Omit<UploadMetric, 'id' | 'timestamp'>): void {
    const fullMetric: UploadMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...metric
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Persist metrics
    this.saveMetrics();

    // Log metric
    logger.debug('📊 Upload metric:', fullMetric);
  }

  /**
   * Record upload start
   */
  recordUploadStart(fileName: string, fileSize: number, rowCount: number): string {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.record({
      type: 'upload_start',
      data: {
        fileName,
        fileSize,
        rowCount
      }
    });

    return uploadId;
  }

  /**
   * Record upload completion
   */
  recordUploadComplete(
    fileName: string,
    fileSize: number,
    rowCount: number,
    duration: number,
    throughput: { bytesPerSecond: number; rowsPerSecond: number }
  ): void {
    this.record({
      type: 'upload_complete',
      data: {
        fileName,
        fileSize,
        rowCount,
        duration,
        throughput
      }
    });
  }

  /**
   * Record upload error
   */
  recordUploadError(
    fileName: string,
    error: { type: string; message: string; recoverable: boolean },
    fileSize?: number,
    rowCount?: number
  ): void {
    this.record({
      type: 'upload_error',
      data: {
        fileName,
        fileSize,
        rowCount,
        error
      }
    });
  }

  /**
   * Record batch completion
   */
  recordBatchComplete(
    batchIndex: number,
    totalBatches: number,
    rowsProcessed: number,
    duration: number
  ): void {
    this.record({
      type: 'batch_complete',
      data: {
        batchIndex,
        totalBatches,
        rowCount: rowsProcessed,
        duration
      }
    });
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(used: number, total: number): void {
    // Only record if memory usage is significant
    if (used > 10 * 1024 * 1024) { // > 10MB
      this.record({
        type: 'upload_start', // Reuse type for memory tracking
        data: {
          memoryUsage: { used, total }
        }
      });
    }
  }

  /**
   * Get health metrics
   */
  getHealthMetrics(): UploadHealthMetrics {
    const uploads = this.metrics.filter(m => 
      m.type === 'upload_start' || 
      m.type === 'upload_complete' || 
      m.type === 'upload_error' || 
      m.type === 'upload_cancel'
    );

    const successful = this.metrics.filter(m => m.type === 'upload_complete');
    const failed = this.metrics.filter(m => m.type === 'upload_error');
    const cancelled = this.metrics.filter(m => m.type === 'upload_cancel');

    const durations = successful
      .map(m => m.data.duration || 0)
      .filter(d => d > 0);

    const throughputs = successful
      .map(m => m.data.throughput?.rowsPerSecond || 0)
      .filter(t => t > 0);

    const totalUploads = uploads.length;
    const errorRate = totalUploads > 0 ? (failed.length / totalUploads) * 100 : 0;

    const lastUpload = this.metrics
      .filter(m => m.type === 'upload_complete' || m.type === 'upload_error')
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    return {
      totalUploads,
      successfulUploads: successful.length,
      failedUploads: failed.length,
      cancelledUploads: cancelled.length,
      averageDuration: durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0,
      averageThroughput: throughputs.length > 0
        ? throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length
        : 0,
      errorRate,
      lastUploadTime: lastUpload?.timestamp || null
    };
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: UploadMetric['type']): UploadMetric[] {
    return this.metrics.filter(m => m.type === type);
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 100): UploadMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.saveMetrics();
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetrics(): void {
    try {
      const data = JSON.stringify(this.metrics);
      localStorage.setItem(this.storageKey, data);
    } catch (error) {
      logger.error('Failed to save metrics:', error);
    }
  }

  /**
   * Load metrics from localStorage
   */
  private loadMetrics(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.metrics = parsed.slice(-this.maxMetrics); // Only keep recent
        }
      }
    } catch (error) {
      logger.error('Failed to load metrics:', error);
      this.metrics = [];
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Singleton instance
let metricsServiceInstance: UploadMetricsService | null = null;

/**
 * Get metrics service instance
 */
export function getUploadMetricsService(): UploadMetricsService {
  if (!metricsServiceInstance) {
    metricsServiceInstance = new UploadMetricsService();
  }
  return metricsServiceInstance;
}

/**
 * Enhanced structured logger for upload operations
 */
export const uploadLogger = {
  /**
   * Log upload operation with context
   */
  logUpload: (operation: string, context: Record<string, any>) => {
    logger.debug(`📤 Upload: ${operation}`, context);
  },

  /**
   * Log upload error with context
   */
  logError: (operation: string, error: Error, context: Record<string, any> = {}) => {
    logger.error(`❌ Upload Error: ${operation}`, {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
  },

  /**
   * Log upload progress
   */
  logProgress: (progress: {
    percentage: number;
    rowsProcessed: number;
    totalRows: number;
    throughput?: number;
  }) => {
    logger.debug('📊 Upload Progress', progress);
  }
};
