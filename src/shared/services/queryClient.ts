/**
 * TanStack Query Client Configuration
 * 
 * Enterprise-grade query client with IndexedDB persistence, intelligent caching,
 * and request deduplication for optimal performance.
 */

import { QueryClient } from '@tanstack/react-query';
import { get, set, del } from 'idb-keyval';

/**
 * Custom IndexedDB persister for TanStack Query
 * Implements the Persister interface using idb-keyval
 */
const createIndexedDBPersister = () => {
  const STORAGE_KEY = 'REACT_QUERY_OFFLINE_CACHE';
  
  return {
    persistClient: async (client: string) => {
      try {
        await set(STORAGE_KEY, client);
      } catch (error) {
        console.error('Failed to persist query client to IndexedDB:', error);
      }
    },
    restoreClient: async (): Promise<string | undefined> => {
      try {
        const cached = await get<string>(STORAGE_KEY);
        return cached || undefined;
      } catch (error) {
        console.error('Failed to restore query client from IndexedDB:', error);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to remove query client from IndexedDB:', error);
      }
    },
  };
};

const indexedDBPersister = createIndexedDBPersister();

/**
 * Create and configure QueryClient with enterprise defaults
 * 
 * Cache Policies:
 * - Taxonomy/FMV refs: 7d staleTime, 14d gcTime (rarely changes)
 * - Survey slices & benchmarking: 24h staleTime, 7d gcTime
 * - Custom blends: 24h staleTime, invalidate on mutation
 * - Report definitions: 24h staleTime
 * - Mapping data: 1h staleTime, invalidate on mutation
 * - Survey list: 5m staleTime, invalidate on upload/delete
 */
export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // ENTERPRISE: Aggressive caching for lightning-fast performance
        // Stale-while-revalidate: show cached data immediately, refresh in background
        staleTime: 1000 * 60 * 60 * 24, // 24 hours default - data rarely changes
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days default (garbage collection)
        
        // Retry configuration
        retry: 2, // Reduced retries for faster failure detection
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Faster backoff, max 10s
        
        // Refetch behavior - ENTERPRISE: Aggressive caching for instant navigation
        // Data only changes on explicit user actions (upload/delete/mapping), which invalidate cache
        refetchOnWindowFocus: false, // Don't refetch on focus - data is local
        refetchOnReconnect: false, // Don't refetch on reconnect - data is local (IndexedDB)
        refetchOnMount: false, // Don't refetch if data is fresh (stale-while-revalidate)
        
        // Network mode
        networkMode: 'online', // Only fetch when online
      },
      mutations: {
        retry: 1, // Retry mutations once
        networkMode: 'online',
      },
    },
  });

  // Enable persistence to IndexedDB
  if (typeof window !== 'undefined') {
    // Persist query cache to IndexedDB on changes
    const persistCache = async () => {
      try {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll();
        const cacheData: Record<string, any> = {};
        
        queries.forEach(query => {
          if (query.state.data !== undefined) {
            cacheData[query.queryHash] = {
              data: query.state.data,
              dataUpdatedAt: query.state.dataUpdatedAt,
              status: query.state.status,
              queryKey: query.queryKey,
            };
          }
        });
        
        await indexedDBPersister.persistClient(JSON.stringify(cacheData));
      } catch (error) {
        console.error('Failed to persist query cache:', error);
      }
    };

    // Restore cache from IndexedDB on initialization
    const restoreCache = async () => {
      try {
        const cached = await indexedDBPersister.restoreClient();
        if (cached) {
          const cacheData = JSON.parse(cached);
          
          Object.entries(cacheData).forEach(([queryHash, queryData]: [string, any]) => {
            // Only restore if data is less than 24 hours old
            const age = Date.now() - queryData.dataUpdatedAt;
            const maxAge = 1000 * 60 * 60 * 24; // 24 hours
            
            if (age < maxAge) {
              queryClient.setQueryData(queryData.queryKey, queryData.data, {
                updatedAt: queryData.dataUpdatedAt,
              });
            }
          });
          
          console.log('✅ Query cache restored from IndexedDB');
        }
      } catch (error) {
        console.error('Failed to restore query cache:', error);
      }
    };

    // Restore on initialization
    restoreCache();

    // Persist on cache updates (debounced)
    let persistTimeout: NodeJS.Timeout;
    const cache = queryClient.getQueryCache();
    cache.subscribe(() => {
      clearTimeout(persistTimeout);
      persistTimeout = setTimeout(persistCache, 1000); // Debounce by 1 second
    });

    console.log('✅ Query client initialized with IndexedDB persistence');
  }

  return queryClient;
};

/**
 * Singleton QueryClient instance
 * Created once and reused throughout the app
 */
export const queryClient = createQueryClient();

/**
 * Query key factories for type-safe cache keys
 */
export const queryKeys = {
  // Benchmarking queries
  benchmarking: (filters: {
    year?: string;
    specialty?: string;
    providerType?: string;
    region?: string;
    surveySource?: string;
  }) => ['benchmarking', filters] as const,

  // Regional analytics queries
  regional: (filters: {
    specialty?: string;
    providerType?: string;
    surveySource?: string;
    year?: string;
  }) => ['regional', filters] as const,

  // Reports queries
  reports: (filtersHash: string) => ['reports', filtersHash] as const,

  // FMV queries
  fmv: (filters: {
    specialty?: string;
    providerType?: string;
    region?: string;
    year?: string;
    aggregationMethod?: string;
  }) => ['fmv', filters] as const,

  // Blending queries
  blending: (blendId: string, version: string, inputsHash: string) =>
    ['blending', blendId, version, inputsHash] as const,

  // Survey queries
  surveys: () => ['surveys', 'list'] as const,
  surveyList: (year?: string, providerType?: string) => ['surveys', 'list', year, providerType] as const,
  surveyData: (surveyId: string, filtersHash: string) =>
    ['surveyData', surveyId, filtersHash] as const,

  // Mapping queries
  mappings: {
    specialty: () => ['mappings', 'specialty'] as const,
    column: () => ['mappings', 'column'] as const,
    region: () => ['mappings', 'region'] as const,
    providerType: () => ['mappings', 'providerType'] as const,
    variable: () => ['mappings', 'variable'] as const,
  },

  // Taxonomy queries
  taxonomy: (datasetVersion: string) => ['taxonomy', datasetVersion] as const,
} as const;

