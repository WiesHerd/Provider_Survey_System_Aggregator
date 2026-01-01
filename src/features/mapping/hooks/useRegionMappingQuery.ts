/**
 * Enterprise-Grade React Query Hook for Region Mappings
 * Lightning-fast caching with stale-while-revalidate pattern
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataService } from '../../../services/DataService';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { queryKeys } from '../../../shared/services/queryClient';

interface RegionMappingData {
  mappings: any[];
  unmapped: any[];
  learned: Record<string, string>;
  learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
}

export const useRegionMappingQuery = () => {
  const { selectedProviderType } = useProviderContext();
  const queryClient = useQueryClient();
  const dataService = new DataService();
  
  const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
  const cacheKey = [...queryKeys.mappings.region(), dataProviderType || 'all'] as const;
  
  const query = useQuery<RegionMappingData>({
    queryKey: cacheKey,
    queryFn: async () => {
      const startTime = performance.now();
      
      const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
        dataService.getRegionMappings(dataProviderType),
        dataService.getUnmappedRegions(dataProviderType),
        dataService.getLearnedMappings('region', dataProviderType),
        dataService.getLearnedMappingsWithSource('region', dataProviderType)
      ]);
      
      const duration = performance.now() - startTime;
      console.log(`✅ Region mapping data loaded in ${duration.toFixed(2)}ms`);
      
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
    mutationFn: async (mapping: any) => await dataService.createRegionMapping(mapping),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });
  
  const updateMappingMutation = useMutation({
    mutationFn: async ({ id, mapping }: { id: string; mapping: any }) => 
      await dataService.updateRegionMapping(id, mapping),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });
  
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => await dataService.deleteRegionMapping(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });
  
  const clearAllMappingsMutation = useMutation({
    mutationFn: async () => await dataService.clearAllRegionMappings(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });
  
  const removeLearnedMappingMutation = useMutation({
    mutationFn: async (original: string) => {
      await dataService.removeLearnedMapping('region', original);
      return original;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
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

