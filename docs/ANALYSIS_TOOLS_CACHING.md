# Analysis Tools – Caching and Loading

## Does the screen have to reload every time?

**No.** Analysis Tools screens are designed so that **repeat visits in the same session do not show a full reload** when the cache is warm.

### Benchmarking

- **Cache:** TanStack Query with canonical key `['benchmarking']` (single cache entry for the full dataset; filtering is client-side). Data is considered fresh for **24 hours** (`staleTime`), and kept for **7 days** (`gcTime`).
- **Invalidation contract:** Benchmarking cache is invalidated **only** when survey data or mappings change: **survey upload**, **survey delete**, or mapping updates. On upload/delete we also invalidate survey list and Data Management (mapping) caches so the next time you open any screen you see the new data. It is **not** invalidated on route change, window focus, or mount.
- **Persistence:** The app uses a `CacheGate` that restores the query cache from **IndexedDB** before rendering routes, so a new tab or refresh can still show Benchmarking data from the last session if it was persisted.
- **Prefetch:** When you **hover** "Benchmarking" (or "Regional Data") in the sidebar, the same canonical benchmarking query is prefetched. If you click after the prefetch finishes, the screen often opens with data already in cache (no skeleton).
- **When you see loading:** You see "Loading benchmarking data…" + skeleton only when there is **no cached data** (e.g. first visit in the session, or first time ever, or after a full refresh before the persisted cache is restored). The table also shows cached/placeholder data if any exists (stale-while-revalidate), so navigating away and back does **not** show the skeleton once data has been loaded.

### Other Analysis Tools

- **Custom Blending:** Uses its own `GlobalBlendingCache` (30 min in-memory), **sessionStorage** persistence, and **prefetch on sidebar hover**. Same idea: first visit may load; return visits and hover-then-click are fast.
- **Regional Data:** Shares the same benchmarking prefetch on hover; its data layer may use similar or shared query keys.
- **Fair Market Value / Chart & Report Builder:** Sidebar prefetches their data on hover (FMV: analytics data; Reports: survey list). Cache behavior follows TanStack Query defaults (e.g. 24h stale, 7d gc) unless overridden.

So: **the Analysis Tools screens do not have to “reload” on every click**; they use in-memory and (where configured) persisted cache plus prefetch so that repeat visits and hover-then-click are instant when the cache is warm.

---

## Data Management (Specialties, Provider Types, Regions, Comp Metrics)

The same caching strategy applies so that **repeat visits do not trigger a full reload**.

- **Cache:** TanStack Query with keys `['mappings', type, providerTypeKey]` (e.g. `['mappings', 'specialty', 'all']`). Data is fresh for **24 hours** (`staleTime`), kept for **7 days** (`gcTime`). Same as Analysis Tools.
- **Invalidation contract:** Mapping caches are invalidated **only** when the user creates, updates, or deletes a mapping (or removes learned mappings). They are **not** invalidated on route change, window focus, or mount.
- **Prefetch:** When you **hover** a Data Management item (Specialties, Provider Types, Regions, Comp Metrics) in the sidebar, that screen's query is prefetched with the same key the screen uses, so the cache is warm when you click.
- **Stale-while-revalidate:** All mapping hooks use `placeholderData: (previousData) => previousData` and `refetchOnMount: false`. Loading spinners are shown only when there is **no data** (same as Benchmarking). If cached data exists, the table/content is shown immediately.

Specialty mapping no longer refetches on every mount; it relies on React Query's cache so that navigating away and back uses the cached entry. Regional, Variable, and Provider Type mapping screens already followed this pattern and are aligned with the same settings.

---

## What would Amazon, Google, or Apple do?

They typically combine the same ideas we use, plus a few extras:

1. **Show structure first (shell / skeleton)**  
   We do this: the layout (e.g. "Column Visibility", filters) is visible while data loads, and only the data region shows a skeleton. No full-screen spinner.

2. **Stale-while-revalidate**  
   We do this: if cached data exists, show it immediately and do not show a loading state. Background refresh (if any) happens without blocking the UI. We use `loading: query.isLoading` (not `isFetching`) for Benchmarking so the skeleton only shows when there is no data.

3. **Prefetch on intent**  
   We do this: hovering a nav item prefetches that screen’s data so that by the time the user clicks, the cache is often already filled.

4. **Persist cache across reloads**  
   We do this where implemented: Custom Blending uses sessionStorage; the rest of the app uses TanStack Query’s IndexedDB persistence and `CacheGate` so that a new tab or refresh can still show data from the last session.

5. **Optional: service worker + offline**  
   Amazon/Google/Apple often add a service worker and offline support. We don’t currently; that would be a larger addition.

6. **Optional: optimistic updates**  
   For mutations (e.g. save report, update mapping), they sometimes update the UI before the server responds. We could add that for specific actions later.

So our approach (shell-first, prefetch on hover, TanStack Query + persistence, and “loading only when there’s no data”) is aligned with what big players do: **the screen does not have to reload on every click**; caching and prefetch are there to make repeat visits and hover-then-click feel instant.
