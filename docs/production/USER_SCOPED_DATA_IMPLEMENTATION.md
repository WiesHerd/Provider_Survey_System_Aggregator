# User-Scoped Data Storage Implementation Guide

## Overview

This document outlines the implementation strategy for user-scoped data storage in IndexedDB to ensure data isolation between users in production.

## Current State

- **FirestoreService**: Already implements user-scoped data using Firebase Auth user ID
- **IndexedDBService**: Currently stores all data globally without user scoping

## Implementation Strategy

### Phase 1: User ID Utility (COMPLETED)

Created `src/shared/utils/userScoping.ts` with:
- `getUserId()`: Gets Firebase Auth user ID or generates local user ID
- `userScopedKey()`: Prefixes keys with user ID
- `isUserAuthenticated()`: Checks if user is authenticated

### Phase 2: IndexedDB Migration (TODO)

**Approach**: Modify IndexedDBService to use user-scoped keys for all data operations.

**Key Changes Required**:

1. **Update all key generation** in `IndexedDBService`:
   ```typescript
   // Before:
   const key = `survey_${surveyId}`;
   
   // After:
   const userId = getUserId();
   const key = `${userId}_survey_${surveyId}`;
   ```

2. **Update all queries** to filter by user ID:
   ```typescript
   // Before:
   const surveys = await getAllSurveys();
   
   // After:
   const userId = getUserId();
   const surveys = await getAllSurveys(userId);
   ```

3. **Migration Script**: Create migration to move existing data to user-scoped keys
   - Detect existing global data
   - Assign to current user (or prompt for user assignment)
   - Migrate data to user-scoped keys

### Phase 3: Data Migration

**Migration Strategy**:

1. **On App Startup**: Check if migration is needed
2. **If Global Data Exists**:
   - If user is authenticated: Migrate to user ID
   - If not authenticated: Prompt for authentication or assign to local user ID
3. **Migration Process**:
   - Read all global data
   - Write to user-scoped keys
   - Delete global data (after verification)

### Implementation Files

- `src/services/IndexedDBService.ts` - Main service to update
- `src/services/UserScopedMigrationService.ts` - New migration service (to be created)
- `src/shared/utils/userScoping.ts` - User ID utilities (completed)

### Testing Strategy

1. **Unit Tests**: Test user-scoped key generation
2. **Integration Tests**: Test data isolation between users
3. **Migration Tests**: Test data migration from global to user-scoped

### Production Considerations

- **Backward Compatibility**: Existing users will need data migration
- **Performance**: User-scoped queries may be slightly slower (add indexes)
- **Storage**: No significant storage overhead (just key prefixes)

## Status

- ✅ Phase 1: User ID Utility - COMPLETED
- ⏳ Phase 2: IndexedDB Migration - TODO
- ⏳ Phase 3: Data Migration - TODO

## Notes

- FirestoreService already has user scoping, so Firebase users are protected
- IndexedDB user scoping is primarily for development/local use
- In production with Firebase, FirestoreService handles user scoping automatically






