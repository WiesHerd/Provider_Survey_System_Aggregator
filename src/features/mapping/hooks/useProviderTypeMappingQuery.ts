/**
 * Enterprise-Grade React Query Hook for Provider Type Mappings
 * Lightning-fast caching with stale-while-revalidate pattern
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataService } from '../../../services/DataService';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { queryKeys } from '../../../shared/services/queryClient';

interface ProviderTypeMappingData {
  mappings: any[];
  unmapped: any[];
  learned: Record<string, string>;
  learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
}

/**
 * @param showAllCategories - When true, load all provider types (cache key 'all'). When false, use selectedProviderType from context.
 */
export const useProviderTypeMappingQuery = (showAllCategories: boolean = false) => {
  const { selectedProviderType } = useProviderContext();
  const queryClient = useQueryClient();
  const dataService = new DataService();
  
  const dataProviderType = showAllCategories
    ? undefined
    : (selectedProviderType === 'BOTH' ? undefined : selectedProviderType);
  const cacheKey = [...queryKeys.mappings.providerType(), dataProviderType || 'all'] as const;
  
  const query = useQuery<ProviderTypeMappingData>({
    queryKey: cacheKey,
    placeholderData: (previousData) => previousData, // Stale-while-revalidate (same as Analysis Tools)
    queryFn: async () => {
      const startTime = performance.now();
      
      const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
        dataService.getProviderTypeMappings(dataProviderType),
        dataService.getUnmappedProviderTypes(dataProviderType),
        dataService.getLearnedMappings('providerType', dataProviderType),
        dataService.getLearnedMappingsWithSource('providerType', dataProviderType)
      ]);
      
      const duration = performance.now() - startTime;
      console.log(`✅ Provider type mapping data loaded in ${duration.toFixed(2)}ms`);
      
      return {
        mappings: mappings || [],
        unmapped: unmapped || [],
        learned: learned || {},
        learnedWithSource: learnedWithSource || []
      };
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
    retryDelay: 1000,
  });
  
  const createMappingMutation = useMutation({
    mutationFn: async (mapping: any) => await dataService.createProviderTypeMapping(mapping),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });
  
  const updateMappingMutation = useMutation({
    mutationFn: async ({ id, mapping }: { id: string; mapping: any }) => 
      await dataService.updateProviderTypeMapping(id, mapping),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });
  
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => await dataService.deleteProviderTypeMapping(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });
  
  const clearAllMappingsMutation = useMutation({
    mutationFn: async () => await dataService.clearAllProviderTypeMappings(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });

  const removeLearnedMappingMutation = useMutation({
    mutationFn: async (original: string) => {
      await dataService.removeLearnedMapping('providerType', original);
      return original;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });
  
  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    mappings: query.data?.mappings || [],
    unmapped: query.data?.unmapped || [],
    learned: query.data?.learned || {},
    learnedWithSource: query.data?.learnedWithSource || [],
    refetch: query.refetch,
    createMapping: createMappingMutation.mutateAsync,
    updateMapping: updateMappingMutation.mutateAsync,
    deleteMapping: deleteMappingMutation.mutateAsync,
    clearAllMappings: clearAllMappingsMutation.mutateAsync,
    removeLearnedMapping: removeLearnedMappingMutation.mutateAsync,
    isCreating: createMappingMutation.isPending,
    isUpdating: updateMappingMutation.isPending,
    isDeleting: deleteMappingMutation.isPending,
  };
};





