import { useQuery } from '@tanstack/react-query';
import { getDataService } from '../../../services/DataService';
import { queryKeys } from '../../../shared/services/queryClient';
import { createQueryFn } from '../../../shared/services/queryFetcher';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/mapping';

/**
 * Specialty mapping data structure returned by the query
 */
export interface SpecialtyMappingData {
  mappings: ISpecialtyMapping[];
  unmapped: IUnmappedSpecialty[];
  learned: Record<string, string>;
  learnedWithSource: Array<{original: string, corrected: string, surveySource: string}>;
}

/**
 * Fetch specialty mapping data from IndexedDB
 */
async function fetchSpecialtyMappingData(
  providerType?: string,
  signal?: AbortSignal
): Promise<SpecialtyMappingData> {
  const dataService = getDataService();
  
  console.log(`🔍 fetchSpecialtyMappingData: Called with providerType=${providerType}`);
  
  // Fetch all data in parallel
  const [mappings, unmapped, learned, learnedWithSource] = await Promise.all([
    dataService.getAllSpecialtyMappings(providerType),
    dataService.getUnmappedSpecialties(providerType).catch((error) => {
      console.error('❌ fetchSpecialtyMappingData: Error getting unmapped specialties:', error);
      return [];
    }),
    dataService.getLearnedMappings('specialty', providerType).catch(() => ({})), // Optional
    dataService.getLearnedMappingsWithSource('specialty', providerType).catch(() => []) // Optional
  ]);
  
  console.log(`✅ fetchSpecialtyMappingData: Retrieved ${unmapped.length} unmapped specialties`);
  
  return {
    mappings,
    unmapped,
    learned: learned || {},
    learnedWithSource: learnedWithSource || []
  };
}

/**
 * Hook for fetching specialty mapping data with TanStack Query caching
 * 
 * This provides Google-style caching:
 * - Instant navigation with cached data
 * - Background refresh when data is stale
 * - Automatic cache invalidation on mutations
 * 
 * @param providerType - Provider type to filter by (optional, 'BOTH' means no filter)
 * @param enabled - Whether the query should run (default: true)
 */
export const useSpecialtyMappingQuery = (
  providerType?: string,
  enabled: boolean = true
) => {
  const queryKey = queryKeys.mappings.specialty();
  
  const query = useQuery<SpecialtyMappingData>({
    queryKey,
    queryFn: createQueryFn((signal) => fetchSpecialtyMappingData(providerType, signal)),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - mapping data changes on create/delete
    gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache for 30 minutes
    refetchOnWindowFocus: true, // Refetch on focus (mappings might be created elsewhere)
    refetchOnMount: false, // Use cached data if available (stale-while-revalidate)
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
  
  return {
    data: query.data || {
      mappings: [],
      unmapped: [],
      learned: {},
      learnedWithSource: []
    },
    // Show loading only on initial load (isLoading), not background refresh (isFetching)
    // This provides instant navigation with cached data, but shows spinner on first load
    loading: query.isLoading,
    // Expose isFetching separately for subtle background refresh indicators
    isFetching: query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    refetch: query.refetch,
  };
};

