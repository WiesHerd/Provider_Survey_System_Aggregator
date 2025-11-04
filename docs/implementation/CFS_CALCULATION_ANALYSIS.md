# CFs Calculation Issue - Comprehensive Analysis

## 📋 Issue Summary
**Problem**: CFs section in analytics table shows "n/a" for Simple Average and Weighted Average rows, while TCC and Work RVUs display calculated values correctly.

**Location**: `http://localhost:3000/analytics` - Benchmarking screen

**Test Case**: Allergy/Immunology specialty shows CFs data (p25, p50, p75) but p90 = N/A, yet Simple/Weighted averages show "n/a" across all columns.

---

## 🔍 Root Cause Analysis

### 1. **Variable Name Mapping Issue**
The system uses **variable name mapping** to translate user-facing variable names to internal field names. The issue is in how "CFs" is being mapped:

**User selects**: `cfs` (plural)  
**System expects**: `cf` (singular) in legacy data structure  
**Result**: Mismatch causes summary calculation to fail

### 2. **Code Flow Analysis**

#### **Step 1: Variable Selection**
- User selects variables: `['tcc', 'work_rvus', 'cfs']`
- Variable names are normalized in `variableFormatters.ts`

#### **Step 2: Data Structure**
Legacy data structure uses singular field names:
```typescript
interface AggregatedData {
  tcc_n_orgs, tcc_p25, tcc_p50, tcc_p75, tcc_p90
  wrvu_n_orgs, wrvu_p25, wrvu_p50, wrvu_p75, wrvu_p90
  cf_n_orgs, cf_p25, cf_p50, cf_p75, cf_p90  // ← SINGULAR "cf"
}
```

#### **Step 3: Summary Calculation**
**File**: `src/features/analytics/hooks/useMemoizedCalculations.ts` (Line 181-187)

```typescript
if (variables && variables.length > 0) {
  // Dynamic variables calculation
  result = calculateDynamicSummaryRows(rows as any[], variables);
} else {
  // Legacy calculation
  result = calculateSummaryRows(rows);
}
```

**Issue**: When variables are selected (`['tcc', 'work_rvus', 'cfs']`), the system calls `calculateDynamicSummaryRows()` which expects variable names to match the data structure.

#### **Step 4: Dynamic Summary Calculation**
**File**: `src/features/analytics/utils/analyticsCalculations.ts` (Line 367-443)

```typescript
export const calculateDynamicSummaryRows = (
  rows: any[],
  selectedVariables: string[]
) => {
  selectedVariables.forEach(varName => {
    rows.forEach(row => {
      const metrics = row.variables?.[varName];  // ← LOOKS FOR 'cfs' in row.variables
      if (metrics && metrics.p50 > 0) {
        // ... calculation
      }
    });
  });
}
```

**Problem**: Legacy data doesn't have `row.variables` object. Instead, it has flat fields like `cf_p25`, `cf_p50`, etc.

#### **Step 5: Legacy Field Mapping**
**File**: `src/features/analytics/components/AnalyticsTable.tsx` (Line 909-942)

```typescript
const legacyFieldMap: Record<string, string> = {
  'tcc': 'tcc',
  'work_rvus': 'wrvu',
  'wrvu': 'wrvu',
  'cf': 'cf',
  'conversion_factor': 'cf',
  'tcc_per_work_rvu': 'cf',
  'cfs': 'cf',  // ← MAPS 'cfs' to 'cf'
  'tcc_per_work_rvus': 'cf'
};
```

This mapping exists in the **table display logic** but NOT in the **summary calculation logic**.

---

## 🔧 The Two Calculation Paths

### **Path 1: calculateSummaryRows() - WORKING** ✅
**Used when**: No variables selected (legacy mode)  
**Logic**: Directly accesses `row.cf_p25`, `row.cf_p50`, etc.

```typescript
const cfRows = rows.filter(row => row.cf_p50 > 0);
const simple = {
  cf_p25: cfRows.length > 0 ? cfRows.reduce((sum, row) => sum + row.cf_p25, 0) / cfRows.length : 0,
  cf_p50: cfRows.length > 0 ? cfRows.reduce((sum, row) => sum + row.cf_p50, 0) / cfRows.length : 0,
  // ... etc
};
```

**Result**: Works correctly because it accesses fields directly.

### **Path 2: calculateDynamicSummaryRows() - BROKEN** ❌
**Used when**: Variables selected (e.g., `['tcc', 'work_rvus', 'cfs']`)  
**Logic**: Tries to access `row.variables[varName]`

```typescript
rows.forEach(row => {
  const metrics = row.variables?.[varName];  // ← Looks for row.variables.cfs
  if (metrics && metrics.p50 > 0) {
    // ... calculation
  }
});
```

**Result**: Fails because:
1. Legacy data doesn't have `row.variables` object
2. Even if it did, it would need to map `'cfs'` → `'cf'`

---

## 🎯 Why TCC and Work RVUs Work

**TCC works**:
- Variable name: `'tcc'` 
- Field prefix: `tcc_` 
- Match: ✅ Direct match

**Work RVUs works**:
- Variable name: `'work_rvus'`
- Field prefix: `wrvu_`
- Mapping in `mapVariableNameToStandard()`: `'work_rvus'` → `'work_rvus'`
- Legacy field map: `'work_rvus'` → `'wrvu'`
- Match: ✅ Works via mapping

**CFs fails**:
- Variable name: `'cfs'` (plural selected by user)
- Field prefix: `cf_` (singular in data)
- Legacy field map exists in table display but NOT in summary calculation
- Match: ❌ No mapping in `calculateDynamicSummaryRows()`

---

## 📊 Conflicting Rulesets Identified

### **Conflict 1: Variable Name Normalization**
- **File 1**: `variableFormatters.ts` - Maps `'cfs'` → `'tcc_per_work_rvu'`
- **File 2**: `AnalyticsTable.tsx` - Maps `'cfs'` → `'cf'`
- **Result**: Inconsistent mapping across components

### **Conflict 2: Dual Calculation Systems**
- **System 1**: `calculateSummaryRows()` - Direct field access (legacy)
- **System 2**: `calculateDynamicSummaryRows()` - Variable object access (dynamic)
- **Result**: No bridge between systems for legacy data

### **Conflict 3: Data Structure Assumptions**
- **Assumption 1**: Dynamic variables use `row.variables[varName]` structure
- **Reality**: Legacy data uses flat structure (`row.cf_p25`, `row.cf_p50`)
- **Result**: `calculateDynamicSummaryRows()` can't read legacy data

---

## 🛠️ Comprehensive Fix Plan

### **Solution 1: Enhance calculateDynamicSummaryRows() - RECOMMENDED** ✅

**Location**: `src/features/analytics/utils/analyticsCalculations.ts`

**Approach**: Add legacy data fallback logic to `calculateDynamicSummaryRows()`

```typescript
export const calculateDynamicSummaryRows = (
  rows: any[],
  selectedVariables: string[]
) => {
  // ADD: Legacy field mapping
  const legacyFieldMap: Record<string, string> = {
    'tcc': 'tcc',
    'work_rvus': 'wrvu',
    'wrvu': 'wrvu',
    'cf': 'cf',
    'conversion_factor': 'cf',
    'tcc_per_work_rvu': 'cf',
    'cfs': 'cf',
    'tcc_per_work_rvus': 'cf'
  };

  selectedVariables.forEach(varName => {
    rows.forEach(row => {
      // Try dynamic variables first
      const metrics = row.variables?.[varName];
      
      // FALLBACK: Try legacy data structure
      if (!metrics && !row.variables) {
        const legacyPrefix = legacyFieldMap[varName] || varName;
        const legacyMetrics = {
          n_orgs: row[`${legacyPrefix}_n_orgs`] || 0,
          n_incumbents: row[`${legacyPrefix}_n_incumbents`] || 0,
          p25: row[`${legacyPrefix}_p25`] || 0,
          p50: row[`${legacyPrefix}_p50`] || 0,
          p75: row[`${legacyPrefix}_p75`] || 0,
          p90: row[`${legacyPrefix}_p90`] || 0
        };
        
        // Use legacy metrics if p50 > 0
        if (legacyMetrics.p50 > 0) {
          // ... continue calculation with legacyMetrics
        }
      }
    });
  });
};
```

**Advantages**:
- ✅ Maintains backward compatibility
- ✅ Works with both dynamic and legacy data
- ✅ Centralized logic in one function
- ✅ No changes to other components

### **Solution 2: Force Legacy Calculation Path** (Alternative)

**Location**: `src/features/analytics/hooks/useMemoizedCalculations.ts`

**Approach**: Detect legacy data and use `calculateSummaryRows()` even with variables selected

```typescript
let result;
const hasLegacyStructure = rows.length > 0 && !rows[0].variables;

if (variables && variables.length > 0 && !hasLegacyStructure) {
  result = calculateDynamicSummaryRows(rows as any[], variables);
} else {
  // Use legacy calculation
  result = calculateSummaryRows(rows);
}
```

**Disadvantages**:
- ❌ Doesn't support selecting specific variables with legacy data
- ❌ All-or-nothing approach

---

## 🧪 Testing Strategy

### **Test 1: Legacy Data with Selected Variables**
1. Load Gallagher Physician data (legacy format)
2. Select variables: TCC, Work RVUs, CFs
3. Navigate to Allergy/Immunology
4. **Expected**: All three sections show Simple/Weighted averages

### **Test 2: Dynamic Data with Selected Variables**
1. Load survey with dynamic variable structure
2. Select variables: TCC, Work RVUs, CFs
3. **Expected**: All sections show calculations correctly

### **Test 3: Legacy Data without Variables**
1. Load Gallagher Physician data
2. Don't select variables (all display by default)
3. **Expected**: All sections show calculations (current working state)

### **Test 4: Edge Cases**
- Only CF selected
- CF + TCC only
- All variables selected
- No data for CF (should show n/a)

---

## 📈 Implementation Steps

1. **Update `calculateDynamicSummaryRows()`** in `analyticsCalculations.ts`
   - Add legacy field mapping constant
   - Add fallback logic for legacy data structure
   - Test with console logging

2. **Add Unit Tests**
   - Test with legacy data + variables
   - Test with dynamic data + variables
   - Test mixed scenarios

3. **Verify in Browser**
   - Run all test scenarios
   - Check console for calculation logs
   - Verify numbers match expected values

4. **Clean Up**
   - Remove debug console logs
   - Update documentation
   - Commit changes

---

## ✅ Success Criteria

- [ ] CFs Simple Average displays calculated values (not n/a)
- [ ] CFs Weighted Average displays calculated values (not n/a)
- [ ] TCC and Work RVUs continue to work correctly
- [ ] No performance regression
- [ ] Console shows successful calculations for all variables
- [ ] Works with both legacy and dynamic data structures

---

**Recommended Solution**: Solution 1 (Enhance calculateDynamicSummaryRows)  
**Estimated Effort**: 30 minutes implementation + 30 minutes testing  
**Risk Level**: Low (backward compatible)  
**Priority**: High (user-facing issue)

