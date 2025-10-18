/**
 * Intelligent caching hook for specialty mapping data
 * Implements multi-level caching with smart invalidation
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/mapping';
import { getDataService } from '../../../services/DataService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

interface CacheState {
  mappings: CacheEntry<ISpecialtyMapping[]> | null;
  unmappedSpecialties: CacheEntry<IUnmappedSpecialty[]> | null;
  learnedMappings: CacheEntry<Record<string, string>> | null;
  lastDataVersion: number;
}

interface UseMappingCacheReturn {
  // Cache state
  isCached: (key: keyof Omit<CacheState, 'lastDataVersion'>) => boolean;
  getCacheAge: (key: keyof Omit<CacheState, 'lastDataVersion'>) => number;
  
  // Cache operations
  getCachedData: <T>(key: keyof Omit<CacheState, 'lastDataVersion'>) => T | null;
  setCachedData: <T>(key: keyof Omit<CacheState, 'lastDataVersion'>, data: T) => void;
  invalidateCache: (key?: keyof Omit<CacheState, 'lastDataVersion'>) => void;
  invalidateAllCache: () => void;
  
  // Smart data loading
  loadDataWithCache: () => Promise<{
    mappings: ISpecialtyMapping[];
    unmappedSpecialties: IUnmappedSpecialty[];
    learnedMappings: Record<string, string>;
  }>;
  
  // Cache statistics
  getCacheStats: () => {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
  };
}

// Cache configuration
const CACHE_CONFIG = {
  // Cache TTL (Time To Live) in milliseconds
  TTL: {
    mappings: 5 * 60 * 1000,        // 5 minutes - mappings change infrequently
    unmappedSpecialties: 2 * 60 * 1000, // 2 minutes - unmapped changes more often
    learnedMappings: 10 * 60 * 1000,    // 10 minutes - learned mappings are very stable
  },
  
  // Maximum cache size (number of entries)
  MAX_ENTRIES: 100,
  
  // Cache version for invalidation
  VERSION: 1,
} as const;

export const useMappingCache = (): UseMappingCacheReturn => {
  const [cacheState, setCacheState] = useState<CacheState>({
    mappings: null,
    unmappedSpecialties: null,
    learnedMappings: null,
    lastDataVersion: CACHE_CONFIG.VERSION,
  });

  // Cache statistics
  const cacheStats = useRef({
    hits: 0,
    misses: 0,
    totalRequests: 0,
  });

  // Service instance
  const dataService = useMemo(() => getDataService(), []);

  // Check if cache entry is valid
  const isCacheValid = useCallback((entry: CacheEntry<any> | null, ttl: number): boolean => {
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    return age < ttl && entry.version === CACHE_CONFIG.VERSION;
  }, []);

  // Check if specific cache key is cached and valid
  const isCached = useCallback((key: keyof Omit<CacheState, 'lastDataVersion'>): boolean => {
    const entry = cacheState[key];
    const ttl = CACHE_CONFIG.TTL[key];
    return isCacheValid(entry, ttl);
  }, [cacheState, isCacheValid]);

  // Get cache age in milliseconds
  const getCacheAge = useCallback((key: keyof Omit<CacheState, 'lastDataVersion'>): number => {
    const entry = cacheState[key];
    return entry ? Date.now() - entry.timestamp : 0;
  }, [cacheState]);

  // Get cached data
  const getCachedData = useCallback(<T>(key: keyof Omit<CacheState, 'lastDataVersion'>): T | null => {
    cacheStats.current.totalRequests++;
    
    if (isCached(key)) {
      cacheStats.current.hits++;
      return cacheState[key]?.data as T;
    }
    
    cacheStats.current.misses++;
    return null;
  }, [cacheState, isCached]);

  // Set cached data
  const setCachedData = useCallback(<T>(key: keyof Omit<CacheState, 'lastDataVersion'>, data: T): void => {
    setCacheState(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: Date.now(),
        version: CACHE_CONFIG.VERSION,
      },
    }));
  }, []);

  // Invalidate specific cache entry
  const invalidateCache = useCallback((key?: keyof Omit<CacheState, 'lastDataVersion'>): void => {
    if (key) {
      setCacheState(prev => ({
        ...prev,
        [key]: null,
      }));
    } else {
      // Invalidate all cache
      invalidateAllCache();
    }
  }, []);

  // Invalidate all cache entries
  const invalidateAllCache = useCallback((): void => {
    setCacheState(prev => ({
      mappings: null,
      unmappedSpecialties: null,
      learnedMappings: null,
      lastDataVersion: CACHE_CONFIG.VERSION + 1,
    }));
  }, []);

  // Smart data loading with cache - stable function
  const loadDataWithCache = useCallback(async () => {
    // Try to get cached data first
    const cachedMappings = getCachedData<ISpecialtyMapping[]>('mappings');
    const cachedUnmapped = getCachedData<IUnmappedSpecialty[]>('unmappedSpecialties');
    const cachedLearned = getCachedData<Record<string, string>>('learnedMappings');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Cache loading status:', {
        mappings: cachedMappings ? '✅ cached' : '❌ needs load',
        unmapped: cachedUnmapped ? '✅ cached' : '❌ needs load',
        learned: cachedLearned ? '✅ cached' : '❌ needs load',
      });
    }

    // Determine what needs to be loaded
    const needsMappings = !cachedMappings;
    const needsUnmapped = !cachedUnmapped;
    const needsLearned = !cachedLearned;

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Cache loading status:', {
        mappings: cachedMappings ? '✅ cached' : '❌ needs load',
        unmapped: cachedUnmapped ? '✅ cached' : '❌ needs load',
        learned: cachedLearned ? '✅ cached' : '❌ needs load',
      });
    }

    // Load only what's needed
    const loadPromises: Promise<any>[] = [];
    
    if (needsMappings) {
      loadPromises.push(
        dataService.getAllSpecialtyMappings().then(data => {
          setCachedData('mappings', data);
          return data;
        })
      );
    }
    
    if (needsUnmapped) {
      loadPromises.push(
        dataService.getUnmappedSpecialties().then(data => {
          setCachedData('unmappedSpecialties', data);
          return data;
        })
      );
    }
    
    if (needsLearned) {
      loadPromises.push(
        dataService.getLearnedMappings('specialty').then(data => {
          setCachedData('learnedMappings', data || {});
          return data || {};
        })
      );
    }

    // Wait for all needed data to load
    const results = await Promise.all(loadPromises);
    
    // Return combined results
    const result = {
      mappings: cachedMappings || results[needsMappings ? 0 : -1] || [],
      unmappedSpecialties: cachedUnmapped || results[needsUnmapped ? (needsMappings ? 1 : 0) : -1] || [],
      learnedMappings: cachedLearned || results[needsLearned ? (loadPromises.length - 1) : -1] || {},
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Cache results:', {
        mappings: result.mappings.length,
        unmapped: result.unmappedSpecialties.length,
        learned: Object.keys(result.learnedMappings).length,
        cacheHitRate: `${Math.round((cacheStats.current.hits / cacheStats.current.totalRequests) * 100)}%`,
      });
    }

    return result;
  }, [dataService]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const totalEntries = Object.values(cacheState).filter(entry => 
      entry && typeof entry === 'object' && 'data' in entry
    ).length;
    
    const totalSize = JSON.stringify(cacheState).length;
    const hitRate = cacheStats.current.totalRequests > 0 
      ? (cacheStats.current.hits / cacheStats.current.totalRequests) * 100 
      : 0;

    return {
      totalEntries,
      totalSize,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }, [cacheState]);

  return {
    isCached,
    getCacheAge,
    getCachedData,
    setCachedData,
    invalidateCache,
    invalidateAllCache,
    loadDataWithCache,
    getCacheStats,
  };
};
