/**
 * Enterprise-Grade Request Queue
 * 
 * Manages database operation queuing to prevent overwhelming the database
 * and optimize batch processing performance.
 */

export interface QueuedRequest<T> {
  id: string;
  priority: 'high' | 'normal' | 'low';
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export interface QueueOptions {
  maxConcurrent?: number;
  batchSize?: number;
  batchDelay?: number; // milliseconds between batches
}

export class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing: Set<string> = new Set();
  private options: Required<QueueOptions>;
  private isProcessing = false;

  constructor(options: QueueOptions = {}) {
    this.options = {
      maxConcurrent: options.maxConcurrent ?? 3,
      batchSize: options.batchSize ?? 10,
      batchDelay: options.batchDelay ?? 100
    };
  }

  /**
   * Add request to queue
   */
  async enqueue<T>(
    execute: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        priority,
        execute,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // Insert based on priority
      if (priority === 'high') {
        this.queue.unshift(request);
      } else if (priority === 'low') {
        this.queue.push(request);
      } else {
        // Insert normal priority after high priority items
        const firstLowIndex = this.queue.findIndex(r => r.priority === 'low');
        if (firstLowIndex >= 0) {
          this.queue.splice(firstLowIndex, 0, request);
        } else {
          this.queue.push(request);
        }
      }

      this.processQueue();
    });
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.processing.size < this.options.maxConcurrent) {
      const request = this.queue.shift();
      if (!request) break;

      this.processing.add(request.id);

      // Execute request
      request.execute()
        .then(result => {
          this.processing.delete(request.id);
          request.resolve(result);
          this.processQueue();
        })
        .catch(error => {
          this.processing.delete(request.id);
          request.reject(error);
          this.processQueue();
        });
    }

    this.isProcessing = false;
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queued: number;
    processing: number;
    total: number;
  } {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      total: this.queue.length + this.processing.size
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

/**
 * Adaptive batch size calculator
 * Adjusts batch size based on performance metrics
 */
export class AdaptiveBatchSizer {
  private history: Array<{ batchSize: number; duration: number; success: boolean }> = [];
  private readonly maxHistory = 20;
  private currentBatchSize: number;
  private readonly minBatchSize: number;
  private readonly maxBatchSize: number;

  constructor(
    initialBatchSize: number,
    minBatchSize: number = 100,
    maxBatchSize: number = 5000
  ) {
    this.currentBatchSize = initialBatchSize;
    this.minBatchSize = minBatchSize;
    this.maxBatchSize = maxBatchSize;
  }

  /**
   * Record batch performance
   */
  recordBatch(batchSize: number, duration: number, success: boolean): void {
    this.history.push({ batchSize, duration, success });
    
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Adjust batch size based on performance
    this.adjustBatchSize();
  }

  /**
   * Adjust batch size based on performance history
   */
  private adjustBatchSize(): void {
    if (this.history.length < 3) {
      return; // Need more data
    }

    const recent = this.history.slice(-5); // Last 5 batches
    const avgDuration = recent.reduce((sum, h) => sum + h.duration, 0) / recent.length;
    const successRate = recent.filter(h => h.success).length / recent.length;

    // If batches are completing quickly and successfully, increase size
    if (avgDuration < 1000 && successRate > 0.95 && this.currentBatchSize < this.maxBatchSize) {
      this.currentBatchSize = Math.min(
        this.maxBatchSize,
        Math.floor(this.currentBatchSize * 1.2)
      );
    }
    // If batches are taking too long or failing, decrease size
    else if ((avgDuration > 5000 || successRate < 0.9) && this.currentBatchSize > this.minBatchSize) {
      this.currentBatchSize = Math.max(
        this.minBatchSize,
        Math.floor(this.currentBatchSize * 0.8)
      );
    }
  }

  /**
   * Get current optimal batch size
   */
  getBatchSize(): number {
    return this.currentBatchSize;
  }

  /**
   * Reset to initial batch size
   */
  reset(): void {
    this.currentBatchSize = this.minBatchSize;
    this.history = [];
  }
}

/**
 * Global request queue instance
 */
let globalRequestQueue: RequestQueue | null = null;

/**
 * Get global request queue
 */
export function getRequestQueue(): RequestQueue {
  if (!globalRequestQueue) {
    globalRequestQueue = new RequestQueue({
      maxConcurrent: 3,
      batchSize: 10,
      batchDelay: 100
    });
  }
  return globalRequestQueue;
}
