# Show All Survey Types Button - Fix Documentation

## Issue Summary
The "Show All Survey Types" button on Provider Type Mapping and Region Mapping screens was not working correctly. The button behavior needed to match the Specialty Mapping screen.

## Correct Behavior

### Button States:
- **Button ON (enabled/checked)**: Shows **ALL surveys** regardless of Data View selection
  - When enabled, passes `undefined` to service methods, which returns all surveys (Call Pay + Provider surveys)
  
- **Button OFF (disabled/unchecked)**: Shows surveys **filtered by Data View** selection
  - PHYSICIAN view: Shows Physician surveys (excludes Call Pay)
  - APP view: Shows APP surveys (excludes Call Pay)
  - CALL view: Shows Call Pay surveys only
  - BOTH view: Shows all surveys

### Visual Indicator:
- Button should be **enabled/checked** when showing all surveys
- Button should be **disabled/unchecked** when filtering by Data View

## Files Modified

### 1. Service Layer (`src/services/IndexedDBService.ts`)
**Updated Methods:**
- `getUnmappedProviderTypes()` - Added sophisticated filtering logic matching `getUnmappedSpecialties()`
- `getUnmappedRegions()` - Added sophisticated filtering logic matching `getUnmappedSpecialties()`

**What Changed:**
- Replaced simple string matching (`survey.providerType !== providerType`) with proper filtering using:
  - `isCallPaySurvey()` - Detects Call Pay surveys
  - `isMoonlightingSurvey()` - Detects Moonlighting surveys
  - `getEffectiveProviderType()` - Gets effective provider type
  - `isCompensationSurvey()` - Checks if compensation survey

**Purpose:** Ensures Call Pay surveys are properly excluded when filtering by PHYSICIAN or APP views.

### 2. Provider Type Mapping Hook (`src/features/mapping/hooks/useProviderTypeMappingData.ts`)
**Updated Method:** `loadData()`

**Correct Implementation:**
```typescript
// Toggle logic: Match specialty mapping behavior
// - When showAllCategories is true: Show ALL surveys regardless of Data View (override filter)
// - When showAllCategories is false: Respect Data View selection (filter by selectedProviderType)
const dataProviderType = (showAllCategories || selectedProviderType === 'BOTH') 
  ? undefined // undefined = show all (override Data View filter)
  : selectedProviderType; // Respect Data View selection - PHYSICIAN excludes Call Pay, APP excludes Call Pay
```

**Key Points:**
- When `showAllCategories = true`: Pass `undefined` to show all surveys
- When `showAllCategories = false`: Pass `selectedProviderType` to filter by Data View
- Matches the exact logic from `useMappingData.ts` (Specialty Mapping)

### 3. Region Mapping Hook (`src/features/mapping/hooks/useRegionMappingData.ts`)
**Updated Method:** `loadData()`

**Same Implementation as Provider Type Mapping:**
```typescript
// Toggle logic: Match specialty mapping behavior
// - When showAllCategories is true: Show ALL surveys regardless of Data View (override filter)
// - When showAllCategories is false: Respect Data View selection (filter by selectedProviderType)
const dataProviderType = (showAllCategories || selectedProviderType === 'BOTH') 
  ? undefined // undefined = show all (override Data View filter)
  : selectedProviderType; // Respect Data View selection - PHYSICIAN excludes Call Pay, APP excludes Call Pay
```

### 4. Component Files (No Changes Needed)
- `src/features/mapping/components/ProviderTypeMapping.tsx` - Already had correct toggle handlers
- `src/features/mapping/components/RegionMapping.tsx` - Already had correct toggle handlers

## Critical Rules for Future Development

### ✅ DO:
1. **Always match Specialty Mapping logic** - The Specialty Mapping screen is the reference implementation
2. **Use `undefined` for "Show All"** - When button is enabled, pass `undefined` to service methods
3. **Use `selectedProviderType` for filtering** - When button is disabled, pass the actual provider type
4. **Use sophisticated filtering in service layer** - Always use `isCallPaySurvey()`, `getEffectiveProviderType()`, etc. instead of simple string matching

### ❌ DON'T:
1. **Don't fetch opposite surveys** - When button is ON, show ALL surveys, not just "opposite" surveys
2. **Don't use simple string matching** - Always use the helper methods for Call Pay detection
3. **Don't implement different logic** - All mapping screens (Specialty, Provider Type, Region) must use identical toggle logic
4. **Don't pass `'CALL'` when showing all** - Pass `undefined` to show everything

## Testing Checklist

When testing the "Show All Survey Types" button:

1. **Provider View (PHYSICIAN or APP):**
   - Button OFF: Should show only Provider surveys (excludes Call Pay)
   - Button ON: Should show ALL surveys (includes Call Pay + Provider)

2. **Call Pay View (CALL):**
   - Button OFF: Should show only Call Pay surveys
   - Button ON: Should show ALL surveys (includes Call Pay + Provider)

3. **Both View:**
   - Button OFF: Should show all surveys (no filter)
   - Button ON: Should show all surveys (no filter)

## Reference Implementation

The **Specialty Mapping screen** (`src/features/mapping/hooks/useMappingData.ts`) is the reference implementation. Any new mapping screens should copy this exact pattern:

```typescript
const dataProviderType = (showAllProviderTypes || selectedProviderType === 'BOTH') 
  ? undefined // undefined = show all (override Data View filter)
  : selectedProviderType; // Respect Data View selection - PHYSICIAN excludes Call Pay, APP excludes Call Pay
```

## Related Files

- `src/features/mapping/hooks/useMappingData.ts` - Reference implementation (Specialty Mapping)
- `src/features/mapping/hooks/useProviderTypeMappingData.ts` - Fixed implementation
- `src/features/mapping/hooks/useRegionMappingData.ts` - Fixed implementation
- `src/services/IndexedDBService.ts` - Service layer with filtering logic
- `src/features/mapping/components/SpecialtyMapping.tsx` - Reference UI implementation

## Date Fixed
January 2025

## Notes
- The button's visual state (enabled/disabled) should match its logical state
- The button enables when `showAllCategories = true` (showing all surveys)
- The button disables when `showAllCategories = false` (filtering by Data View)


