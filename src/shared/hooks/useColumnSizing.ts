import { useEffect, useRef, useCallback } from 'react';

interface UseColumnSizingOptions {
  gridApi: any;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Enterprise-grade AG Grid column sizing hook
 * Implements two-phase intelligent sizing with ResizeObserver support
 * 
 * Phase 1: Content-based initial sizing (auto-size based on content)
 * Phase 2: Container fitting (ensure columns fit within container)
 * 
 * @param gridApi - AG Grid API instance
 * @param enabled - Whether sizing is enabled (default: true)
 * @param debounceMs - Debounce delay for resize events (default: 150ms)
 */
export const useColumnSizing = ({
  gridApi,
  enabled = true,
  debounceMs = 150
}: UseColumnSizingOptions) => {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSizingRef = useRef(false);

  /**
   * Two-phase intelligent column sizing algorithm
   * 1. Auto-size columns based on content (respects minWidth)
   * 2. If columns overflow container, use sizeColumnsToFit()
   * 3. If columns underflow, flex ratios distribute extra space
   */
  const performSizing = useCallback(() => {
    if (!gridApi || !enabled || isSizingRef.current) {
      return;
    }

    try {
      isSizingRef.current = true;

      // Phase 1: Auto-size based on content
      // This sizes columns based on header + sample data while respecting minWidth
      if (gridApi.autoSizeAllColumns) {
        gridApi.autoSizeAllColumns({ skipHeader: false });
      }

      // Small delay to ensure auto-sizing completes
      setTimeout(() => {
        try {
          // Phase 2: Container fitting
          // Get grid container element - try multiple methods for compatibility
          let gridElement: HTMLElement | null = null;
          
          // Method 1: Try getGridElement() if available (newer AG Grid versions)
          if (typeof gridApi.getGridElement === 'function') {
            gridElement = gridApi.getGridElement();
          }
          
          // Method 2: Find grid container through DOM (fallback for older versions)
          if (!gridElement) {
            // Look for AG Grid root element by class name
            const gridRoot = document.querySelector('.ag-theme-quartz, .ag-theme-alpine');
            if (gridRoot && gridRoot instanceof HTMLElement) {
              // Find the actual grid container (usually has .ag-root-wrapper or is the root itself)
              const gridContainer = gridRoot.querySelector('.ag-root-wrapper') || gridRoot;
              if (gridContainer instanceof HTMLElement) {
                gridElement = gridContainer;
              }
            }
          }
          
          if (!gridElement) {
            console.warn('Could not find grid container element');
            isSizingRef.current = false;
            return;
          }

          const containerWidth = gridElement.clientWidth;
          const displayedColumns = gridApi.getDisplayedColumns();
          
          if (!displayedColumns || displayedColumns.length === 0) {
            isSizingRef.current = false;
            return;
          }

          // Calculate total column width
          const totalColumnWidth = displayedColumns.reduce((total: number, col: any) => {
            return total + (col.getActualWidth() || 0);
          }, 0);

          // If columns overflow container, use sizeColumnsToFit to proportionally shrink
          if (totalColumnWidth > containerWidth) {
            if (gridApi.sizeColumnsToFit) {
              gridApi.sizeColumnsToFit();
            }
          }
          // If columns underflow, flex ratios will automatically distribute extra space
          // (handled by AG Grid's flex system)

          console.log('🔍 Column sizing applied:', {
            containerWidth,
            totalColumnWidth,
            overflow: totalColumnWidth > containerWidth,
            columnCount: displayedColumns.length
          });
        } catch (error) {
          console.warn('Column sizing phase 2 failed:', error);
        } finally {
          isSizingRef.current = false;
        }
      }, 50);
    } catch (error) {
      console.warn('Column sizing phase 1 failed:', error);
      isSizingRef.current = false;
    }
  }, [gridApi, enabled]);

  /**
   * Debounced resize handler
   */
  const handleResize = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSizing();
    }, debounceMs);
  }, [performSizing, debounceMs]);

  // Initial sizing when grid API is ready
  useEffect(() => {
    if (!gridApi || !enabled) {
      return;
    }

    // Initial sizing with a small delay to ensure grid is fully rendered
    const initialTimeout = setTimeout(() => {
      performSizing();
    }, 100);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, [gridApi, enabled, performSizing]);

  // ResizeObserver for container size changes
  useEffect(() => {
    if (!gridApi || !enabled || !window.ResizeObserver) {
      return;
    }

    // Get grid container element - try multiple methods for compatibility
    let gridElement: HTMLElement | null = null;
    
    // Method 1: Try getGridElement() if available (newer AG Grid versions)
    if (typeof gridApi.getGridElement === 'function') {
      gridElement = gridApi.getGridElement();
    }
    
    // Method 2: Find grid container through DOM (fallback for older versions)
    if (!gridElement) {
      // Look for AG Grid root element by class name
      const gridRoot = document.querySelector('.ag-theme-quartz, .ag-theme-alpine');
      if (gridRoot && gridRoot instanceof HTMLElement) {
        // Find the actual grid container (usually has .ag-root-wrapper or is the root itself)
        const gridContainer = gridRoot.querySelector('.ag-root-wrapper') || gridRoot;
        if (gridContainer instanceof HTMLElement) {
          gridElement = gridContainer;
        }
      }
    }

    if (!gridElement) {
      console.warn('Could not find grid container element for ResizeObserver');
      return;
    }

    // Create ResizeObserver to watch for container size changes
    resizeObserverRef.current = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserverRef.current.observe(gridElement);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [gridApi, enabled, handleResize]);

  // Manual sizing trigger (can be called externally if needed)
  return {
    performSizing
  };
};
