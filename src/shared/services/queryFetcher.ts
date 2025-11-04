/**
 * Query Fetcher Service
 * 
 * Wraps existing DataService/AnalyticsDataService calls with:
 * - AbortController support for request cancellation
 * - Request deduplication
 * - Exponential backoff retry logic
 * - ETag/If-None-Match support (if API supports it)
 */

import { QueryFunction } from '@tanstack/react-query';

/**
 * Creates a hash from an object for cache key generation
 */
export function createFiltersHash(filters: Record<string, any>): string {
  // Sort keys to ensure consistent hashing
  const sorted = Object.keys(filters)
    .sort()
    .map(key => `${key}:${JSON.stringify(filters[key])}`)
    .join('|');
  
  // Simple hash function (for production, consider using a proper hashing library)
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Wraps a query function with AbortController support
 */
export function withAbortController<T>(
  queryFn: (signal: AbortSignal) => Promise<T>
): QueryFunction<T> {
  return async ({ signal }) => {
    // If the query is already aborted, reject immediately
    if (signal?.aborted) {
      throw new Error('Query was aborted');
    }

    // Pass the abort signal to the query function
    return queryFn(signal);
  };
}

/**
 * Exponential backoff retry wrapper
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  signal?: AbortSignal
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort or client errors (4xx)
      if (signal?.aborted || ((error as any)?.status >= 400 && (error as any)?.status < 500)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Creates a query function with retry logic
 */
export function createQueryFn<T>(
  queryFn: (signal?: AbortSignal) => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
  } = {}
): QueryFunction<T> {
  return async ({ signal }) => {
    return withRetry(
      () => queryFn(signal),
      options.maxRetries ?? 3,
      options.baseDelay ?? 1000,
      signal
    );
  };
}

/**
 * Request deduplication cache
 * Prevents multiple identical requests from running simultaneously
 */
class RequestDedupCache {
  private cache = new Map<string, Promise<any>>();

  get<T>(key: string, factory: () => Promise<T>): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const promise = factory().finally(() => {
      // Remove from cache when resolved/rejected
      this.cache.delete(key);
    });

    this.cache.set(key, promise);
    return promise;
  }

  clear() {
    this.cache.clear();
  }
}

export const requestDedupCache = new RequestDedupCache();

