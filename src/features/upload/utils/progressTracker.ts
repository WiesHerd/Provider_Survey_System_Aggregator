/**
 * Enterprise-Grade Progress Tracking
 * 
 * Provides ETA calculations, throughput metrics, and detailed progress reporting
 */

export interface ProgressMetrics {
  bytesProcessed: number;
  totalBytes: number;
  rowsProcessed: number;
  totalRows: number;
  batchesCompleted: number;
  totalBatches: number;
  startTime: number;
  currentTime: number;
  elapsedTime: number; // milliseconds
  estimatedTimeRemaining: number; // milliseconds
  throughput: {
    bytesPerSecond: number;
    rowsPerSecond: number;
    batchesPerSecond: number;
  };
  percentage: number;
  step: 'validating' | 'parsing' | 'saving' | 'verifying' | 'completed';
  stepPercentage: number; // Percentage within current step
}

export interface ProgressUpdate {
  bytesProcessed?: number;
  totalBytes?: number;
  rowsProcessed?: number;
  totalRows?: number;
  batchesCompleted?: number;
  totalBatches?: number;
  step?: ProgressMetrics['step'];
}

/**
 * Progress tracker class
 */
export class ProgressTracker {
  private startTime: number;
  private metrics: ProgressMetrics;
  private history: Array<{ time: number; bytes: number; rows: number }> = [];
  private readonly historySize = 10; // Keep last 10 samples for smoothing

  constructor(totalBytes: number, totalRows: number, totalBatches: number) {
    this.startTime = Date.now();
    this.metrics = {
      bytesProcessed: 0,
      totalBytes,
      rowsProcessed: 0,
      totalRows,
      batchesCompleted: 0,
      totalBatches,
      startTime: this.startTime,
      currentTime: this.startTime,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      throughput: {
        bytesPerSecond: 0,
        rowsPerSecond: 0,
        batchesPerSecond: 0
      },
      percentage: 0,
      step: 'validating',
      stepPercentage: 0
    };
  }

  /**
   * Update progress
   */
  update(update: ProgressUpdate): ProgressMetrics {
    const now = Date.now();
    
    // Update metrics
    if (update.bytesProcessed !== undefined) {
      this.metrics.bytesProcessed = update.bytesProcessed;
    }
    if (update.totalBytes !== undefined) {
      this.metrics.totalBytes = update.totalBytes;
    }
    if (update.rowsProcessed !== undefined) {
      this.metrics.rowsProcessed = update.rowsProcessed;
    }
    if (update.totalRows !== undefined) {
      this.metrics.totalRows = update.totalRows;
    }
    if (update.batchesCompleted !== undefined) {
      this.metrics.batchesCompleted = update.batchesCompleted;
    }
    if (update.totalBatches !== undefined) {
      this.metrics.totalBatches = update.totalBatches;
    }
    if (update.step !== undefined) {
      this.metrics.step = update.step;
    }
    
    this.metrics.currentTime = now;
    this.metrics.elapsedTime = now - this.startTime;
    
    // Calculate percentage based on current step
    this.metrics.percentage = this.calculateOverallPercentage();
    this.metrics.stepPercentage = this.calculateStepPercentage();
    
    // Add to history for smoothing
    this.history.push({
      time: now,
      bytes: this.metrics.bytesProcessed,
      rows: this.metrics.rowsProcessed
    });
    
    // Keep only recent history
    if (this.history.length > this.historySize) {
      this.history.shift();
    }
    
    // Calculate throughput (smoothed)
    this.calculateThroughput();
    
    // Calculate ETA
    this.calculateETA();
    
    return { ...this.metrics };
  }

  /**
   * Calculate overall percentage across all steps
   */
  private calculateOverallPercentage(): number {
    const stepWeights = {
      validating: 0.05,  // 5% of total
      parsing: 0.25,     // 25% of total
      saving: 0.65,      // 65% of total
      verifying: 0.05,   // 5% of total
      completed: 1.0
    };
    
    const stepProgress = this.calculateStepPercentage();
    const stepWeight = stepWeights[this.metrics.step];
    
    // Calculate cumulative progress
    let cumulativeProgress = 0;
    const steps: Array<ProgressMetrics['step']> = ['validating', 'parsing', 'saving', 'verifying', 'completed'];
    
    for (const step of steps) {
      if (step === this.metrics.step) {
        cumulativeProgress += stepWeight * (stepProgress / 100);
        break;
      } else {
        cumulativeProgress += stepWeights[step];
      }
    }
    
    return Math.min(100, Math.max(0, cumulativeProgress * 100));
  }

  /**
   * Calculate percentage within current step
   */
  private calculateStepPercentage(): number {
    switch (this.metrics.step) {
      case 'validating':
        return 0; // Validation is typically fast, show 0% or use bytes
      case 'parsing':
        if (this.metrics.totalBytes > 0) {
          return (this.metrics.bytesProcessed / this.metrics.totalBytes) * 100;
        }
        return 0;
      case 'saving':
        if (this.metrics.totalBatches > 0) {
          return (this.metrics.batchesCompleted / this.metrics.totalBatches) * 100;
        }
        if (this.metrics.totalRows > 0) {
          return (this.metrics.rowsProcessed / this.metrics.totalRows) * 100;
        }
        return 0;
      case 'verifying':
        return 50; // Verification is typically fast
      case 'completed':
        return 100;
      default:
        return 0;
    }
  }

  /**
   * Calculate throughput metrics (smoothed)
   */
  private calculateThroughput(): void {
    if (this.history.length < 2) {
      return; // Need at least 2 samples
    }
    
    const first = this.history[0];
    const last = this.history[this.history.length - 1];
    const timeDelta = (last.time - first.time) / 1000; // seconds
    
    if (timeDelta > 0) {
      const bytesDelta = last.bytes - first.bytes;
      const rowsDelta = last.rows - first.rows;
      
      this.metrics.throughput.bytesPerSecond = bytesDelta / timeDelta;
      this.metrics.throughput.rowsPerSecond = rowsDelta / timeDelta;
      
      // Batches per second (if we have batch data)
      if (this.metrics.totalBatches > 0 && this.metrics.elapsedTime > 0) {
        this.metrics.throughput.batchesPerSecond = 
          (this.metrics.batchesCompleted / (this.metrics.elapsedTime / 1000));
      }
    }
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateETA(): void {
    if (this.metrics.percentage >= 100) {
      this.metrics.estimatedTimeRemaining = 0;
      return;
    }
    
    if (this.metrics.elapsedTime === 0 || this.metrics.percentage === 0) {
      this.metrics.estimatedTimeRemaining = 0; // Can't estimate yet
      return;
    }
    
    // Calculate based on current throughput
    const remainingPercentage = 100 - this.metrics.percentage;
    const timePerPercent = this.metrics.elapsedTime / this.metrics.percentage;
    this.metrics.estimatedTimeRemaining = remainingPercentage * timePerPercent;
    
    // Alternative: Calculate based on rows/bytes remaining
    if (this.metrics.throughput.rowsPerSecond > 0 && this.metrics.totalRows > 0) {
      const remainingRows = this.metrics.totalRows - this.metrics.rowsProcessed;
      const etaFromRows = (remainingRows / this.metrics.throughput.rowsPerSecond) * 1000;
      
      // Use the more conservative estimate
      this.metrics.estimatedTimeRemaining = Math.max(
        this.metrics.estimatedTimeRemaining,
        etaFromRows
      );
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): ProgressMetrics {
    return { ...this.metrics };
  }

  /**
   * Format time remaining as human-readable string
   */
  formatTimeRemaining(): string {
    const seconds = Math.ceil(this.metrics.estimatedTimeRemaining / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Format throughput as human-readable string
   */
  formatThroughput(): string {
    if (this.metrics.throughput.rowsPerSecond > 0) {
      return `${Math.round(this.metrics.throughput.rowsPerSecond)} rows/sec`;
    } else if (this.metrics.throughput.bytesPerSecond > 0) {
      const mbps = this.metrics.throughput.bytesPerSecond / (1024 * 1024);
      return `${mbps.toFixed(2)} MB/sec`;
    }
    return 'Calculating...';
  }
}

/**
 * Create progress tracker
 */
export function createProgressTracker(
  totalBytes: number,
  totalRows: number,
  totalBatches: number
): ProgressTracker {
  return new ProgressTracker(totalBytes, totalRows, totalBatches);
}
