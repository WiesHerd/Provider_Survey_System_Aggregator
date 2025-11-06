# Regional Analytics Data Flow & Upstream Requirements

## Overview
Regional Analytics requires **exact matching** between specialty names in the dropdown and `standardizedName` in the processed data. This document explains the data flow and what must be configured upstream.

## Data Flow Architecture

### 1. Data Loading (`useBenchmarkingQuery`)
```
Raw Survey Data (IndexedDB)
  ↓
getAnalyticsDataByVariables()
  ↓
normalizeRowDynamic() - Processes each row
  ↓
normalizeSpecialty() - Maps raw specialty → standardizedName
  ↓
DynamicAggregatedData[] - Contains standardizedName
  ↓
Regional Analytics Component
```

### 2. Specialty Normalization Process

**Step 1: Extract Raw Specialty**
```typescript
const rawSpecialty = actualRowData.specialty || actualRowData.Specialty || ...
// Example: "Pediatrics (General)" or "General Pediatrics" from MGMA Call Pay
```

**Step 2: Apply Specialty Mapping**
```typescript
const normalizedSpecialty = this.normalizeSpecialty(
  rawSpecialty,                    // "Pediatrics (General)"
  mappings.specialtyMappings,      // User-created mappings from Data Management
  survey.type,                     // "MGMA Call Pay" or "MGMA Physician"
  mappings.learnedSpecialtyMappings // Auto-learned mappings
);
```

**Step 3: Mapping Lookup Logic**
1. **First**: Check learned mappings (auto-learned from previous mappings)
2. **Second**: Check exact mapping match in `specialtyMappings`:
   - **CRITICAL FIX**: Normalizes `survey.type` to remove year suffix (e.g., "MGMA Call Pay 2025" → "MGMA Call Pay")
   - Looks for `sourceSpecialties` where:
     - `source.surveySource === survey.type` OR normalized versions match (handles year differences)
     - `source.specialty.toLowerCase() === rawSpecialty.toLowerCase()`
   - Returns `mapping.standardizedName` if found
3. **Third**: Try fuzzy matching (normalized comparison, also handles year normalization)
4. **Fallback**: Return normalized version of raw specialty

**Step 4: Store as standardizedName**
```typescript
DynamicAggregatedData {
  standardizedName: normalizedSpecialty, // "Pediatrics: General"
  surveySpecialty: rawSpecialty,         // "Pediatrics (General)"
  ...
}
```

### 3. Regional Analytics Filtering

**Dropdown Population:**
```typescript
const specialties = mappings.map(m => m.standardizedName).sort();
// Shows: ["Pediatrics: General", "Cardiology", ...]
```

**Filter Logic:**
```typescript
if (row.standardizedName !== selectedSpecialty) {
  return false; // EXACT MATCH REQUIRED
}
```

## Critical Upstream Requirements

### ✅ Requirement 1: Specialty Mapping Must Exist

**What needs to be done:**
1. Go to **Data Management → Specialties**
2. Find or create a mapping for "Pediatrics: General" (or your target specialty)
3. **CRITICAL**: Add the raw specialty name from "MGMA Call Pay" as a source specialty

**Example Mapping:**
```
Standardized Name: "Pediatrics: General"
Source Specialties:
  - Survey: "MGMA Physician", Specialty: "Pediatrics (General)"
  - Survey: "MGMA Call Pay", Specialty: "Pediatrics (General)"  ← MUST EXIST
  - Survey: "SullivanCotter Physician", Specialty: "General Pediatrics"
```

**Why this matters:**
- If "MGMA Call Pay" specialty isn't mapped, `normalizeSpecialty()` will return a normalized fallback
- The fallback might not match "Pediatrics: General" exactly
- Result: Data filtered out

### ✅ Requirement 2: Survey Type Must Match

**What needs to be correct:**
- The `survey.type` field must exactly match what's in the specialty mapping
- Common values: "MGMA Call Pay", "MGMA Physician", "SullivanCotter Physician"

**Check:**
```typescript
// In normalizeSpecialty(), this lookup happens:
// ENTERPRISE FIX: Handles year suffixes automatically
const normalizedSurveySource = survey.type.replace(/\s+\d{4}$/, '').trim();
mapping.sourceSpecialties.some(source => 
  (source.surveySource === survey.type || 
   source.surveySource.replace(/\s+\d{4}$/, '').trim() === normalizedSurveySource) &&  // ← Handles year differences
  source.specialty.toLowerCase() === rawSpecialty.toLowerCase()
)
```

**Note:** The system now automatically handles year suffixes, so "MGMA Call Pay 2025" will match "MGMA Call Pay" in your mappings.

### ✅ Requirement 3: StandardizedName Must Match Exactly

**The Problem:**
- Dropdown shows: `mappings.map(m => m.standardizedName)` → "Pediatrics: General"
- Data has: `row.standardizedName` → Must be exactly "Pediatrics: General"
- If they don't match exactly → No data shown

**Why Fuzzy Matching "Worked":**
- Fuzzy matching allowed variations like "Pediatrics: General" vs "Pediatrics (General)"
- But this bypasses the mapping system you've built
- Exact matching enforces proper mapping configuration

### ✅ Requirement 4: Region Mapping Must Exist

**What needs to be done:**
1. Go to **Data Management → Regions**
2. Ensure regions from Call Pay data are mapped to parent regions:
   - "Eastern" → "northeast"
   - "Midwest" → "midwest"
   - "Southern" → "south"
   - "Western" → "west"
   - "National" → "national"

**Note:** Based on your screenshot, region mappings appear to be configured correctly.

### ✅ Requirement 5: Variable Discovery

**What needs to happen:**
- Call Pay variable must be discovered (e.g., "Daily Rate On-Call Compensation" → `on_call_compensation`)
- Variable must have valid percentile data (p25, p50, p75, p90 > 0)

## Debugging Checklist

When Call Pay data doesn't show:

1. **Check Console Logs:**
   ```
   🔍 Regional Analytics: Call Pay specialties (standardizedName): [...]
   🔍 Regional Analytics - Specialties for dropdown: [...]
   ```
   - Compare these two arrays
   - If they don't match → Specialty mapping issue

2. **Check Specialty Mapping:**
   - Go to Data Management → Specialties
   - Find "Pediatrics: General" (or your specialty)
   - Verify "MGMA Call Pay" is listed as a source survey
   - Verify the raw specialty name matches what's in the Call Pay data

3. **Check Raw Data:**
   - Upload screen → Preview Call Pay data
   - Note the exact specialty name in the `specialty` column
   - Ensure this exact name is mapped in Data Management

4. **Check Survey Type:**
   - Verify `survey.type` for Call Pay survey is "MGMA Call Pay"
   - This must match the `surveySource` in specialty mappings

## Solution: What You Need to Do

1. **Go to Data Management → Specialties**
2. **Find "Pediatrics: General" mapping** (or create it)
3. **Add source specialty:**
   - Survey Source: "MGMA Call Pay"
   - Specialty: [The exact specialty name from your Call Pay CSV]
4. **Save the mapping**
5. **Re-process the data** (may need to refresh or re-upload)

The exact matching ensures data integrity and enforces proper mapping configuration, which is why it's the correct approach for an enterprise system.

