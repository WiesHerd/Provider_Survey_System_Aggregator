# TanStack Query Playbook

## How to Add a New Query

### Step 1: Define Query Key Factory

Add to `src/shared/services/queryClient.ts`:

```typescript
export const queryKeys = {
  // ... existing keys
  yourFeature: (filters: YourFilters) => ['yourFeature', filters] as const,
};
```

### Step 2: Create Fetch Function

Create `src/features/yourFeature/hooks/useYourFeatureQuery.ts`:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../shared/services/queryClient';
import { createQueryFn, trackFetch } from '../../../shared/services/queryFetcher';
import { YourDataService } from '../services/yourDataService';

async function fetchYourFeatureData(
  filters: YourFilters,
  signal?: AbortSignal
): Promise<YourFeatureData> {
  const startTime = performance.now();
  
  try {
    if (signal?.aborted) {
      throw new Error('Query was aborted');
    }

    const service = new YourDataService();
    const data = await service.getData(filters);

    const fetchTime = performance.now() - startTime;
    trackFetch(fetchTime);

    return data;
  } catch (error) {
    const fetchTime = performance.now() - startTime;
    trackFetch(fetchTime);
    throw error;
  }
}
```

### Step 3: Create Query Hook

```typescript
export const useYourFeatureQuery = (
  filters: YourFilters = {}
): UseYourFeatureReturn => {
  const queryClient = useQueryClient();
  
  const queryKey = queryKeys.yourFeature(filters);

  const query = useQuery({
    queryKey,
    queryFn: createQueryFn((signal) => fetchYourFeatureData(filters, signal)),
    enabled: true,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - adjust per dataset
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    refetchOnWindowFocus: true,
    refetchOnMount: false, // Stale-while-revalidate
    keepPreviousData: true, // Smooth filter changes
  });

  return {
    data: query.data || [],
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    refetch: query.refetch,
  };
};
```

### Step 4: Use in Component

```typescript
import { useYourFeatureQuery } from '../hooks/useYourFeatureQuery';

const YourComponent: React.FC = () => {
  const { data, loading, error } = useYourFeatureQuery({
    // filters
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <YourDataDisplay data={data} />;
};
```

## When to Prefetch

### Prefetch on Hover

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../shared/services/queryClient';

const SidebarLink: React.FC = ({ to, filters }) => {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch data when user hovers over link
    queryClient.prefetchQuery({
      queryKey: queryKeys.yourFeature(filters),
      queryFn: () => fetchYourFeatureData(filters),
      staleTime: 1000 * 60 * 60 * 24, // Same as main query
    });
  };

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      Your Feature
    </Link>
  );
};
```

### Prefetch on App Idle

```typescript
useEffect(() => {
  if ('requestIdleCallback' in window) {
    const idleCallback = requestIdleCallback(() => {
      // Prefetch common data when browser is idle
      queryClient.prefetchQuery({
        queryKey: queryKeys.benchmarking({}),
        queryFn: () => fetchBenchmarkingData({}),
      });
    });

    return () => cancelIdleCallback(idleCallback);
  }
}, [queryClient]);
```

## When to Block

**Block (show loading):**
- Initial page load (first time user visits route)
- User explicitly clicks "Refresh"
- Error recovery retry

**Don't Block (show cached):**
- Return navigation (show cached, refresh in background)
- Filter changes (use `keepPreviousData: true`)
- Window focus (refresh in background)

## When to Invalidate

### Automatic Invalidation

```typescript
// In mutation hooks (upload, delete, update)
import { invalidateBenchmarkingQueries } from '../../analytics/hooks/useBenchmarkingQuery';

const handleUpload = async () => {
  await uploadSurvey();
  
  // Invalidate all dependent queries
  invalidateBenchmarkingQueries(queryClient);
  invalidateRegionalQueries(queryClient);
  
  // Or invalidate specific queries
  queryClient.invalidateQueries({ queryKey: ['surveys'] });
};
```

### Manual Invalidation

```typescript
// User clicks "Refresh Data" button
const handleRefresh = () => {
  queryClient.invalidateQueries({ queryKey: ['yourFeature'] });
};

// Force refetch specific query
const handleForceRefresh = () => {
  queryClient.refetchQueries({ queryKey: ['yourFeature'] });
};
```

## Tuning Knobs for Production

### Stale Time (How Long Data is "Fresh")

```typescript
// Taxonomy data (rarely changes)
staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days

// Survey data (changes on upload)
staleTime: 1000 * 60 * 60 * 24, // 24 hours

// User preferences (changes frequently)
staleTime: 1000 * 60, // 1 minute
```

### Garbage Collection Time (How Long to Keep Unused Data)

```typescript
// Keep for a while (users might come back)
gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days

// Quick cleanup (memory constrained)
gcTime: 1000 * 60 * 60, // 1 hour
```

### Refetch Behavior

```typescript
{
  refetchOnWindowFocus: true, // Refresh when user returns to tab
  refetchOnReconnect: true, // Refresh when network reconnects
  refetchOnMount: false, // Don't refetch if data is fresh
  refetchInterval: false, // No polling (use refetchInterval: 60000 for polling)
}
```

## Cache Key Best Practices

### Deterministic Keys

✅ **Good:**
```typescript
queryKey: ['benchmarking', { year: '2023', specialty: 'Cardiology' }]
```

❌ **Bad:**
```typescript
queryKey: ['benchmarking', Date.now()] // Changes every render
queryKey: ['benchmarking', Math.random()] // Non-deterministic
```

### Hash Complex Filters

```typescript
import { createFiltersHash } from '../../../shared/services/queryFetcher';

const filtersHash = createFiltersHash(complexFilters);
queryKey: ['reports', filtersHash]
```

## Troubleshooting

### Data Not Updating

1. Check if query is invalidated:
```typescript
queryClient.invalidateQueries({ queryKey: ['yourFeature'] });
```

2. Check staleTime:
```typescript
// If staleTime is too long, data won't refetch
staleTime: 1000 * 60 * 60 * 24 * 7 // Might be too long
```

### Cache Not Persisting

Currently in-memory only. Full IndexedDB persistence is TODO (Phase 8).

### Duplicate Requests

TanStack Query automatically deduplicates. If you see duplicates:
1. Check query keys are identical
2. Ensure queries share same QueryClient instance
3. Check network tab for actual duplicates vs. cache misses

### Performance Issues

1. **Too Many Queries**: Combine related queries
2. **Large Payloads**: Consider pagination or data slicing
3. **Slow Fetch**: Profile fetch function with `performance.now()`
4. **Render Blocking**: Use Suspense or `keepPreviousData: true`

## Example: Complete Query Hook

```typescript
/**
 * Complete example query hook
 */
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../shared/services/queryClient';
import { createQueryFn, trackFetch } from '../../../shared/services/queryFetcher';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';

interface Filters {
  specialty?: string;
  year?: string;
}

async function fetchData(filters: Filters, signal?: AbortSignal) {
  const startTime = performance.now();
  
  if (signal?.aborted) throw new Error('Aborted');
  
  // Your fetch logic
  const data = await yourService.getData(filters);
  
  trackFetch(performance.now() - startTime);
  return data;
}

export const useYourFeatureQuery = (
  initialFilters: Filters = {}
) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(initialFilters);
  const { progress, startProgress, completeProgress } = useSmoothProgress();

  const queryKey = queryKeys.yourFeature(filters);

  const query = useQuery({
    queryKey,
    queryFn: createQueryFn((signal) => fetchData(filters, signal)),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    keepPreviousData: true,
  });

  // Sync progress with loading state
  useMemo(() => {
    if (query.isLoading || query.isFetching) {
      startProgress();
    } else {
      completeProgress();
    }
  }, [query.isLoading, query.isFetching, startProgress, completeProgress]);

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    data: query.data || [],
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    filters,
    setFilters,
    refetch,
    invalidate,
  };
};

// Export invalidation helper
export const invalidateYourFeatureQueries = (
  queryClient: ReturnType<typeof useQueryClient>
) => {
  queryClient.invalidateQueries({ queryKey: ['yourFeature'] });
};
```

## Quick Reference

### Cache Policies by Dataset Type

| Dataset Type | staleTime | gcTime | Invalidate On |
|-------------|-----------|--------|---------------|
| Taxonomy/Reference | 7 days | 14 days | Never (manual only) |
| Survey Data | 24 hours | 7 days | Upload/Delete |
| Custom Blends | 24 hours | 7 days | Blend Save |
| Reports | 24 hours | 7 days | Report Save |
| Mappings | 1 hour | 7 days | Mapping Update |
| Survey List | 5 minutes | 1 day | Upload/Delete |

### Common Patterns

**Stale-while-revalidate:**
```typescript
refetchOnMount: false,
keepPreviousData: true,
staleTime: 1000 * 60 * 60 * 24,
```

**Always Fresh:**
```typescript
refetchOnMount: true,
staleTime: 0,
```

**Background Polling:**
```typescript
refetchInterval: 60000, // Every minute
refetchIntervalInBackground: true,
```

## Migration Checklist

When migrating an existing hook to TanStack Query:

- [ ] Create query key factory
- [ ] Create fetch function with AbortController support
- [ ] Create query hook matching existing interface
- [ ] Update component to use new hook
- [ ] Add invalidation on mutations
- [ ] Test return navigation (should be instant)
- [ ] Test page reload (should show cached if persistence enabled)
- [ ] Monitor cache hit rate in telemetry
- [ ] Update documentation

