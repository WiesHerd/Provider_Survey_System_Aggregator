import { useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for using Web Workers
 * Provides a clean interface for worker communication with automatic cleanup
 * 
 * @param workerPath - Path to the worker file
 * @returns Object with postMessage function and cleanup
 * 
 * @example
 * ```typescript
 * const { postMessage, terminate } = useWebWorker('/workers/analyticsWorker.ts');
 * 
 * postMessage({
 *   type: 'CALCULATE_AGGREGATION',
 *   data: { rows, groupBy: ['specialty'] }
 * }, (result) => {
 *   console.log('Aggregation complete:', result);
 * });
 * ```
 */
export const useWebWorker = (workerPath: string) => {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<string, (data: any) => void>>(new Map());

  // Initialize worker
  useEffect(() => {
    try {
      // Create worker from the path
      // Note: In production, you may need to handle worker bundling differently
      const worker = new Worker(
        new URL(workerPath, import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event: MessageEvent) => {
        const { id, data, type } = event.data;
        
        if (id && callbacksRef.current.has(id)) {
          const callback = callbacksRef.current.get(id)!;
          callback({ data, type });
          callbacksRef.current.delete(id);
        }
      };

      worker.onerror = (error) => {
        console.error('Web Worker error:', error);
      };

      workerRef.current = worker;

      return () => {
        // Cleanup on unmount
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        callbacksRef.current.clear();
      };
    } catch (error) {
      console.error('Failed to create Web Worker:', error);
      // Fallback: return a no-op function if worker creation fails
      return () => {};
    }
  }, [workerPath]);

  /**
   * Post a message to the worker
   * 
   * @param message - Message to send to worker
   * @param onComplete - Callback when worker responds
   * @returns Unique message ID
   */
  const postMessage = useCallback(
    <T = any>(
      message: any,
      onComplete?: (result: { data: T; type: string }) => void
    ): string => {
      if (!workerRef.current) {
        console.warn('Web Worker not initialized');
        return '';
      }

      const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const messageWithId = { ...message, id };

      if (onComplete) {
        callbacksRef.current.set(id, onComplete);
      }

      workerRef.current.postMessage(messageWithId);
      return id;
    },
    []
  );

  /**
   * Terminate the worker
   */
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      callbacksRef.current.clear();
    }
  }, []);

  return {
    postMessage,
    terminate,
    isReady: workerRef.current !== null
  };
};





