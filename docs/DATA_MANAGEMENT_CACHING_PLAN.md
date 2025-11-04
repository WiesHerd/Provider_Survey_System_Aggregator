# Data Management Screens Caching Plan

## Current Status

### ✅ **Analysis Tools (CACHED)**
- **Benchmarking** (`/benchmarking`) - ✅ Uses `useBenchmarkingQuery` (TanStack Query)
- **Regional Analytics** (`/regional-analytics`) - ✅ Uses benchmarking cache
- **Custom Reports** (`/custom-reports`) - ✅ Benefits from query deduplication
- **FMV Calculator** (`/fair-market-value`) - ✅ Benefits from shared data service
- **Specialty Blending** (`/specialty-blending`) - ✅ Benefits from shared data service

### ❌ **Data Management Screens (NOT CACHED)**
- **Data Preview** (`/upload` → preview screen) - ❌ Uses direct `dataService.getSurveyData()` calls
- **Survey Upload** (`/upload`) - ❌ Uses direct `dataService.getAllSurveys()` calls

## Problem

When you navigate to Data Management:
- Data loads **every time** you visit
- No caching means slow load times (3-5 seconds)
- Wastes IndexedDB reads on data that hasn't changed

## Solution: Migrate Data Management to TanStack Query

### Hooks Created

1. **`useSurveyDataQuery`** - For DataPreview component
   - Caches survey data based on surveyId + filters
   - 5-minute stale time (survey data doesn't change often)
   - Instant render from cache on return navigation

2. **`useSurveyListQuery`** - For SurveyUpload component
   - Caches survey list based on year + providerType filters
   - 2-minute stale time (list changes on upload/delete)
   - Auto-refetches on window focus (new surveys might be uploaded)

### Migration Steps

#### 1. Update DataPreview Component
Replace direct `dataService.getSurveyData()` calls with `useSurveyDataQuery`:

```typescript
// Before
const { rows: surveyData } = await dataService.getSurveyData(file.id, filters, { limit: 10000 });

// After
const { data: surveyData, loading, error } = useSurveyDataQuery(file.id, filters, 10000);
```

#### 2. Update SurveyUpload Component
Replace direct `dataService.getAllSurveys()` calls with `useSurveyListQuery`:

```typescript
// Before
const surveys = await dataService.getAllSurveys();

// After
const { data: surveys, loading, error } = useSurveyListQuery(currentYear, selectedProviderType);
```

#### 3. Cache Invalidation (Already Done)
- ✅ Survey upload → Invalidates survey list queries
- ✅ Survey delete → Invalidates survey list + survey data queries

## Benefits After Migration

### Performance Improvements
- **Return Navigation**: <100ms (from cache) vs 3-5s before
- **First Load**: Same speed (still needs to fetch)
- **Subsequent Loads**: Instant from cache
- **Request Deduplication**: Multiple components share one fetch

### User Experience
- **No Loading Flash**: Shows cached data immediately
- **Background Refresh**: Updates data silently if stale
- **Consistent**: Same caching pattern as analysis tools

## Implementation Status

- ✅ Hooks created (`useSurveyDataQuery`, `useSurveyListQuery`)
- ✅ Query keys added to `queryClient.ts`
- ✅ Cache invalidation updated in `useUploadData.ts`
- ⏳ **TODO**: Migrate DataPreview component to use `useSurveyDataQuery`
- ⏳ **TODO**: Migrate SurveyUpload component to use `useSurveyListQuery`

## Next Steps

Would you like me to:
1. **Migrate DataPreview** to use `useSurveyDataQuery`?
2. **Migrate SurveyUpload** to use `useSurveyListQuery`?

This will make Data Management screens as fast as Analysis tools! 🚀

