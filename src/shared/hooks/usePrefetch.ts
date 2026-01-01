/**
 * Enterprise Prefetching Hook
 * Prefetches data on route hover/navigation for instant loading
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../services/queryClient';
import { DataService } from '../../services/DataService';
import { AnalyticsDataService } from '../../features/analytics/services/analyticsDataService';

/**
 * Prefetch mapping data for instant navigation
 */
export const usePrefetchMappings = () => {
  const queryClient = useQueryClient();
  const dataService = new DataService();
  
  const prefetchSpecialtyMappings = async (providerType?: string) => {
    const cacheKey = [...queryKeys.mappings.specialty(), providerType || 'all'] as const;
    
    // Prefetch if not already cached
    if (!queryClient.getQueryData(cacheKey)) {
      await queryClient.prefetchQuery({
        queryKey: cacheKey,
        queryFn: async () => {
          const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
            dataService.getAllSpecialtyMappings(providerType),
            dataService.getUnmappedSpecialties(providerType),
            dataService.getLearnedMappings('specialty', providerType),
            dataService.getLearnedMappingsWithSource('specialty', providerType)
          ]);
          return { mappings, unmapped, learned, learnedWithSource };
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
      });
    }
  };
  
  const prefetchVariableMappings = async (providerType?: string) => {
    const cacheKey = [...queryKeys.mappings.variable(), providerType || 'all'] as const;
    
    if (!queryClient.getQueryData(cacheKey)) {
      await queryClient.prefetchQuery({
        queryKey: cacheKey,
        queryFn: async () => {
          const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
            dataService.getVariableMappings(providerType),
            dataService.getUnmappedVariables(providerType),
            dataService.getLearnedMappings('variable', providerType),
            dataService.getLearnedMappingsWithSource('variable', providerType)
          ]);
          return { mappings, unmapped, learned, learnedWithSource };
        },
        staleTime: 1000 * 60 * 60 * 24,
      });
    }
  };
  
  const prefetchRegionMappings = async (providerType?: string) => {
    const cacheKey = [...queryKeys.mappings.region(), providerType || 'all'] as const;
    
    if (!queryClient.getQueryData(cacheKey)) {
      await queryClient.prefetchQuery({
        queryKey: cacheKey,
        queryFn: async () => {
          const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
            dataService.getRegionMappings(providerType),
            dataService.getUnmappedRegions(providerType),
            dataService.getLearnedMappings('region', providerType),
            dataService.getLearnedMappingsWithSource('region', providerType)
          ]);
          return { mappings, unmapped, learned, learnedWithSource };
        },
        staleTime: 1000 * 60 * 60 * 24,
      });
    }
  };
  
  const prefetchColumnMappings = async (providerType?: string) => {
    const cacheKey = [...queryKeys.mappings.column(), providerType || 'all'] as const;
    
    if (!queryClient.getQueryData(cacheKey)) {
      await queryClient.prefetchQuery({
        queryKey: cacheKey,
        queryFn: async () => {
          const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
            dataService.getAllColumnMappings(providerType),
            dataService.getUnmappedColumns(providerType),
            dataService.getLearnedMappings('column', providerType),
            dataService.getLearnedMappingsWithSource('column', providerType)
          ]);
          return { mappings, unmapped, learned, learnedWithSource };
        },
        staleTime: 1000 * 60 * 60 * 24,
      });
    }
  };
  
  const prefetchAnalytics = async () => {
    const cacheKey = queryKeys.benchmarking({
      specialty: '',
      surveySource: '',
      region: '',
      providerType: '',
      year: ''
    });
    
    if (!queryClient.getQueryData(cacheKey)) {
      await queryClient.prefetchQuery({
        queryKey: cacheKey,
        queryFn: async () => {
          const analyticsService = new AnalyticsDataService();
          const data = await analyticsService.getAnalyticsDataByVariables({
            specialty: '',
            surveySource: '',
            geographicRegion: '',
            providerType: '',
            year: ''
          }, []);
          return { data, mappings: [], columnMappings: [], regionMappings: [] };
        },
        staleTime: 1000 * 60 * 60, // 1 hour for analytics
      });
    }
  };
  
  return {
    prefetchSpecialtyMappings,
    prefetchVariableMappings,
    prefetchRegionMappings,
    prefetchColumnMappings,
    prefetchAnalytics,
  };
};

