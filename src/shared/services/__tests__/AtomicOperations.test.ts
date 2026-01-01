/**
 * Atomic Operations Service Tests
 * 
 * Tests for enterprise atomic operation wrappers with rollback capability
 */

import { AtomicOperations } from '../AtomicOperations';

describe('AtomicOperations', () => {
  let atomicOps: AtomicOperations;

  beforeEach(() => {
    atomicOps = AtomicOperations.getInstance();
  });

  describe('Atomic Execution', () => {
    it('should execute all steps atomically', async () => {
      const executedSteps: string[] = [];
      
      const result = await atomicOps.executeAtomic(
        [
          {
            name: 'step1',
            execute: async () => {
              executedSteps.push('step1');
              return 'result1';
            }
          },
          {
            name: 'step2',
            execute: async () => {
              executedSteps.push('step2');
              return 'result2';
            }
          }
        ],
        'test-operation'
      );

      expect(result.success).toBe(true);
      expect(executedSteps).toEqual(['step1', 'step2']);
      expect(result.data).toBe('result2');
    });

    it('should rollback on failure', async () => {
      const rollbackCalls: string[] = [];
      
      const result = await atomicOps.executeAtomic(
        [
          {
            name: 'step1',
            execute: async () => {
              return 'result1';
            },
            rollback: async () => {
              rollbackCalls.push('step1');
            }
          },
          {
            name: 'step2',
            execute: async () => {
              throw new Error('Step 2 failed');
            }
          }
        ],
        'test-operation'
      );

      expect(result.success).toBe(false);
      expect(rollbackCalls).toContain('step1');
    });

    it('should verify steps when verification function provided', async () => {
      const result = await atomicOps.executeAtomic(
        [
          {
            name: 'step1',
            execute: async () => {
              return 'result1';
            },
            verify: async (data) => {
              return data === 'result1';
            }
          }
        ],
        'test-operation'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Execution with Verification', () => {
    it('should retry on verification failure', async () => {
      let attempts = 0;
      
      const result = await atomicOps.executeWithVerification(
        async () => {
          attempts++;
          return attempts >= 2 ? 'valid' : 'invalid';
        },
        async (data) => data === 'valid',
        3
      );

      expect(result).toBe('valid');
      expect(attempts).toBe(2);
    });
  });
});






