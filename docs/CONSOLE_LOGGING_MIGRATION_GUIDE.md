# Console Logging Migration Guide

## Overview

This guide documents the migration from `console.log` statements to the production-safe logger utility. The logger automatically disables console output in production builds while maintaining full logging in development.

## Status

- ✅ **Critical Files Migrated**: AuthService, AuthContext, DataService
- ⏳ **Remaining**: ~1,900 instances across 180+ files
- 🎯 **Priority**: Migrate incrementally, focusing on critical paths first

## Logger Utility

The logger is located at `src/shared/utils/logger.ts` and provides:

- `logger.log()` - General logging (dev only)
- `logger.debug()` - Debug logging (dev only)
- `logger.info()` - Info logging (dev only)
- `logger.warn()` - Warning logging (dev only)
- `logger.error()` - Error logging (always enabled, even in production)

## Migration Pattern

### Before
```typescript
console.log('User signed in:', user.email);
console.warn('Warning message');
console.error('Error occurred:', error);
```

### After
```typescript
import { logger } from '@/shared/utils/logger';

logger.log('User signed in:', user.email);
logger.warn('Warning message');
logger.error('Error occurred:', error);
```

## Migration Strategy

### Phase 1: Critical Services (✅ Completed)
- [x] `src/services/AuthService.ts`
- [x] `src/contexts/AuthContext.tsx`
- [x] `src/services/DataService.ts`

### Phase 2: Core Services (Next Priority)
- [ ] `src/services/IndexedDBService.ts`
- [ ] `src/services/FirestoreService.ts`
- [ ] `src/services/SurveyMigrationService.ts`
- [ ] `src/contexts/DatabaseContext.tsx`
- [ ] `src/contexts/StorageContext.tsx`

### Phase 3: Feature Components
- [ ] `src/features/upload/**`
- [ ] `src/features/analytics/**`
- [ ] `src/features/mapping/**`

### Phase 4: UI Components
- [ ] `src/components/**`
- [ ] `src/shared/components/**`

## Automated Migration (Optional)

For bulk migration, you can use find-and-replace:

1. **Find**: `console.log(`
2. **Replace**: `logger.log(`
3. **Add import**: `import { logger } from '@/shared/utils/logger';`

**Note**: Be careful with `console.error` - these should become `logger.error` (which still logs in production).

## Production Safety

The logger utility already overrides global `console` methods in production, so even unmigrated `console.log` statements won't execute in production builds. However, explicit migration is recommended for:

1. **Code clarity** - Makes intent explicit
2. **Type safety** - Logger is properly typed
3. **Future flexibility** - Can add features like log levels, remote logging, etc.

## Testing

After migration:
1. Verify logs appear in development mode
2. Verify logs are suppressed in production build
3. Verify errors still log in production (critical for debugging)

## Notes

- The logger automatically disables console output in production
- Error logging (`logger.error`) is always enabled for critical issues
- Migration can be done incrementally without breaking functionality
