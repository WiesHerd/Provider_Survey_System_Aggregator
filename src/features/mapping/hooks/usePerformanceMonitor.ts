/**
 * Enterprise-Grade Performance Monitoring Hook
 * Inspired by Google's Core Web Vitals and Microsoft's performance practices
 */

import { useCallback, useRef, useEffect, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentCount: number;
  lastUpdate: number;
}

interface UsePerformanceMonitorReturn {
  startTiming: (label: string) => void;
  endTiming: (label: string) => number;
  measureRender: <T>(fn: () => T) => T;
  getMetrics: () => PerformanceMetrics;
  logPerformance: (label: string, metrics: any) => void;
  isSlowRender: boolean;
  debounce: <T extends (...args: any[]) => any>(fn: T, delay: number) => T;
}

export const usePerformanceMonitor = (componentName: string): UsePerformanceMonitorReturn => {
  const timings = useRef<Map<string, number>>(new Map());
  const renderCount = useRef(0);
  const [isSlowRender, setIsSlowRender] = useState(false);

  const startTiming = useCallback((label: string) => {
    timings.current.set(label, performance.now());
  }, []);

  const endTiming = useCallback((label: string): number => {
    const startTime = timings.current.get(label);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    timings.current.delete(label);
    
    if (duration > 16) { // More than one frame
      console.warn(`🐌 Slow operation: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }, []);

  const measureRender = useCallback(<T>(fn: () => T): T => {
    const startTime = performance.now();
    const result = fn();
    const renderTime = performance.now() - startTime;
    
    renderCount.current++;
    
    if (renderTime > 16) {
      setIsSlowRender(true);
      console.warn(`🐌 Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    } else {
      setIsSlowRender(false);
    }
    
    return result;
  }, [componentName]);

  const getMetrics = useCallback((): PerformanceMetrics => {
    const memory = (performance as any).memory;
    
    return {
      renderTime: timings.current.get('render') || 0,
      memoryUsage: memory ? memory.usedJSHeapSize : 0,
      componentCount: renderCount.current,
      lastUpdate: Date.now(),
    };
  }, []);

  const logPerformance = useCallback((label: string, metrics: any) => {
    console.log(`📊 ${componentName} - ${label}:`, metrics);
  }, [componentName]);

  const debounce = useCallback(<T extends (...args: any[]) => any>(fn: T, delay: number): T => {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
  }, []);

  return {
    startTiming,
    endTiming,
    measureRender,
    getMetrics,
    logPerformance,
    isSlowRender,
    debounce,
  };
};
