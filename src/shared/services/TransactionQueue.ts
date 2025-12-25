/**
 * Enterprise Transaction Queue Service
 * 
 * Provides atomic transaction management and queuing to prevent race conditions
 * in IndexedDB operations. Ensures data consistency and integrity.
 */

export interface QueuedTransaction<T> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
}

export interface TransactionLock {
  storeName: string;
  mode: 'readonly' | 'readwrite';
  acquiredAt: number;
  transactionId: string;
}

/**
 * Transaction Queue Service
 * Manages concurrent IndexedDB operations to prevent race conditions
 */
export class TransactionQueue {
  private static instance: TransactionQueue;
  private queue: QueuedTransaction<any>[] = [];
  private activeLocks: Map<string, TransactionLock> = new Map();
  private isProcessing = false;
  private readonly MAX_CONCURRENT_TRANSACTIONS = 3;
  private readonly LOCK_TIMEOUT = 30000; // 30 seconds
  private activeTransactionCount = 0;

  private constructor() {
    // Start processing queue
    this.startProcessing();
  }

  public static getInstance(): TransactionQueue {
    if (!TransactionQueue.instance) {
      TransactionQueue.instance = new TransactionQueue();
    }
    return TransactionQueue.instance;
  }

  /**
   * Acquire a lock for a specific object store
   * Prevents concurrent modifications to the same data
   */
  public async acquireLock(
    storeName: string,
    mode: 'readonly' | 'readwrite' = 'readwrite',
    timeout: number = this.LOCK_TIMEOUT
  ): Promise<string> {
    const lockKey = `${storeName}_${mode}`;
    const transactionId = crypto.randomUUID();
    const startTime = Date.now();

    // Wait for lock to be available
    while (this.activeLocks.has(lockKey)) {
      const lock = this.activeLocks.get(lockKey)!;
      
      // Check for stale locks (timeout)
      if (Date.now() - lock.acquiredAt > this.LOCK_TIMEOUT) {
        console.warn(`⚠️ Removing stale lock: ${lockKey}`);
        this.activeLocks.delete(lockKey);
        break;
      }

      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for lock: ${lockKey}`);
      }
    }

    // Acquire lock
    this.activeLocks.set(lockKey, {
      storeName,
      mode,
      acquiredAt: Date.now(),
      transactionId
    });

    console.log(`🔒 Acquired lock: ${lockKey} (transaction: ${transactionId})`);
    return transactionId;
  }

  /**
   * Release a lock
   */
  public releaseLock(storeName: string, mode: 'readonly' | 'readwrite', transactionId: string): void {
    const lockKey = `${storeName}_${mode}`;
    const lock = this.activeLocks.get(lockKey);
    
    if (lock && lock.transactionId === transactionId) {
      this.activeLocks.delete(lockKey);
      console.log(`🔓 Released lock: ${lockKey} (transaction: ${transactionId})`);
    } else {
      console.warn(`⚠️ Attempted to release lock that doesn't exist or doesn't match: ${lockKey}`);
    }
  }

  /**
   * Queue a transaction operation
   */
  public async queueTransaction<T>(
    operation: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedTransaction: QueuedTransaction<T> = {
        id: crypto.randomUUID(),
        operation,
        resolve,
        reject,
        timestamp: Date.now(),
        priority
      };

      // Insert based on priority
      if (priority === 'high') {
        this.queue.unshift(queuedTransaction);
      } else if (priority === 'low') {
        this.queue.push(queuedTransaction);
      } else {
        // Insert normal priority after high priority items
        const firstLowIndex = this.queue.findIndex(t => t.priority === 'low');
        if (firstLowIndex === -1) {
          this.queue.push(queuedTransaction);
        } else {
          this.queue.splice(firstLowIndex, 0, queuedTransaction);
        }
      }

      console.log(`📋 Queued transaction: ${queuedTransaction.id} (priority: ${priority}, queue length: ${this.queue.length})`);
      
      // Trigger processing if not already running
      this.startProcessing();
    });
  }

  /**
   * Start processing the queue
   */
  private startProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * Process queued transactions
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 || this.activeTransactionCount > 0) {
      // Check if we can process more transactions
      if (this.activeTransactionCount >= this.MAX_CONCURRENT_TRANSACTIONS) {
        await new Promise(resolve => setTimeout(resolve, 10));
        continue;
      }

      // Get next transaction
      const transaction = this.queue.shift();
      if (!transaction) {
        // No more transactions, but wait for active ones to complete
        if (this.activeTransactionCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
          continue;
        }
        break;
      }

      // Process transaction
      this.activeTransactionCount++;
      this.executeTransaction(transaction)
        .finally(() => {
          this.activeTransactionCount--;
        });
    }

    this.isProcessing = false;
  }

  /**
   * Execute a single transaction
   */
  private async executeTransaction<T>(queuedTransaction: QueuedTransaction<T>): Promise<void> {
    try {
      console.log(`▶️ Executing transaction: ${queuedTransaction.id}`);
      const result = await queuedTransaction.operation();
      queuedTransaction.resolve(result);
      console.log(`✅ Transaction completed: ${queuedTransaction.id}`);
    } catch (error) {
      console.error(`❌ Transaction failed: ${queuedTransaction.id}`, error);
      queuedTransaction.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get queue statistics
   */
  public getQueueStats(): {
    queueLength: number;
    activeTransactions: number;
    activeLocks: number;
  } {
    return {
      queueLength: this.queue.length,
      activeTransactions: this.activeTransactionCount,
      activeLocks: this.activeLocks.size
    };
  }

  /**
   * Clear all locks (emergency cleanup)
   */
  public clearAllLocks(): void {
    console.warn('⚠️ Clearing all transaction locks');
    this.activeLocks.clear();
  }
}



