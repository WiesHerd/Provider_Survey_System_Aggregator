# Service Architecture Analysis

## Current Service Layer Status

### Primary Services (ACTIVE - KEEP)

#### DataService.ts
- **Status**: PRIMARY SERVICE
- **Usage**: 46 imports across codebase
- **Purpose**: Main wrapper around IndexedDB
- **Action**: KEEP - This is the main service

#### IndexedDBService.ts
- **Status**: ACTIVE
- **Usage**: Used by DataService
- **Purpose**: Low-level IndexedDB operations
- **Action**: KEEP - Core storage service

#### SurveyDataService.ts
- **Status**: ACTIVE
- **Usage**: 2 imports
- **Purpose**: Survey-specific data operations
- **Action**: KEEP - Specialized survey logic

#### APPDataService.ts
- **Status**: ACTIVE
- **Usage**: 1 import
- **Purpose**: APP-specific data operations
- **Action**: KEEP - Provider-specific logic

### Orphaned Services (DELETE)

#### EnhancedDataService.ts
- **Status**: ORPHANED
- **Usage**: 0 imports
- **Purpose**: Extended provider type support
- **Action**: DELETE - Not used anywhere

#### EnhancedDatabaseService.ts
- **Status**: ORPHANED
- **Usage**: 0 imports
- **Purpose**: Enhanced database operations
- **Action**: DELETE - Not used anywhere

### Performance Services (CONSOLIDATE)

#### PerformanceOptimizedDataService.ts
- **Status**: USED IN MAPPING
- **Usage**: 6 imports (all in mapping features)
- **Purpose**: Caching layer over DataService
- **Action**: MERGE INTO DATASERVICE - Add caching methods

### Specialized Services (REVIEW)

#### DatabaseService.ts
- **Status**: USED BY OTHER SERVICES
- **Usage**: 2 imports (APPDataService, SurveyDataService)
- **Purpose**: Database abstraction
- **Action**: REVIEW - May be redundant with IndexedDBService

#### ProviderDataService.ts
- **Status**: UNKNOWN
- **Usage**: Need to check
- **Purpose**: Provider-specific operations
- **Action**: ANALYZE

## Consolidation Strategy

### Phase 1: Delete Orphaned Services
1. Delete `EnhancedDataService.ts` (0 imports)
2. Delete `EnhancedDatabaseService.ts` (0 imports)
3. Test: Run `npm start`, verify no build errors

### Phase 2: Merge Performance Layer
1. Add caching methods to `DataService.ts`
2. Update 6 mapping imports to use DataService
3. Delete `PerformanceOptimizedDataService.ts`
4. Test: Load specialty mapping, verify filtering works

### Phase 3: Review Specialized Services
1. Analyze `DatabaseService.ts` vs `IndexedDBService.ts`
2. Determine if `ProviderDataService.ts` is needed
3. Consolidate or clarify purpose

### Phase 4: Create Service Barrel Export
```typescript
// src/services/index.ts
export { DataService, getDataService } from './DataService';
export { IndexedDBService } from './IndexedDBService';
export { SurveyDataService } from './SurveyDataService';
export { APPDataService } from './APPDataService';
// ... other active services
```

## Risk Assessment

### Low Risk
- Deleting orphaned services (0 imports)
- No breaking changes expected

### Medium Risk
- Merging performance layer
- Need to test mapping features thoroughly

### High Risk
- Consolidating specialized services
- May require careful analysis of dependencies

## Testing Protocol

After each change:
1. Run `npm start`
2. Check console for errors
3. Test affected features
4. Verify data persistence
5. Test import/export functionality

## Success Metrics

- Zero orphaned services
- Single service pattern for core operations
- Clean imports throughout
- No duplicate functionality
- Performance maintained or improved
