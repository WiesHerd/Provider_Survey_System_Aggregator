# Performance Migration Notes

## Compatibility Guarantee

The new TanStack Query implementation (`useBenchmarkingQuery`) has been designed to match the **exact interface** of the existing `useAnalyticsData` hook to ensure seamless integration.

### Interface Match

```typescript
// Existing hook interface (useAnalyticsData)
interface UseAnalyticsReturn {
  data: AggregatedData[];              // ✅ Matched
  allData: AggregatedData[];           // ✅ Matched
  loading: boolean;                    // ✅ Matched
  loadingProgress: number;             // ✅ Matched
  error: string | null;                // ✅ Matched
  filters: AnalyticsFilters;          // ✅ Matched
  setFilters: (filters: AnalyticsFilters) => void; // ✅ Matched
  refetch: () => Promise<void>;        // ✅ Matched
  forceRefresh: () => Promise<void>;   // ✅ Matched
  exportToExcel: () => void;          // ✅ Matched
  exportToCSV: () => void;            // ✅ Matched
}
```

### Key Compatibility Features

1. **Same Function Signature**: `useBenchmarkingQuery(initialFilters, selectedVariables)` matches `useAnalyticsData(initialFilters, selectedVariables)`
2. **Same Return Shape**: All properties returned in the same format
3. **Same Data Filtering**: Client-side filtering using `filterAnalyticsData()` utility (matches existing behavior)
4. **Same Progress Tracking**: Uses `useSmoothProgress()` hook (matches existing behavior)
5. **Same Export Functions**: Dynamic imports of export utilities (matches existing behavior)

### What Changes (Under the Hood Only)

- **Caching**: Data is now cached in memory via TanStack Query (no UI impact)
- **Request Deduplication**: Multiple components requesting same data share one fetch
- **Background Refresh**: Stale data shown immediately, refreshed in background
- **Performance**: Faster return navigation due to cached data

### What Doesn't Change

- ✅ Component API remains identical
- ✅ Data structure unchanged
- ✅ Filter behavior unchanged
- ✅ Export functionality unchanged
- ✅ Loading states unchanged
- ✅ Error handling unchanged

### Migration Path

To migrate a component to use the new hook:

**Before:**
```typescript
import { useAnalyticsData } from '../hooks/useAnalyticsData';

const { data, allData, loading, ... } = useAnalyticsData(initialFilters, selectedVariables);
```

**After:**
```typescript
import { useBenchmarkingQuery } from '../hooks/useBenchmarkingQuery';

const { data, allData, loading, ... } = useBenchmarkingQuery(initialFilters, selectedVariables);
```

**That's it!** No other changes needed.

### Rollback Plan

If issues arise, simply revert the import:
```typescript
// Change back to:
import { useAnalyticsData } from '../hooks/useAnalyticsData';
```

The old hook continues to work independently.

