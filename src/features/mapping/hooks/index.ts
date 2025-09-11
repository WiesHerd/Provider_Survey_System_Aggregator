// Barrel exports for mapping hooks
// This provides a clean public API for the mapping feature

// Unified hook (main export)
export { useMappingDataUnified as useMappingData } from './useMappingDataUnified';

// Individual focused hooks (for advanced use cases)
export { useMappingState } from './useMappingState';
export { useMappingSearch } from './useMappingSearch';
export { useMappingOperations } from './useMappingOperations';
export { useAutoMapping } from './useAutoMapping';
export { useMappingSelection } from './useMappingSelection';
export { useMappingCache } from './useMappingCache';
export { usePerformanceMonitor } from './usePerformanceMonitor';
export { usePerformanceAnalytics } from './usePerformanceAnalytics';

// Legacy hook (deprecated - will be removed)
export { useMappingData as useMappingDataLegacy } from './useMappingData';
