/**
 * Enterprise Performance Analytics Hook
 * Inspired by Google's Core Web Vitals and Microsoft's Performance API
 * Provides comprehensive performance monitoring for specialty mapping operations
 */

import { useCallback, useRef, useEffect, useMemo } from 'react';

export interface PerformanceMetrics {
  // Core Web Vitals
  renderTime: number;
  memoryUsage: number;
  interactionTime: number;
  
  // Custom Metrics
  dataLoadTime: number;
  searchResponseTime: number;
  mappingOperationTime: number;
  
  // User Experience
  errorRate: number;
  successRate: number;
  userSatisfactionScore: number;
}

export interface PerformanceEvent {
  id: string;
  type: 'render' | 'data_load' | 'search' | 'mapping' | 'error' | 'user_action';
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceAnalyticsConfig {
  enableRealTimeMonitoring: boolean;
  enableMemoryTracking: boolean;
  enableUserInteractionTracking: boolean;
  performanceThresholds: {
    renderTime: number; // ms
    memoryUsage: number; // MB
    searchResponseTime: number; // ms
  };
  reportingInterval: number; // ms
}

const DEFAULT_CONFIG: PerformanceAnalyticsConfig = {
  enableRealTimeMonitoring: true,
  enableMemoryTracking: true,
  enableUserInteractionTracking: true,
  performanceThresholds: {
    renderTime: 16, // 60fps threshold
    memoryUsage: 100, // 100MB threshold
    searchResponseTime: 300, // 300ms threshold
  },
  reportingInterval: 5000, // 5 seconds
};

export const usePerformanceAnalytics = (
  componentName: string,
  config: Partial<PerformanceAnalyticsConfig> = {}
) => {
  const fullConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  // Performance tracking state
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    interactionTime: 0,
    dataLoadTime: 0,
    searchResponseTime: 0,
    mappingOperationTime: 0,
    errorRate: 0,
    successRate: 100,
    userSatisfactionScore: 100,
  });

  const eventsRef = useRef<PerformanceEvent[]>([]);
  const renderStartTimeRef = useRef<number>(0);
  const interactionStartTimeRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const successCountRef = useRef<number>(0);

  // Performance measurement utilities
  const measureRender = useCallback((renderFunction: () => void) => {
    if (!fullConfig.enableRealTimeMonitoring) {
      renderFunction();
      return;
    }

    renderStartTimeRef.current = performance.now();
    renderFunction();
    
    const renderTime = performance.now() - renderStartTimeRef.current;
    metricsRef.current.renderTime = renderTime;

      // Log slow renders
      if (renderTime > fullConfig.performanceThresholds.renderTime) {
        console.log('⚠️ Slow render detected:', {
          component: componentName,
          renderTime: `${renderTime.toFixed(2)}ms`,
          threshold: `${fullConfig.performanceThresholds.renderTime}ms`
        });
        
        // Add performance event
      addEvent({
        type: 'render',
        duration: renderTime,
        severity: renderTime > 100 ? 'high' : 'medium',
        metadata: { componentName, threshold: fullConfig.performanceThresholds.renderTime }
      });
    }
  }, [componentName, fullConfig]);

  const measureDataLoad = useCallback(async <T>(
    dataLoadFunction: () => Promise<T>,
    operationName: string = 'data_load'
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await dataLoadFunction();
      const duration = performance.now() - startTime;
      
      metricsRef.current.dataLoadTime = duration;
      
      // Log slow data loads
      if (duration > 1000) { // 1 second threshold
        
        addEvent({
          type: 'data_load',
          duration,
          severity: duration > 3000 ? 'high' : 'medium',
          metadata: { componentName, operationName }
        });
      }
      
      successCountRef.current++;
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      errorCountRef.current++;
      
      addEvent({
        type: 'error',
        duration,
        severity: 'high',
        metadata: { 
          componentName, 
          operationName, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
      
      throw error;
    }
  }, [componentName]);

  const measureSearch = useCallback(async <T>(
    searchFunction: () => Promise<T>,
    searchTerm: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await searchFunction();
      const duration = performance.now() - startTime;
      
      metricsRef.current.searchResponseTime = duration;
      
      // Log slow searches
      if (duration > fullConfig.performanceThresholds.searchResponseTime) {
        
        addEvent({
          type: 'search',
          duration,
          severity: duration > 1000 ? 'high' : 'medium',
          metadata: { componentName, searchTerm, resultCount: Array.isArray(result) ? result.length : 1 }
        });
      }
      
      successCountRef.current++;
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      errorCountRef.current++;
      
      addEvent({
        type: 'error',
        duration,
        severity: 'high',
        metadata: { 
          componentName, 
          searchTerm, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
      
      throw error;
    }
  }, [componentName, fullConfig.performanceThresholds.searchResponseTime]);

  const measureMapping = useCallback(async <T>(
    mappingFunction: () => Promise<T>,
    operationType: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await mappingFunction();
      const duration = performance.now() - startTime;
      
      metricsRef.current.mappingOperationTime = duration;
      
      // Log slow mapping operations
      if (duration > 2000) { // 2 second threshold
        
        addEvent({
          type: 'mapping',
          duration,
          severity: duration > 5000 ? 'high' : 'medium',
          metadata: { componentName, operationType }
        });
      }
      
      successCountRef.current++;
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      errorCountRef.current++;
      
      addEvent({
        type: 'error',
        duration,
        severity: 'high',
        metadata: { 
          componentName, 
          operationType, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      });
      
      throw error;
    }
  }, [componentName]);

  // Event management
  const addEvent = useCallback((event: Omit<PerformanceEvent, 'id' | 'timestamp'>) => {
    const fullEvent: PerformanceEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    eventsRef.current.push(fullEvent);
    
    // Keep only last 100 events to prevent memory leaks
    if (eventsRef.current.length > 100) {
      eventsRef.current = eventsRef.current.slice(-100);
    }
  }, []);

  const trackUserInteraction = useCallback((interactionType: string, metadata?: Record<string, any>) => {
    if (!fullConfig.enableUserInteractionTracking) return;
    
    const duration = interactionStartTimeRef.current 
      ? performance.now() - interactionStartTimeRef.current 
      : 0;
    
    addEvent({
      type: 'user_action',
      duration,
      metadata: { 
        componentName, 
        interactionType, 
        ...metadata 
      }
    });
    
    interactionStartTimeRef.current = performance.now();
  }, [componentName, fullConfig.enableUserInteractionTracking, addEvent]);

  // Memory monitoring
  const updateMemoryMetrics = useCallback(() => {
    if (!fullConfig.enableMemoryTracking || !('memory' in performance)) return;
    
    const memory = (performance as any).memory;
    if (memory) {
      const memoryUsageMB = memory.usedJSHeapSize / 1024 / 1024;
      metricsRef.current.memoryUsage = memoryUsageMB;
      
      // Log high memory usage
      if (memoryUsageMB > fullConfig.performanceThresholds.memoryUsage) {
        
        addEvent({
          type: 'render',
          severity: 'medium',
          metadata: { 
            componentName, 
            memoryUsageMB, 
            threshold: fullConfig.performanceThresholds.memoryUsage 
          }
        });
      }
    }
  }, [componentName, fullConfig]);

  // Success/Error rate calculation
  const updateSuccessMetrics = useCallback(() => {
    const total = successCountRef.current + errorCountRef.current;
    if (total > 0) {
      metricsRef.current.successRate = (successCountRef.current / total) * 100;
      metricsRef.current.errorRate = (errorCountRef.current / total) * 100;
      
      // Calculate user satisfaction score based on performance
      const renderScore = Math.max(0, 100 - (metricsRef.current.renderTime / 16) * 10);
      const searchScore = Math.max(0, 100 - (metricsRef.current.searchResponseTime / 300) * 10);
      const errorPenalty = metricsRef.current.errorRate * 2;
      
      metricsRef.current.userSatisfactionScore = Math.max(0, 
        (renderScore + searchScore) / 2 - errorPenalty
      );
    }
  }, []);

  // Periodic reporting
  useEffect(() => {
    if (!fullConfig.enableRealTimeMonitoring) return;
    
    const interval = setInterval(() => {
      updateMemoryMetrics();
      updateSuccessMetrics();
      
      // Log performance summary every 30 seconds
      if (Date.now() % 30000 < fullConfig.reportingInterval) {
        const metrics = metricsRef.current;
        console.log('📊 Performance Summary:', {
          renderTime: `${metrics.renderTime.toFixed(2)}ms`,
          memoryUsage: `${metrics.memoryUsage.toFixed(2)}MB`,
          searchResponseTime: `${metrics.searchResponseTime.toFixed(2)}ms`,
          successRate: `${metrics.successRate.toFixed(1)}%`,
          userSatisfactionScore: `${metrics.userSatisfactionScore.toFixed(1)}/100`,
          recentEvents: eventsRef.current.slice(-5).length
        });
      }
    }, fullConfig.reportingInterval);
    
    return () => clearInterval(interval);
  }, [componentName, fullConfig.enableRealTimeMonitoring, fullConfig.reportingInterval, updateMemoryMetrics, updateSuccessMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Final performance report
      const metrics = metricsRef.current;
      console.log('📊 Final Performance Report:', {
        totalEvents: eventsRef.current.length,
        averageRenderTime: `${metrics.renderTime.toFixed(2)}ms`,
        peakMemoryUsage: `${metrics.memoryUsage.toFixed(2)}MB`,
        finalSuccessRate: `${metrics.successRate.toFixed(1)}%`,
        userSatisfactionScore: `${metrics.userSatisfactionScore.toFixed(1)}/100`
      });
    };
  }, [componentName]);

  return {
    // Metrics
    metrics: metricsRef.current,
    events: eventsRef.current,
    
    // Measurement functions
    measureRender,
    measureDataLoad,
    measureSearch,
    measureMapping,
    trackUserInteraction,
    
    // Utilities
    addEvent,
    updateMemoryMetrics,
    updateSuccessMetrics,
    
    // Configuration
    config: fullConfig,
  };
};
