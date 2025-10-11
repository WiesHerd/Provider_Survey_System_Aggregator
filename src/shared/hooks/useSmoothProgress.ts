import { useState, useEffect, useCallback } from 'react';

interface UseSmoothProgressOptions {
  duration?: number; // Total duration in milliseconds
  maxProgress?: number; // Maximum progress before completion (default: 90)
  intervalMs?: number; // Update interval in milliseconds (default: 100)
}

/**
 * Custom hook for smooth progress animation
 * Provides consistent progress behavior across all analysis tools
 */
export const useSmoothProgress = (options: UseSmoothProgressOptions = {}) => {
  const {
    duration = 3000, // 3 seconds default
    maxProgress = 90,
    intervalMs = 100
  } = options;

  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const startProgress = useCallback(() => {
    setProgress(0);
    setIsAnimating(true);
  }, []);

  const completeProgress = useCallback(() => {
    setIsAnimating(false);
    setProgress(100);
  }, []);

  const resetProgress = useCallback(() => {
    setIsAnimating(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= maxProgress) return prev; // Stop at maxProgress until completion
        const increment = Math.random() * 10; // Random increment for realistic feel
        return Math.min(prev + increment, maxProgress);
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isAnimating, maxProgress, intervalMs]);

  return {
    progress,
    isAnimating,
    startProgress,
    completeProgress,
    resetProgress
  };
};
