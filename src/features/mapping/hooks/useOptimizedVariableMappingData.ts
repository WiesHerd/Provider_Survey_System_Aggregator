/**
 * Optimized Variable Mapping Data Hook
 * Enterprise-grade performance with intelligent caching
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPerformanceOptimizedDataService } from '../../../services/PerformanceOptimizedDataService';
import { useProviderContext } from '../../../contexts/ProviderContext';

interface UseOptimizedVariableMappingDataReturn {
  // State
  mappings: any[];
  unmappedVariables: any[];
  learnedMappings: Record<string, string>;
  learnedMappingsWithSource: Array<{original: string, corrected: string, surveySource: string}>;
  loading: boolean;
  error: string | null;
  activeTab: 'unmapped' | 'mapped' | 'learned';
  
  // Search state
  searchTerm: string;
  mappedSearchTerm: string;
  
  // Computed values
  filteredUnmapped: any[];
  filteredMappings: any[];
  filteredLearned: Record<string, string>;
  
  // Actions
  setActiveTab: (tab: 'unmapped' | 'mapped' | 'learned') => void;
  setSearchTerm: (term: string) => void;
  setMappedSearchTerm: (term: string) => void;
  
  // Data operations
  loadData: () => Promise<void>;
  removeLearnedMapping: (original: string) => Promise<void>;
  clearAllLearnedMappings: () => Promise<void>;
  applyAllLearnedMappings: () => Promise<void>;
  
  // Performance
  refreshData: () => Promise<void>;
  clearCache: () => void;
  getCacheStats: () => any;
  clearError: () => void;
}

/**
 * Optimized hook for managing variable mapping data
 */
export const useOptimizedVariableMappingData = (): UseOptimizedVariableMappingDataReturn => {
  // Provider context
  const { selectedProviderType } = useProviderContext();
  
  // Core state
  const [mappings, setMappings] = useState<any[]>([]);
  const [unmappedVariables, setUnmappedVariables] = useState<any[]>([]);
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  const [learnedMappingsWithSource, setLearnedMappingsWithSource] = useState<Array<{original: string, corrected: string, surveySource: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');
  
  // Performance service
  const performanceService = useMemo(() => getPerformanceOptimizedDataService(), []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Smart tab selection
  useEffect(() => {
    if (!loading) {
      if (unmappedVariables.length > 0) {
        setActiveTab('unmapped');
      } else if (Object.keys(learnedMappings).length > 0) {
        setActiveTab('learned');
      } else {
        setActiveTab('mapped');
      }
    }
  }, [loading, unmappedVariables.length, learnedMappings]);

  // Computed values with memoization
  const filteredUnmapped = useMemo(() => {
    if (!searchTerm) return unmappedVariables;
    return unmappedVariables.filter(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unmappedVariables, searchTerm]);

  const filteredMappings = useMemo(() => {
    if (!mappedSearchTerm) return mappings;
    return mappings.filter(mapping => 
      mapping.standardizedName?.toLowerCase().includes(mappedSearchTerm.toLowerCase())
    );
  }, [mappings, mappedSearchTerm]);

  const filteredLearned = useMemo(() => {
    if (!mappedSearchTerm) return learnedMappings;
    const filtered: Record<string, string> = {};
    Object.entries(learnedMappings).forEach(([key, value]) => {
      if (key.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
          value.toLowerCase().includes(mappedSearchTerm.toLowerCase())) {
        filtered[key] = value;
      }
    });
    return filtered;
  }, [learnedMappings, mappedSearchTerm]);

  // Optimized data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Loading optimized variable mapping data...');
      const startTime = performance.now();
      
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      const data = await performanceService.getVariableMappingData(dataProviderType);
      
      const duration = performance.now() - startTime;
      console.log(`✅ Variable mapping data loaded in ${duration.toFixed(2)}ms`);
      
      setMappings(data.mappings);
      setUnmappedVariables(data.unmapped);
      setLearnedMappings(data.learned);
      setLearnedMappingsWithSource(data.learnedWithSource);
      
    } catch (err) {
      console.error('Error loading optimized variable mapping data:', err);
      setError('Failed to load variable mapping data');
    } finally {
      setLoading(false);
    }
  }, [performanceService, selectedProviderType]);

  // Reload data when provider type changes
  useEffect(() => {
    loadData();
  }, [selectedProviderType, loadData]);

  // Data operations
  const removeLearnedMapping = useCallback(async (original: string) => {
    console.log('Removing learned mapping:', original);
    // Implementation would go here
  }, []);

  const clearAllLearnedMappings = useCallback(async () => {
    console.log('Clearing all learned mappings...');
    // Implementation would go here
  }, []);

  const applyAllLearnedMappings = useCallback(async () => {
    console.log('Applying all learned mappings...');
    // Implementation would go here
  }, []);

  // Performance operations
  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing variable mapping data...');
    performanceService.clearCache('variable_mapping');
    await loadData();
  }, [performanceService, loadData]);

  const clearCache = useCallback(() => {
    performanceService.clearCache();
    console.log('🗑️ Cache cleared');
  }, [performanceService]);

  const getCacheStats = useCallback(() => {
    return performanceService.getCacheStats();
  }, [performanceService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    mappings,
    unmappedVariables,
    learnedMappings,
    learnedMappingsWithSource,
    loading,
    error,
    activeTab,
    
    // Search state
    searchTerm,
    mappedSearchTerm,
    
    // Computed values
    filteredUnmapped,
    filteredMappings,
    filteredLearned,
    
    // Actions
    setActiveTab,
    setSearchTerm,
    setMappedSearchTerm,
    
    // Data operations
    loadData,
    removeLearnedMapping,
    clearAllLearnedMappings,
    applyAllLearnedMappings,
    
    // Performance
    refreshData,
    clearCache,
    getCacheStats,
    clearError
  };
};
