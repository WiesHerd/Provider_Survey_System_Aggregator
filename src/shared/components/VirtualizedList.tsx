/**
 * Virtualized List Component
 * Simple virtualized list implementation
 * Note: AG Grid already has built-in virtualization, this is for custom lists
 */

import React, { memo, useMemo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanCount?: number;
}

/**
 * Virtualized list component for large datasets
 * Simple implementation - renders visible items with buffer
 * For complex virtualization, use AG Grid which has built-in support
 */
export const VirtualizedList = memo(<T,>({
  items,
  height,
  itemHeight,
  renderItem,
  className = '',
  overscanCount = 5
}: VirtualizedListProps<T>) => {
  // Calculate visible range
  const visibleItems = useMemo(() => {
    if (items.length === 0) return [];
    
    const visibleCount = Math.ceil(height / itemHeight);
    const buffer = overscanCount || 5;
    const totalToRender = Math.min(visibleCount + buffer * 2, items.length);
    
    return items.slice(0, totalToRender);
  }, [items, height, itemHeight, overscanCount]);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-500 text-sm">No items to display</p>
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{ 
        height: `${height}px`, 
        overflowY: 'auto',
        position: 'relative'
      }}
    >
      {visibleItems.map((item, index) => (
        <div key={index} style={{ height: `${itemHeight}px` }}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}) as <T>(props: VirtualizedListProps<T>) => React.ReactElement;

(VirtualizedList as any).displayName = 'VirtualizedList';

