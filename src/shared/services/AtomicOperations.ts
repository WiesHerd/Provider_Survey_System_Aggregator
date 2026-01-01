/**
 * Enterprise Atomic Operations Service
 * 
 * Provides atomic operation wrappers for multi-step data operations
 * with rollback capability to ensure data consistency.
 */

import { TransactionQueue } from './TransactionQueue';

export interface AtomicOperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  rollback?: () => Promise<void>;
}

export interface OperationStep<T> {
  name: string;
  execute: () => Promise<T>;
  rollback?: (data: T) => Promise<void>;
  verify?: (data: T) => Promise<boolean>;
}

/**
 * Atomic Operations Service
 * Manages multi-step operations with rollback capability
 */
export class AtomicOperations {
  private static instance: AtomicOperations;
  private transactionQueue: TransactionQueue;

  private constructor() {
    this.transactionQueue = TransactionQueue.getInstance();
  }

  public static getInstance(): AtomicOperations {
    if (!AtomicOperations.instance) {
      AtomicOperations.instance = new AtomicOperations();
    }
    return AtomicOperations.instance;
  }

  /**
   * Execute a series of operations atomically
   * If any step fails, all previous steps are rolled back
   */
  public async executeAtomic<T>(
    steps: OperationStep<any>[],
    operationName: string = 'atomic-operation'
  ): Promise<AtomicOperationResult<T>> {
    const executedSteps: Array<{ step: OperationStep<any>; data: any }> = [];
    
    console.log(`🔄 Starting atomic operation: ${operationName} (${steps.length} steps)`);

    try {
      // Execute all steps sequentially
      for (const step of steps) {
        console.log(`▶️ Executing step: ${step.name}`);
        
        // Execute step
        const stepData = await step.execute();
        
        // Verify step if verification function provided
        if (step.verify) {
          const isValid = await step.verify(stepData);
          if (!isValid) {
            throw new Error(`Step verification failed: ${step.name}`);
          }
        }
        
        executedSteps.push({ step, data: stepData });
        console.log(`✅ Step completed: ${step.name}`);
      }

      console.log(`✅ Atomic operation completed: ${operationName}`);
      
      return {
        success: true,
        data: executedSteps[executedSteps.length - 1]?.data as T,
        rollback: async () => {
          await this.rollbackSteps(executedSteps.reverse());
        }
      };
    } catch (error) {
      console.error(`❌ Atomic operation failed: ${operationName}`, error);
      
      // Rollback all executed steps in reverse order
      await this.rollbackSteps(executedSteps.reverse());
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Rollback executed steps
   */
  private async rollbackSteps(
    steps: Array<{ step: OperationStep<any>; data: any }>
  ): Promise<void> {
    console.log(`🔄 Rolling back ${steps.length} steps...`);
    
    for (const { step, data } of steps) {
      if (step.rollback) {
        try {
          console.log(`↩️ Rolling back step: ${step.name}`);
          await step.rollback(data);
          console.log(`✅ Rollback completed: ${step.name}`);
        } catch (rollbackError) {
          console.error(`❌ Rollback failed for step: ${step.name}`, rollbackError);
          // Continue rolling back other steps even if one fails
        }
      }
    }
    
    console.log(`✅ Rollback completed for all steps`);
  }

  /**
   * Execute operation with transaction queue and atomic guarantees
   */
  public async executeWithTransaction<T>(
    operation: () => Promise<T>,
    storeName: string,
    mode: 'readonly' | 'readwrite' = 'readwrite',
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return await this.transactionQueue.queueTransaction(async () => {
      const lockId = await this.transactionQueue.acquireLock(storeName, mode);
      
      try {
        const result = await operation();
        return result;
      } finally {
        this.transactionQueue.releaseLock(storeName, mode, lockId);
      }
    }, priority);
  }

  /**
   * Execute operation with verification
   */
  public async executeWithVerification<T>(
    operation: () => Promise<T>,
    verify: (result: T) => Promise<boolean>,
    retries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await operation();
        const isValid = await verify(result);
        
        if (isValid) {
          return result;
        }
        
        throw new Error('Verification failed');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ Operation attempt ${attempt}/${retries} failed:`, lastError.message);
        
        if (attempt < retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }
}






