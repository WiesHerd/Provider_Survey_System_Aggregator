/**
 * Transaction Queue Service Tests
 * 
 * Tests for enterprise transaction queue and locking mechanisms
 */

import { TransactionQueue } from '../TransactionQueue';

describe('TransactionQueue', () => {
  let transactionQueue: TransactionQueue;

  beforeEach(() => {
    transactionQueue = TransactionQueue.getInstance();
  });

  describe('Lock Management', () => {
    it('should acquire and release locks correctly', async () => {
      const lockId = await transactionQueue.acquireLock('testStore', 'readwrite');
      expect(lockId).toBeDefined();
      
      transactionQueue.releaseLock('testStore', 'readwrite', lockId);
      
      // Should be able to acquire lock again after release
      const lockId2 = await transactionQueue.acquireLock('testStore', 'readwrite');
      expect(lockId2).toBeDefined();
    });

    it('should prevent concurrent access to same store', async () => {
      const lock1 = await transactionQueue.acquireLock('testStore', 'readwrite');
      
      // Second lock should wait
      const lock2Promise = transactionQueue.acquireLock('testStore', 'readwrite');
      
      // Release first lock
      transactionQueue.releaseLock('testStore', 'readwrite', lock1);
      
      // Second lock should now be acquired
      const lock2 = await lock2Promise;
      expect(lock2).toBeDefined();
    });
  });

  describe('Transaction Queuing', () => {
    it('should queue transactions and execute them', async () => {
      const results: number[] = [];
      
      const promises = [
        transactionQueue.queueTransaction(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          results.push(1);
          return 1;
        }),
        transactionQueue.queueTransaction(async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          results.push(2);
          return 2;
        })
      ];

      await Promise.all(promises);
      
      expect(results.length).toBe(2);
      expect(results).toContain(1);
      expect(results).toContain(2);
    });

    it('should handle transaction errors gracefully', async () => {
      const errorTransaction = transactionQueue.queueTransaction(async () => {
        throw new Error('Test error');
      });

      await expect(errorTransaction).rejects.toThrow('Test error');
    });
  });

  describe('Queue Statistics', () => {
    it('should provide queue statistics', () => {
      const stats = transactionQueue.getQueueStats();
      
      expect(stats).toHaveProperty('queueLength');
      expect(stats).toHaveProperty('activeTransactions');
      expect(stats).toHaveProperty('activeLocks');
    });
  });
});






