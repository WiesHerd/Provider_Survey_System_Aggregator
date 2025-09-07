/**
 * React hook for integrating the new deterministic mapping engine
 * with your existing specialty mapping UI
 */

import { useState, useCallback, useMemo } from 'react';
import { SpecialtyMappingIntegration, MappingEngineConfig, AutoMappingResult } from './SpecialtyMappingIntegration';
import { IUnmappedSpecialty, ISpecialtyMapping } from '../../types/specialty';
// Note: ToastContext may not exist in your project
// You can replace this with your existing toast/notification system
// import { useToast } from '../../../contexts/ToastContext';

/**
 * Configuration for the new mapping engine
 */
export interface NewMappingEngineConfig {
  /** Source identifier (Gallagher, SullivanCotter, MGMA, etc.) */
  source: string;
  /** Confidence threshold for auto-mapping (0-1) */
  confidenceThreshold: number;
  /** Whether to use existing mappings as reference */
  useExistingMappings: boolean;
  /** Whether to use fuzzy matching */
  useFuzzyMatching: boolean;
}

/**
 * Hook return type
 */
export interface UseNewMappingEngineReturn {
  /** Whether auto-mapping is in progress */
  isAutoMapping: boolean;
  /** Error message if any */
  error: string | null;
  /** Auto-map specialties using the new engine */
  autoMapSpecialties: (specialties: IUnmappedSpecialty[]) => Promise<AutoMappingResult>;
  /** Get mapping suggestions for a specific specialty */
  getMappingSuggestions: (specialty: string) => Promise<Array<{
    canonicalId: string;
    name: string;
    confidence: number;
    reasons: string[];
  }>>;
  /** Update configuration */
  updateConfig: (config: Partial<NewMappingEngineConfig>) => void;
  /** Current configuration */
  config: NewMappingEngineConfig;
}

/**
 * Hook for using the new deterministic mapping engine
 */
export function useNewMappingEngine(
  initialConfig: NewMappingEngineConfig
): UseNewMappingEngineReturn {
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<NewMappingEngineConfig>(initialConfig);
  // Replace with your existing toast/notification system
  // const { success, error: showError } = useToast();
  
  // Simple console-based notifications for now
  const success = (message: string) => console.log('✅', message);
  const showError = (message: string) => console.error('❌', message);

  // Create integration instance
  const integration = useMemo(() => {
    const engineConfig: MappingEngineConfig = {
      confidenceThreshold: config.confidenceThreshold,
      useExistingMappings: config.useExistingMappings,
      useFuzzyMatching: config.useFuzzyMatching,
      source: config.source
    };
    
    return new SpecialtyMappingIntegration(engineConfig);
  }, [config]);

  /**
   * Auto-map specialties using the new engine
   */
  const autoMapSpecialties = useCallback(async (specialties: IUnmappedSpecialty[]): Promise<AutoMappingResult> => {
    try {
      setIsAutoMapping(true);
      setError(null);

      console.log(`Starting auto-mapping for ${specialties.length} specialties using new engine...`);
      
      const result = await integration.autoMapSpecialties(specialties);
      
      console.log(`Auto-mapping completed: ${result.mappedCount} mapped, ${result.unmappedCount} unmapped`);
      
      // Show success message
      success(`Auto-mapping completed: ${result.mappedCount} specialties mapped, ${result.unmappedCount} need manual review`);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      showError(`Auto-mapping failed: ${errorMessage}`);
      throw err;
    } finally {
      setIsAutoMapping(false);
    }
  }, [integration, success, showError]);

  /**
   * Get mapping suggestions for a specific specialty
   */
  const getMappingSuggestions = useCallback(async (specialty: string) => {
    try {
      setError(null);
      return await integration.getMappingSuggestions(specialty);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      showError(`Failed to get suggestions: ${errorMessage}`);
      throw err;
    }
  }, [integration, showError]);

  /**
   * Update configuration
   */
  const updateConfig = useCallback((newConfig: Partial<NewMappingEngineConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  return {
    isAutoMapping,
    error,
    autoMapSpecialties,
    getMappingSuggestions,
    updateConfig,
    config
  };
}
