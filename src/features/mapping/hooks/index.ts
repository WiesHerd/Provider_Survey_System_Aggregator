// Barrel exports for mapping hooks
// This provides a clean public API for the mapping feature

// Unified hook (main export)
export { useMappingDataUnified as useMappingData } from './useMappingDataUnified';

// Individual focused hooks (for advanced use cases)
export { useMappingState } from './useMappingState';
export { useMappingSearch } from './useMappingSearch';
export { useMappingOperations } from './useMappingOperations';
export { useMappingSelection } from './useMappingSelection';
export { useMappingCache } from './useMappingCache';
export { usePerformanceMonitor } from './usePerformanceMonitor';
export { usePerformanceAnalytics } from './usePerformanceAnalytics';

// Optimized hooks
export { useOptimizedColumnMappingData } from './useOptimizedColumnMappingData';
export { useOptimizedMappingData } from './useOptimizedMappingData';
export { useOptimizedProviderTypeMappingData } from './useOptimizedProviderTypeMappingData';
export { useOptimizedRegionMappingData } from './useOptimizedRegionMappingData';
export { useOptimizedVariableMappingData } from './useOptimizedVariableMappingData';

// Legacy hook (deprecated - will be removed)
export { useMappingData as useMappingDataLegacy } from './useMappingData';
