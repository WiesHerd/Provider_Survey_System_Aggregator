/**
 * Selection History Hook
 * 
 * Manages undo/redo functionality for row selections
 */

import { useState, useCallback, useRef } from 'react';

interface SelectionHistoryState {
  past: number[][];
  present: number[];
  future: number[][];
}

export const useSelectionHistory = (initialSelection: number[] = []) => {
  const [history, setHistory] = useState<SelectionHistoryState>({
    past: [],
    present: initialSelection,
    future: []
  });

  const isUpdatingRef = useRef(false);

  const updateSelection = useCallback((newSelection: number[], skipHistory = false) => {
    if (skipHistory) {
      setHistory(prev => ({
        ...prev,
        present: newSelection
      }));
      return;
    }

    isUpdatingRef.current = true;
    setHistory(prev => {
      // Only add to history if selection actually changed
      const hasChanged = prev.present.length !== newSelection.length ||
        prev.present.some((val, idx) => val !== newSelection[idx]);
      
      if (!hasChanged) {
        isUpdatingRef.current = false;
        return prev;
      }

      return {
        past: [...prev.past, prev.present],
        present: newSelection,
        future: [] // Clear future when new action is performed
      };
    });
    
    // Reset flag after state update
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  }, []);

  const undo = useCallback(() => {
    if (isUpdatingRef.current) return;
    
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    if (isUpdatingRef.current) return;
    
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      
      const next: number[] = prev.future[0];
      const newFuture = prev.future.slice(1);
      
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    selection: history.present,
    updateSelection,
    undo,
    redo,
    canUndo,
    canRedo
  };
};

