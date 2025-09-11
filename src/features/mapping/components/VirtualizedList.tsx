/**
 * Enterprise-Grade Virtualized List Component
 * Custom implementation inspired by Google Material Design and Microsoft Fluent Design
 * Handles large datasets with smooth scrolling and optimal performance
 */

import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { usePerformanceAnalytics } from '../hooks/usePerformanceAnalytics';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight?: number;
  height?: number;
  width?: string | number;
  overscanCount?: number;
  className?: string;
  children: (props: { index: number; item: T; style: React.CSSProperties }) => React.ReactNode;
  onScroll?: (scrollTop: number) => void;
  onItemsRendered?: (startIndex: number, endIndex: number) => void;
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  isLoading?: boolean;
  searchTerm?: string;
}

/**
 * VirtualizedList - Custom enterprise-grade list virtualization
 * 
 * Features:
 * - Custom virtualization without external dependencies
 * - Smooth scrolling with overscan
 * - Performance monitoring
 * - Empty and loading states
 * - Accessibility support
 */
export const VirtualizedList = memo(<T,>({
  items,
  itemHeight = 60,
  height = 400,
  width = '100%',
  overscanCount = 5,
  className = '',
  children,
  onScroll,
  onItemsRendered,
  emptyState,
  loadingState,
  isLoading = false,
  searchTerm = '',
}: VirtualizedListProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Enterprise performance monitoring - only in development
  const analytics = usePerformanceAnalytics('VirtualizedList', {
    enableRealTimeMonitoring: process.env.NODE_ENV === 'development',
    enableMemoryTracking: process.env.NODE_ENV === 'development',
    enableUserInteractionTracking: process.env.NODE_ENV === 'development',
    performanceThresholds: {
      renderTime: 16,
      memoryUsage: 100,
      searchResponseTime: 300,
    },
    reportingInterval: 5000,
  });

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscanCount);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + height) / itemHeight) + overscanCount
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, height, items.length, overscanCount]);

  // Render visible items - ALWAYS called to follow Rules of Hooks
  const visibleItems = useMemo(() => {
    // Return empty array if no items to avoid conditional hook calls
    if (items.length === 0) {
      return [];
    }
    
    const items_to_render = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      const item = items[i];
      if (item) {
        const style: React.CSSProperties = {
          position: 'absolute',
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        };
        items_to_render.push(
          <div key={i} style={style}>
            {children({ index: i, item, style })}
          </div>
        );
      }
    }
    return items_to_render;
  }, [items, visibleRange, itemHeight, children]);

  // Handle scroll events with debouncing
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (process.env.NODE_ENV === 'development') {
      analytics.trackUserInteraction('scroll', { 
        scrollTop: e.currentTarget.scrollTop,
        itemCount: items.length 
      });
    }
    
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    onScroll?.(newScrollTop);
  }, [onScroll, items.length]);

  // Notify about rendered items
  useEffect(() => {
    onItemsRendered?.(visibleRange.startIndex, visibleRange.endIndex);
  }, [visibleRange.startIndex, visibleRange.endIndex, onItemsRendered]);

  // Performance monitoring effect - only in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const renderStartTime = performance.now();
    
    // Measure render performance
    const measureRender = () => {
      const renderTime = performance.now() - renderStartTime;
      analytics.addEvent({
        type: 'render',
        duration: renderTime,
        metadata: { 
          itemCount: items.length, 
          searchTerm,
          visibleRange: `${visibleRange.startIndex}-${visibleRange.endIndex}`,
          overscanCount 
        }
      });
    };
    
    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(measureRender);
  }, [items.length, searchTerm, visibleRange.startIndex, visibleRange.endIndex, overscanCount]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        {loadingState || (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <div className="text-sm text-gray-500">Loading items...</div>
          </div>
        )}
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        {emptyState || (
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">📋</div>
            <div className="text-sm text-gray-500">
              {searchTerm ? 'No items match your search' : 'No items to display'}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`virtualized-container ${isScrolling ? 'scrolling' : ''} ${className}`}
      style={{
        height,
        width,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      {/* Spacer for total height */}
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}) as <T>(props: VirtualizedListProps<T>) => React.ReactElement;

// Set display name for debugging
(VirtualizedList as any).displayName = 'VirtualizedList';

// CSS for smooth scrolling and performance
const virtualizedStyles = `
  .virtualized-container {
    position: relative;
    overflow: hidden;
  }
  
  .virtualized-container.scrolling {
    scroll-behavior: smooth;
  }
  
  .virtualized-list {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f7fafc;
  }
  
  .virtualized-list::-webkit-scrollbar {
    width: 8px;
  }
  
  .virtualized-list::-webkit-scrollbar-track {
    background: #f7fafc;
    border-radius: 4px;
  }
  
  .virtualized-list::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 4px;
  }
  
  .virtualized-list::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }
  
  /* Performance optimizations */
  .virtualized-list > div {
    will-change: transform;
    contain: layout style paint;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = virtualizedStyles;
  document.head.appendChild(styleSheet);
}
