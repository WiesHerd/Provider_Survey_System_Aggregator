/**
 * Enterprise Performance Analytics Hook Tests
 * Comprehensive test suite for usePerformanceAnalytics hook
 * Inspired by Google's testing practices for performance monitoring
 */

import { renderHook, act } from '@testing-library/react';
import { usePerformanceAnalytics } from '../../hooks/usePerformanceAnalytics';
import { 
  createMockPerformanceMetrics, 
  createMockPerformanceEvent,
  measurePerformance,
  waitForNextTick,
  setupTestEnvironment,
  teardownTestEnvironment
} from '../setup';

describe('usePerformanceAnalytics', () => {
  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownTestEnvironment();
  });

  describe('Initialization', () => {
    it('should initialize with default metrics', () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      expect(result.current.metrics).toEqual(createMockPerformanceMetrics());
      expect(result.current.events).toEqual([]);
      expect(result.current.config.enableRealTimeMonitoring).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        enableRealTimeMonitoring: false,
        enableMemoryTracking: false,
        performanceThresholds: {
          renderTime: 20,
          memoryUsage: 150,
          searchResponseTime: 500,
        },
      };

      const { result } = renderHook(() => 
        usePerformanceAnalytics('TestComponent', customConfig)
      );

      expect(result.current.config.enableRealTimeMonitoring).toBe(false);
      expect(result.current.config.enableMemoryTracking).toBe(false);
      expect(result.current.config.performanceThresholds.renderTime).toBe(20);
    });
  });

  describe('Performance Measurement', () => {
    it('should measure render time correctly', async () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      const renderFunction = jest.fn(() => 'test result');
      
      act(() => {
        result.current.measureRender(renderFunction);
      });

      expect(renderFunction).toHaveBeenCalled();
      expect(result.current.metrics.renderTime).toBeGreaterThan(0);
    });

    it('should measure data load time correctly', async () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      const dataLoadFunction = jest.fn().mockResolvedValue('test data');
      
      let loadResult;
      await act(async () => {
        loadResult = await result.current.measureDataLoad(dataLoadFunction, 'test_operation');
      });

      expect(dataLoadFunction).toHaveBeenCalled();
      expect(loadResult).toBe('test data');
      expect(result.current.metrics.dataLoadTime).toBeGreaterThan(0);
    });

    it('should measure search response time correctly', async () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      const searchFunction = jest.fn().mockResolvedValue(['result1', 'result2']);
      
      let searchResult;
      await act(async () => {
        searchResult = await result.current.measureSearch(searchFunction, 'test search');
      });

      expect(searchFunction).toHaveBeenCalled();
      expect(searchResult).toEqual(['result1', 'result2']);
      expect(result.current.metrics.searchResponseTime).toBeGreaterThan(0);
    });

    it('should measure mapping operation time correctly', async () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      const mappingFunction = jest.fn().mockResolvedValue({ mapped: true });
      
      let mappingResult;
      await act(async () => {
        mappingResult = await result.current.measureMapping(mappingFunction, 'test_mapping');
      });

      expect(mappingFunction).toHaveBeenCalled();
      expect(mappingResult).toEqual({ mapped: true });
      expect(result.current.metrics.mappingOperationTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle data load errors correctly', async () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      const errorFunction = jest.fn().mockRejectedValue(new Error('Data load failed'));
      
      await act(async () => {
        await expect(result.current.measureDataLoad(errorFunction, 'test_operation'))
          .rejects.toThrow('Data load failed');
      });

      expect(result.current.metrics.errorRate).toBeGreaterThan(0);
      expect(result.current.metrics.successRate).toBeLessThan(100);
    });

    it('should handle search errors correctly', async () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      const errorFunction = jest.fn().mockRejectedValue(new Error('Search failed'));
      
      await act(async () => {
        await expect(result.current.measureSearch(errorFunction, 'test search'))
          .rejects.toThrow('Search failed');
      });

      expect(result.current.metrics.errorRate).toBeGreaterThan(0);
    });

    it('should handle mapping errors correctly', async () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      const errorFunction = jest.fn().mockRejectedValue(new Error('Mapping failed'));
      
      await act(async () => {
        await expect(result.current.measureMapping(errorFunction, 'test_mapping'))
          .rejects.toThrow('Mapping failed');
      });

      expect(result.current.metrics.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Event Management', () => {
    it('should add events correctly', () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      act(() => {
        result.current.addEvent({
          type: 'render',
          metadata: { componentName: 'TestComponent' },
        });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].type).toBe('render');
      expect(result.current.events[0].metadata?.componentName).toBe('TestComponent');
    });

    it('should limit event history to prevent memory leaks', () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      act(() => {
        // Add more than 100 events
        for (let i = 0; i < 150; i++) {
          result.current.addEvent({
            type: 'render',
            metadata: { index: i },
          });
        }
      });

      expect(result.current.events).toHaveLength(100);
      // Should keep the most recent events
      expect(result.current.events[0].metadata?.index).toBe(50);
      expect(result.current.events[99].metadata?.index).toBe(149);
    });

    it('should track user interactions correctly', () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      act(() => {
        result.current.trackUserInteraction('click', { element: 'button' });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].type).toBe('user_action');
      expect(result.current.events[0].metadata?.interactionType).toBe('click');
    });
  });

  describe('Performance Thresholds', () => {
    it('should detect slow renders', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      // Mock slow render
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(100); // 100ms render time
      
      act(() => {
        result.current.measureRender(() => {});
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow render detected')
      );
      
      consoleSpy.mockRestore();
    });

    it('should detect slow data loads', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      // Mock slow data load
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(2000); // 2 second data load
      
      const slowFunction = jest.fn().mockResolvedValue('data');
      
      await act(async () => {
        await result.current.measureDataLoad(slowFunction, 'slow_operation');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow data load')
      );
      
      consoleSpy.mockRestore();
    });

    it('should detect slow searches', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      // Mock slow search
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(500); // 500ms search time
      
      const slowFunction = jest.fn().mockResolvedValue(['result']);
      
      await act(async () => {
        await result.current.measureSearch(slowFunction, 'slow search');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow search')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Memory Monitoring', () => {
    it('should update memory metrics when enabled', () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent', {
        enableMemoryTracking: true,
      }));
      
      act(() => {
        result.current.updateMemoryMetrics();
      });

      expect(result.current.metrics.memoryUsage).toBe(50); // 50MB from mock
    });

    it('should not update memory metrics when disabled', () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent', {
        enableMemoryTracking: false,
      }));
      
      act(() => {
        result.current.updateMemoryMetrics();
      });

      expect(result.current.metrics.memoryUsage).toBe(0);
    });

    it('should detect high memory usage', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 150 * 1024 * 1024, // 150MB
        },
        writable: true,
      });
      
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent', {
        enableMemoryTracking: true,
        performanceThresholds: { memoryUsage: 100 },
      }));
      
      act(() => {
        result.current.updateMemoryMetrics();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Success Rate Calculation', () => {
    it('should calculate success rate correctly', async () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      // Add some successful operations
      await act(async () => {
        await result.current.measureDataLoad(() => Promise.resolve('success'), 'op1');
        await result.current.measureDataLoad(() => Promise.resolve('success'), 'op2');
        await result.current.measureDataLoad(() => Promise.resolve('success'), 'op3');
      });
      
      // Add one failed operation
      await act(async () => {
        await expect(result.current.measureDataLoad(() => Promise.reject(new Error('fail')), 'op4'))
          .rejects.toThrow();
      });
      
      act(() => {
        result.current.updateSuccessMetrics();
      });

      expect(result.current.metrics.successRate).toBe(75); // 3/4 = 75%
      expect(result.current.metrics.errorRate).toBe(25); // 1/4 = 25%
    });

    it('should calculate user satisfaction score correctly', () => {
      const { result } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      // Set up metrics for good performance
      act(() => {
        result.current.metrics.renderTime = 10; // Good
        result.current.metrics.searchResponseTime = 200; // Good
        result.current.metrics.errorRate = 0; // No errors
      });
      
      act(() => {
        result.current.updateSuccessMetrics();
      });

      expect(result.current.metrics.userSatisfactionScore).toBeGreaterThan(80);
    });
  });

  describe('Cleanup', () => {
    it('should log final performance report on unmount', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const { unmount } = renderHook(() => usePerformanceAnalytics('TestComponent'));
      
      unmount();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Final Performance Report')
      );
      
      consoleSpy.mockRestore();
    });
  });
});

























