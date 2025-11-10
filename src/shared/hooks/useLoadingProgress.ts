import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSmoothProgress } from './useSmoothProgress';

interface UseLoadingProgressOptions {
  /**
   * Total number of records being processed
   * If not provided, will be calculated from data array length
   */
  totalRecords?: number;
  
  /**
   * Data array for auto-calculating record count
   */
  data?: any[];
  
  /**
   * Current loading state
   */
  loading?: boolean;
  
  /**
   * External progress value (0-100)
   * If provided, will use this instead of internal animation
   */
  externalProgress?: number;
  
  /**
   * Duration for smooth progress animation (ms)
   */
  duration?: number;
  
  /**
   * Maximum progress before completion (default: 90)
   */
  maxProgress?: number;
}

interface UseLoadingProgressReturn {
  /**
   * Current progress value (0-100)
   */
  progress: number;
  
  /**
   * Calculated record count
   */
  recordCount: number;
  
  /**
   * Formatted record count string (with commas)
   */
  formattedRecordCount: string;
  
  /**
   * Whether progress is animating
   */
  isAnimating: boolean;
  
  /**
   * Start progress animation
   */
  startProgress: () => void;
  
  /**
   * Complete progress (set to 100%)
   */
  completeProgress: () => void;
  
  /**
   * Reset progress to 0
   */
  resetProgress: () => void;
}

/**
 * Enterprise-grade loading progress hook
 * 
 * Tracks actual data loading progress, calculates record counts,
 * and provides smooth fallback animation when external progress is not available.
 * 
 * @example
 * ```typescript
 * const { progress, recordCount, formattedRecordCount } = useLoadingProgress({
 *   data: analyticsData,
 *   loading: isLoading,
 *   externalProgress: uploadProgress
 * });
 * ```
 */
export const useLoadingProgress = (
  options: UseLoadingProgressOptions = {}
): UseLoadingProgressReturn => {
  const {
    totalRecords,
    data,
    loading = false,
    externalProgress,
    duration = 3000,
    maxProgress = 90
  } = options;

  // Calculate record count from data or use provided total
  const recordCount = useMemo(() => {
    if (totalRecords !== undefined) {
      return totalRecords;
    }
    if (data && Array.isArray(data)) {
      return data.length;
    }
    return 0;
  }, [totalRecords, data]);

  // Format record count with commas
  const formattedRecordCount = useMemo(() => {
    if (recordCount === 0) return '0';
    return new Intl.NumberFormat('en-US').format(recordCount);
  }, [recordCount]);

  // Use smooth progress for fallback animation
  const {
    progress: internalProgress,
    isAnimating,
    startProgress,
    completeProgress: completeSmoothProgress,
    resetProgress: resetSmoothProgress
  } = useSmoothProgress({
    duration,
    maxProgress,
    intervalMs: 100
  });

  // Determine which progress to use
  const progress = useMemo(() => {
    // Use external progress if provided
    if (externalProgress !== undefined) {
      return Math.max(0, Math.min(100, externalProgress));
    }
    // Use internal smooth progress
    return internalProgress;
  }, [externalProgress, internalProgress]);

  // Auto-start progress when loading begins
  useEffect(() => {
    if (loading && externalProgress === undefined) {
      startProgress();
    }
  }, [loading, externalProgress, startProgress]);

  // Complete progress when loading ends
  useEffect(() => {
    if (!loading && externalProgress === undefined) {
      // Small delay to show completion
      const timer = setTimeout(() => {
        completeSmoothProgress();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, externalProgress, completeSmoothProgress]);

  // Wrapper functions
  const completeProgress = useCallback(() => {
    completeSmoothProgress();
  }, [completeSmoothProgress]);

  const resetProgress = useCallback(() => {
    resetSmoothProgress();
  }, [resetSmoothProgress]);

  return {
    progress,
    recordCount,
    formattedRecordCount,
    isAnimating,
    startProgress,
    completeProgress,
    resetProgress
  };
};






