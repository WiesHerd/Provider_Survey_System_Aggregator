# Enterprise Caching Standards

This document defines the application-wide caching strategy so that every screen behaves like enterprise (Apple/Microsoft/Google) grade software: instant navigation, no unnecessary reloads, and data that updates only when something actually changes.

## Principles

1. **Stale-while-revalidate**  
   Show cached data immediately. If a background refetch runs, keep showing the previous data until new data arrives. Never block the UI on a refetch when we already have data.

2. **No refetch on navigation or focus**  
   Data is local (IndexedDB). It only changes when the user uploads, deletes, or edits. Do not refetch on mount, window focus, or reconnect unless the cache was explicitly invalidated.

3. **Invalidate only on mutation**  
   Invalidate a cache only when the underlying data changes: survey upload/delete, mapping create/update/delete, or learned-mapping changes. Never invalidate on route change or time-based triggers.

4. **Single canonical key per dataset**  
   Where one screen (or multiple screens) share one logical dataset (e.g. “all benchmarking data”), use one query key so prefetch, hook, and persistence always hit the same cache entry.

5. **Loading only when there is no data**  
   Show a loading/skeleton state only when there is no data to display. If we have cached or placeholder data, render it. This avoids flashing loaders when returning to a screen.

## Query client defaults (queryClient.ts)

- **staleTime:** 24 hours (data is “fresh” for 24h; no refetch until stale or invalidated).
- **gcTime:** 7 days (keep cache in memory and in IndexedDB for 7 days).
- **refetchOnMount:** false.
- **refetchOnWindowFocus:** false.
- **refetchOnReconnect:** false.

All feature-level `useQuery` calls should either rely on these defaults or explicitly set the same policy. Do not set `refetchOnMount: true` or short `staleTime` for normal list/detail screens.

## Per-query requirements

Every `useQuery` used for screen data should:

1. Use a **stable query key** (e.g. canonical key for “full dataset” or `[entity, id]` for detail).
2. Set **placeholderData: (previousData) => previousData** so that when a refetch runs, the last data stays on screen.
3. Set **staleTime** and **gcTime** (24h and 7d unless the comment explains a rare exception).
4. Set **refetchOnMount: false** (and **refetchOnWindowFocus: false**, **refetchOnReconnect: false** if not using defaults).

## Prefetch (sidebar / navigation)

- On hover (or equivalent intent) for a route, **prefetch** that route’s query using the **exact same query key** the screen’s hook uses. So when the user clicks, the cache is already warm and the screen often renders with no loading state.
- Prefetch should use the same **staleTime** (or a conservative value like 1 hour) so the prefetched data is not immediately stale.

## Persistence (IndexedDB)

- The app persists the TanStack Query cache to IndexedDB and restores it behind a **CacheGate** before rendering the router. So after a full reload or new tab, the first navigation can still show cached data.
- Restore uses a timeout (e.g. 4s) so slow storage does not block the app. After restore, canonical keys (e.g. `['benchmarking']`) must match what the hooks use so that restored data is actually used.

## Loading UI

- Use **loading: query.isLoading** (or equivalent) so that “loading” is true only when there is **no data yet** (initial load). Do not use `isFetching` for the main loading state.
- In the component that renders the table/content, show the **skeleton/loader only when loading && (data == null || data.length === 0)**. If there is any data (cached or placeholder), render the table/content with that data.

## Where this applies

- **Analysis Tools:** Benchmarking, Regional Data, FMV, Chart & Report Builder, Report Library, Custom Blending.
- **Data Management:** Specialties, Provider Types, Regions, Comp Metrics (variable mapping).
- **Surveys:** Survey list, survey data (by id), upload flow (invalidation on success).
- **Dashboard:** Uses survey count / list; same invalidation and no-refetch-on-mount rules.

## What not to do

- Do not call `refetch()` or `loadData()` in a `useEffect` that runs on every mount. That defeats cache and makes every visit look like a full reload.
- Do not invalidate queries on route change, tab focus, or timer. Invalidate only when the user (or system) changes data (upload, delete, mapping create/update/delete).
- Do not use different query key shapes for the same logical dataset (e.g. different object key order or different param names) between prefetch and hook, or between persist and hook. Use a single canonical key or a shared key factory.

## Checklist for new features

When adding a new data-backed screen:

1. Use TanStack Query with a **stable key** and **24h staleTime**, **7d gcTime**.
2. Set **placeholderData: (previousData) => previousData** and **refetchOnMount: false**.
3. Show **loading only when there is no data** (defensive check: `loading && !data?.length` or equivalent).
4. Add **prefetch on sidebar hover** with the same query key.
5. **Invalidate** the query only in mutation success paths (create/update/delete) or in upload/delete flows that affect that data.
6. Document the invalidation contract in code or in ANALYSIS_TOOLS_CACHING.md / this file.

Following these standards keeps the app fast, predictable, and professional for enterprise users.
