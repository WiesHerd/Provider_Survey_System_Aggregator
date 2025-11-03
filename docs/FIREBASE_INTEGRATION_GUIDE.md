# Firebase Integration Guide

## Overview

TanStack Query is **backend-agnostic** and works excellently with Firebase. This guide shows how to adapt our current implementation for Firebase when you're ready to migrate.

## Current Architecture (IndexedDB → Firebase)

Our current data fetching pattern:
```typescript
async function fetchBenchmarkingData() {
  const dataService = getDataService(); // IndexedDB service
  const analyticsDataService = new AnalyticsDataService();
  return await analyticsDataService.getAnalyticsData({...});
}
```

## Firebase Migration Pattern

### 1. Firestore Integration

Replace IndexedDB service calls with Firestore queries:

```typescript
// src/features/analytics/hooks/useBenchmarkingQueryFirebase.ts
import { useQuery } from '@tanstack/react-query';
import { getFirestore, collection, query, getDocs, where } from 'firebase/firestore';

async function fetchBenchmarkingDataFromFirestore(filters: AnalyticsFilters) {
  const db = getFirestore();
  const surveysRef = collection(db, 'surveys');
  
  // Build Firestore query with filters
  let q = query(surveysRef);
  
  if (filters.specialty) {
    q = query(q, where('specialty', '==', filters.specialty));
  }
  if (filters.surveySource) {
    q = query(q, where('surveySource', '==', filters.surveySource));
  }
  // ... more filters
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export const useBenchmarkingQueryFirebase = (filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: queryKeys.benchmarking(filters),
    queryFn: () => fetchBenchmarkingDataFromFirestore(filters),
    staleTime: 1000 * 60 * 60 * 24, // Same caching strategy
    gcTime: 1000 * 60 * 60 * 24 * 7,
    // ... same options as current implementation
  });
};
```

### 2. Real-Time Updates (Firestore Listeners)

For real-time data, combine Firebase listeners with TanStack Query:

```typescript
// src/features/analytics/hooks/useBenchmarkingQueryRealtime.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';

export const useBenchmarkingQueryRealtime = (filters: AnalyticsFilters) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.benchmarking(filters);
  
  // Initial fetch with TanStack Query
  const queryResult = useQuery({
    queryKey,
    queryFn: () => fetchBenchmarkingDataFromFirestore(filters),
    staleTime: Infinity, // Don't auto-refetch, rely on listener
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
  
  // Set up real-time listener
  useEffect(() => {
    const db = getFirestore();
    const surveysRef = collection(db, 'surveys');
    let q = query(surveysRef);
    
    // Apply filters
    if (filters.specialty) {
      q = query(q, where('specialty', '==', filters.specialty));
    }
    // ... more filters
    
    // Listen for changes
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Update TanStack Query cache directly (instant UI update)
      queryClient.setQueryData(queryKey, data);
    });
    
    return () => unsubscribe(); // Cleanup
  }, [filters, queryClient, queryKey]);
  
  return queryResult;
};
```

### 3. Mutations (Creating/Updating Data)

Use TanStack Query mutations with Firebase:

```typescript
// src/features/upload/hooks/useUploadToFirebase.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export const useUploadSurveyToFirebase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (surveyData: any) => {
      const db = getFirestore();
      const surveysRef = collection(db, 'surveys');
      return await addDoc(surveysRef, surveyData);
    },
    onSuccess: () => {
      // Invalidate queries (same pattern as current implementation)
      queryClient.invalidateQueries({ queryKey: ['benchmarking'] });
      console.log('✅ Survey uploaded to Firebase, cache invalidated');
    },
    onError: (error) => {
      console.error('❌ Firebase upload failed:', error);
    },
  });
};

export const useDeleteSurveyFromFirebase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (surveyId: string) => {
      const db = getFirestore();
      const surveyRef = doc(db, 'surveys', surveyId);
      return await deleteDoc(surveyRef);
    },
    onSuccess: () => {
      // Invalidate queries (same pattern)
      queryClient.invalidateQueries({ queryKey: ['benchmarking'] });
      console.log('✅ Survey deleted from Firebase, cache invalidated');
    },
  });
};
```

### 4. Authentication Integration

TanStack Query works seamlessly with Firebase Auth:

```typescript
// src/shared/hooks/useFirebaseAuth.ts
import { useQuery } from '@tanstack/react-query';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  return { user, loading };
};

// Use in protected routes/queries
export const useProtectedQuery = <T>(queryKey: string[], queryFn: () => Promise<T>) => {
  const { user, loading: authLoading } = useFirebaseAuth();
  
  return useQuery({
    queryKey,
    queryFn,
    enabled: !!user && !authLoading, // Only fetch if authenticated
    staleTime: 1000 * 60 * 60,
  });
};
```

## Benefits of This Approach

### 1. **Same Caching Strategy**
- TanStack Query handles client-side caching regardless of backend
- Firebase data cached in memory (can add IndexedDB persistence too)
- Same "instant render with background refresh" pattern

### 2. **Request Deduplication**
- Multiple components requesting same Firebase data = one Firestore read
- Reduces Firebase read costs significantly
- Same automatic deduplication as current implementation

### 3. **Offline Support**
- TanStack Query cache + Firebase offline persistence = robust offline experience
- Cached data available instantly, Firebase syncs when online

### 4. **Real-Time Updates**
- Firebase listeners + TanStack Query cache updates = instant UI updates
- No refetching needed, cache updates automatically

### 5. **Cost Optimization**
- TanStack Query reduces redundant Firestore reads
- Caching means fewer reads = lower Firebase costs
- Request deduplication prevents duplicate reads

## Migration Steps

### Phase 1: Setup Firebase
```bash
npm install firebase
```

```typescript
// src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

### Phase 2: Replace One Query at a Time
1. Create Firebase version of `useBenchmarkingQuery`
2. Test side-by-side with IndexedDB version
3. Switch component to Firebase version
4. Repeat for other queries

### Phase 3: Add Real-Time Where Needed
- Start with read-heavy queries (like benchmarking)
- Add listeners for data that changes frequently
- Keep mutations invalidating cache (same pattern)

### Phase 4: Add Authentication
- Integrate Firebase Auth
- Use `enabled` option in queries for protected data
- Update mutations to require auth

## Firebase Best Practices with TanStack Query

### 1. Query Key Structure
Keep the same query key structure you have now:
```typescript
queryKeys.benchmarking({ specialty: 'Cardiology', year: '2024' })
// → ['benchmarking', { specialty: 'Cardiology', year: '2024' }]
```

Firebase queries can use these keys for cache management.

### 2. Stale Time Strategy
```typescript
// Real-time data (updated frequently)
staleTime: 1000 * 60 * 5, // 5 minutes

// Static data (rarely changes)
staleTime: 1000 * 60 * 60 * 24, // 24 hours

// Real-time with listener (don't auto-refetch)
staleTime: Infinity // Listener handles updates
```

### 3. Cache Invalidation
Same pattern as now - invalidate on mutations:
```typescript
// After Firebase mutation
queryClient.invalidateQueries({ queryKey: ['benchmarking'] });
```

### 4. Error Handling
TanStack Query handles Firebase errors gracefully:
```typescript
const query = useQuery({
  queryKey: ['surveys'],
  queryFn: () => fetchFromFirebase(),
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

## Cost Optimization Tips

### 1. **Aggressive Caching**
- Longer `staleTime` = fewer Firestore reads
- Use `gcTime` to keep data in cache longer
- Cache invalidation only when data actually changes

### 2. **Request Deduplication**
- TanStack Query automatically deduplicates
- Multiple components = one Firestore read
- Reduces read costs by 70-90% in typical apps

### 3. **Query Optimization**
- Fetch only needed fields (`select()` in Firestore)
- Use composite indexes for complex filters
- Paginate large datasets

### 4. **Real-Time Listeners**
- Use listeners only for frequently updated data
- Cache static data with TanStack Query (no listener)
- Combine both strategies for best performance

## Example: Full Migration Pattern

```typescript
// Before (IndexedDB)
const { data, loading } = useBenchmarkingQuery(filters);

// After (Firebase) - SAME INTERFACE!
const { data, loading } = useBenchmarkingQueryFirebase(filters);

// Component code unchanged! ✅
```

## Summary

**Your current TanStack Query implementation is PERFECT for Firebase because:**

✅ Same caching strategy works with any backend  
✅ Request deduplication reduces Firebase read costs  
✅ Stale-while-revalidate pattern improves UX  
✅ Cache invalidation works identically  
✅ Real-time updates can be added incrementally  
✅ Same developer experience, different backend  

**The only changes needed:**
- Replace `getDataService()` calls with Firebase SDK calls
- Add Firebase listeners for real-time data (optional)
- Keep all TanStack Query configuration the same

Your migration will be smooth because TanStack Query abstracts the data source! 🚀

