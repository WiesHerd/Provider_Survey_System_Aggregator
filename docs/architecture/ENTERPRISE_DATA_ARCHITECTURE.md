# Enterprise Data Architecture & Flow Guide

## 🎯 Purpose
This document provides a **complete understanding** of how data flows through the system, from raw CSV upload to final analytics display. Use this as the **single source of truth** when implementing new screens that aggregate data from multiple sources.

---

## 📊 Data Architecture Overview

### Three-Layer Data Model

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: RAW DATA (IndexedDB)                              │
│ - Raw CSV rows as uploaded                                  │
│ - No normalization, no mapping                              │
│ - Stored in survey_data table                               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: NORMALIZED DATA (In-Memory Processing)            │
│ - Applied mappings (specialty, provider type, region)       │
│ - Standardized field names                                  │
│ - Variable discovery and normalization                      │
│ - Created by AnalyticsDataService                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: AGGREGATED DATA (Analytics Display)                │
│ - Grouped by standardizedName + region + surveySource        │
│ - Percentile calculations (p25, p50, p75, p90)            │
│ - Ready for display in tables/charts                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Data Flow Pipeline

### Phase 1: Upload & Storage

```
CSV File Upload
    ↓
SurveyDataService.processDataInMainThread()
    ↓
Parse CSV → Extract columns → Detect format (LONG vs WIDE)
    ↓
Store in IndexedDB:
  - surveys table: Metadata (name, type, year, providerType, dataCategory)
  - survey_data table: Raw rows (data column = JSON blob of entire row)
```

**Key Points:**
- **Raw data is NEVER modified** - stored exactly as uploaded
- `data` column contains the complete row as JSON
- Survey metadata includes: `type`, `providerType`, `dataCategory`, `surveyYear`

---

### Phase 2: Data Normalization (The Critical Step)

**Service:** `AnalyticsDataService.normalizeRowDynamic()`

```
Raw Row from IndexedDB
    ↓
Extract actualRowData (from row.data JSON or row itself)
    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Specialty Normalization                         │
│ normalizeSpecialty(rawSpecialty, mappings, survey.type) │
│                                                          │
│ Lookup Order:                                           │
│ 1. Learned mappings (auto-learned)                     │
│ 2. Exact mapping match (handles year suffixes)         │
│ 3. Fuzzy matching (normalized comparison)              │
│ 4. Fallback: normalized raw specialty                  │
│                                                          │
│ Result: standardizedName (e.g., "pediatrics: general") │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Provider Type Normalization                     │
│ normalizeProviderType(rawProviderType, mappings)        │
│                                                          │
│ Lookup Order:                                           │
│ 1. Provider type mappings                              │
│ 2. Learned provider type mappings                      │
│ 3. Fallback: title case normalization                   │
│                                                          │
│ Result: providerType (e.g., "Staff Physician")        │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Region Normalization                            │
│ normalizeRegion(rawRegion, mappings)                    │
│                                                          │
│ Lookup Order:                                           │
│ 1. Region mappings (maps to parent region)             │
│ 2. Learned region mappings                             │
│ 3. Fallback: lowercase normalization                   │
│                                                          │
│ Result: geographicRegion (e.g., "northeast")           │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ STEP 4: Variable Extraction                            │
│                                                          │
│ FORMAT DETECTION:                                       │
│ - LONG: Has "variable" column → Extract p25/p50/p75/p90│
│ - WIDE: Columns like "tcc_p25", "wrvu_p50" → Extract  │
│                                                          │
│ VARIABLE MAPPING:                                       │
│ 1. Apply user-created variable mappings                │
│ 2. Apply learned variable mappings                     │
│ 3. Normalize variable name (lowercase, underscores)   │
│                                                          │
│ Result: variables: {                                    │
│   "on_call_compensation": { p25, p50, p75, p90 },     │
│   "tcc": { p25, p50, p75, p90 }                        │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
    ↓
DynamicNormalizedRow {
  standardizedName: "pediatrics: general",
  providerType: "Staff Physician",
  geographicRegion: "northeast",
  surveySource: "MGMA Call Pay",
  surveyYear: "2025",
  dataCategory: "CALL_PAY",
  variables: { ... }
}
```

**Critical Understanding:**
- **Normalization happens ON-THE-FLY** during data retrieval, not during upload
- **Mappings are applied at this stage** - if mapping doesn't exist, fallback normalization is used
- **Variable discovery** happens here - system detects what variables exist in the data

---

### Phase 3: Data Aggregation

**Service:** `AnalyticsDataService.getAnalyticsDataByVariables()`

```
Array of DynamicNormalizedRow[]
    ↓
Group by aggregation key:
  key = `${standardizedName}|${geographicRegion}|${surveySource}|${providerType}|${surveyYear}`
    ↓
For each group:
  - Extract all variables from all rows in group
  - Calculate percentiles (p25, p50, p75, p90) for each variable
  - Aggregate n_orgs and n_incumbents
    ↓
DynamicAggregatedData[] {
  standardizedName: "pediatrics: general",
  geographicRegion: "northeast",
  surveySource: "MGMA Call Pay",
  variables: {
    "on_call_compensation": {
      n_orgs: 5,
      n_incumbents: 12,
      p25: 275,
      p50: 500,
      p75: 800,
      p90: 1200
    }
  }
}
```

**Key Points:**
- **Aggregation groups** rows with the same standardizedName + region + surveySource
- **Each variable** gets its own percentiles and org/incumbent counts
- **Multiple surveys** can contribute to the same aggregated record (if they have same standardizedName)

---

### Phase 4: Display & Filtering

**Component:** `RegionalAnalytics.tsx`, `Analytics.tsx`, etc.

```
DynamicAggregatedData[]
    ↓
Apply Filters:
  - Specialty: row.standardizedName === selectedSpecialty (case-insensitive)
  - Provider Type: row.providerType === selectedProviderType (with Call Pay special handling)
  - Survey Source: row.surveySource === selectedSurveySource
  - Data Category: row.dataCategory === selectedDataCategory
  - Year: row.surveyYear === selectedYear
  - Region: row.geographicRegion === selectedRegion (after parent region mapping)
    ↓
Filtered DynamicAggregatedData[]
    ↓
Extract values for display:
  - For each selectedVariable
  - Get percentile values from row.variables[variableName]
  - Format using VariableFormattingService
    ↓
Render in tables/charts
```

---

## 🗺️ Mapping Architecture

### Mapping Types & Their Roles

#### 1. Specialty Mappings
**Purpose:** Standardize specialty names across different survey sources

**Structure:**
```typescript
{
  id: string;
  standardizedName: "pediatrics: general";
  sourceSpecialties: [
    {
      surveySource: "MGMA Call Pay",  // Must match survey.type (handles year suffix)
      specialty: "Pediatrics (General)" // Raw specialty from CSV
    },
    {
      surveySource: "SullivanCotter Physician",
      specialty: "General Pediatrics"
    }
  ]
}
```

**How It Works:**
- When normalizing: `normalizeSpecialty("Pediatrics (General)", mappings, "MGMA Call Pay 2025")`
- System strips year from `survey.type` → "MGMA Call Pay"
- Finds mapping where `source.surveySource === "MGMA Call Pay"` AND `source.specialty === "Pediatrics (General)"`
- Returns `mapping.standardizedName` → "pediatrics: general"

**Critical:** If mapping doesn't exist, system uses fallback normalization, which may not match dropdown options.

---

#### 2. Provider Type Mappings
**Purpose:** Standardize provider type names

**Structure:**
```typescript
{
  id: string;
  standardizedName: "Staff Physician";
  sourceProviderTypes: [
    {
      surveySource: "MGMA Call Pay",
      providerType: "staff physician"  // Raw from CSV
    }
  ]
}
```

**How It Works:**
- Normalizes raw provider type to standardized name
- Used for filtering in analytics screens
- **Special Case:** Call Pay data (`providerType='CALL'`) is treated as "Staff Physician" for filtering

---

#### 3. Region Mappings
**Purpose:** Map diverse regional names to parent regions

**Structure:**
```typescript
{
  id: string;
  parentRegion: "northeast";
  sourceRegions: [
    {
      surveySource: "MGMA Call Pay",
      region: "eastern"  // Raw from CSV
    },
    {
      surveySource: "SullivanCotter Physician",
      region: "northeast"
    }
  ]
}
```

**How It Works:**
- Maps raw region names to parent regions (northeast, south, midwest, west, national)
- Used for regional analytics aggregation
- **Critical:** If region isn't mapped, it won't appear in regional analytics

---

#### 4. Variable Mappings
**Purpose:** Standardize variable names across surveys

**Structure:**
```typescript
{
  id: string;
  standardizedName: "on_call_compensation";
  sourceVariables: [
    {
      surveySource: "MGMA Call Pay",
      variableName: "Daily Rate On-Call Compensation"  // Raw from CSV
    }
  ]
}
```

**How It Works:**
- Maps raw variable names to standardized names
- Applied during `normalizeRowDynamic()` variable extraction
- Used for variable discovery and display

---

#### 5. Column Mappings
**Purpose:** Map raw CSV column names to standardized field names

**Structure:**
```typescript
{
  id: string;
  surveySource: "MGMA Call Pay";
  rawColumnName: "p25";
  standardizedColumnName: "p25";  // For percentile columns
}
```

**How It Works:**
- Maps percentile columns (p25, p50, p75, p90) to standardized names
- **Note:** For LONG format data, these are extracted directly from row data
- For WIDE format, column mappings help identify variable columns

---

## 📐 Data Structures Reference

### Raw Data (IndexedDB)

```typescript
// surveys table
interface ISurvey {
  id: string;
  name: string;              // "MGMA Call Pay 2025.csv"
  type: string;              // "MGMA Call Pay" (may include year)
  providerType: string;      // "Physician" or "APP"
  dataCategory: string;     // "CALL_PAY", "COMPENSATION", "MOONLIGHTING"
  surveyYear: string;       // "2025"
  uploadDate: string;        // ISO timestamp
}

// survey_data table
interface ISurveyRow {
  id: string;
  surveyId: string;
  data: any;                // Complete row as JSON blob
  // OR direct fields if stored flat:
  specialty?: string;
  provider_type?: string;
  geographic_region?: string;
  variable?: string;        // For LONG format
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  n_orgs?: number;
  n_incumbents?: number;
}
```

---

### Normalized Data (In-Memory)

```typescript
interface DynamicNormalizedRow {
  standardizedName: string;        // From specialty mapping
  providerType: string;            // From provider type mapping
  geographicRegion: string;        // From region mapping (parent region)
  surveySource: string;           // survey.type
  surveyYear: string;             // survey.surveyYear
  dataCategory: string;           // survey.dataCategory
  variables: Record<string, VariableMetrics>;
  rawData: any;                   // Original row for reference
}

interface VariableMetrics {
  variableName: string;
  n_orgs: number;
  n_incumbents: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}
```

---

### Aggregated Data (Analytics Display)

```typescript
interface DynamicAggregatedData {
  standardizedName: string;
  surveySource: string;
  surveySpecialty: string;          // Original specialty from survey
  geographicRegion: string;        // Parent region
  providerType?: string;
  surveyYear?: string;
  dataCategory?: string;
  
  // Dynamic variables - structure adapts to what's in the data
  variables: Record<string, VariableMetrics>;
}

// Legacy format (still supported)
interface AggregatedData {
  standardizedName: string;
  surveySource: string;
  geographicRegion: string;
  
  // Fixed variables (TCC, wRVU, CF)
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  
  // Each variable has its own org/incumbent counts
  tcc_n_orgs: number;
  tcc_n_incumbents: number;
  wrvu_n_orgs: number;
  wrvu_n_incumbents: number;
  cf_n_orgs: number;
  cf_n_incumbents: number;
}
```

---

## 🛠️ How to Implement New Aggregation Screens

### Step-by-Step Guide

#### Step 1: Understand Your Data Requirements

**Questions to Answer:**
1. What data do you need? (Compensation, Call Pay, Moonlighting, Custom)
2. How should it be grouped? (By specialty? By region? By provider type?)
3. What variables are needed? (TCC, wRVU, CF, or custom variables?)
4. What filters are needed? (Year, Survey Source, Provider Type, etc.)

---

#### Step 2: Use the Correct Data Service

**For Analytics/Aggregation Screens:**
```typescript
import { AnalyticsDataService } from '@/features/analytics/services/analyticsDataService';

const analyticsService = new AnalyticsDataService();

// Get aggregated data
const data = await analyticsService.getAnalyticsDataByVariables({
  specialty: selectedSpecialty || '',
  surveySource: selectedSurveySource || '',
  geographicRegion: selectedRegion || '',
  providerType: selectedProviderType || '',
  year: selectedYear || ''
});

// Returns: DynamicAggregatedData[]
```

**Key Points:**
- `getAnalyticsDataByVariables()` returns **already normalized and aggregated** data
- Data is grouped by: `standardizedName + geographicRegion + surveySource + providerType + surveyYear`
- Each row contains `variables` object with all available variables

---

#### Step 3: Filter the Data

**Pattern:**
```typescript
const filtered = useMemo(() => {
  return data.filter(row => {
    // Specialty filter (case-insensitive)
    if (selectedSpecialty && 
        row.standardizedName.toLowerCase() !== selectedSpecialty.toLowerCase()) {
      return false;
    }
    
    // Provider type filter (with Call Pay special handling)
    if (selectedProviderType && 
        selectedProviderType.toLowerCase() !== 'all provider types') {
      const isCallPayData = row.dataCategory === 'CALL_PAY';
      const isCallPayFilter = selectedProviderType === 'Staff Physician' || 
                              selectedProviderType === 'Physician';
      
      if (isCallPayData && isCallPayFilter) {
        // Allow Call Pay data through
      } else if (row.providerType?.toLowerCase() !== selectedProviderType.toLowerCase()) {
        return false;
      }
    }
    
    // Survey source filter
    if (selectedSurveySource && 
        selectedSurveySource.toLowerCase() !== 'all survey sources' &&
        row.surveySource !== selectedSurveySource) {
      return false;
    }
    
    // Data category filter
    if (selectedDataCategory && 
        row.dataCategory !== selectedDataCategory) {
      return false;
    }
    
    // Year filter
    if (selectedYear && row.surveyYear !== selectedYear) {
      return false;
    }
    
    return true;
  });
}, [data, selectedSpecialty, selectedProviderType, selectedSurveySource, selectedDataCategory, selectedYear]);
```

---

#### Step 4: Extract Variable Values

**Pattern:**
```typescript
// Helper function to extract variable value
const getVariableValue = (
  row: DynamicAggregatedData,
  variableName: string,
  percentile: 'p25' | 'p50' | 'p75' | 'p90'
): number => {
  const variable = row.variables[variableName];
  if (!variable) return 0;
  return variable[percentile] || 0;
};

// Usage
const tccP50 = getVariableValue(row, 'tcc', 'p50');
const callPayP50 = getVariableValue(row, 'on_call_compensation', 'p50');
```

---

#### Step 5: Format Values for Display

**Pattern:**
```typescript
import { VariableFormattingService } from '@/features/analytics/services/variableFormattingService';
import { formatCurrency, formatNumber } from '@/shared/utils/formatters';

const formattingService = VariableFormattingService.getInstance();

const formatValue = (variableName: string, value: number): string => {
  const rule = formattingService.getRuleForVariable(variableName);
  
  if (rule?.showCurrency) {
    return formatCurrency(value, rule.decimals || 0);
  }
  
  if (rule?.decimals !== undefined) {
    return formatNumber(value, rule.decimals);
  }
  
  // Default based on variable name
  const lower = variableName.toLowerCase();
  if (lower.includes('tcc') || lower.includes('compensation') || lower.includes('call')) {
    return formatCurrency(value, 0);
  }
  if (lower.includes('per') || lower.includes('factor')) {
    return formatCurrency(value, 2);
  }
  
  return formatNumber(value);
};
```

---

#### Step 6: Populate Dropdowns from Actual Data

**CRITICAL PATTERN:** Always populate dropdowns from actual data, not just mappings

```typescript
// ✅ CORRECT: Populate from actual data
const specialties = useMemo(() => {
  // Extract from actual analytics data
  const specialtiesFromData = Array.from(
    new Set(data.map(row => row.standardizedName).filter(Boolean))
  ).sort();
  
  // Also include from mappings (for completeness)
  const specialtiesFromMappings = mappings.map(m => m.standardizedName);
  
  // Combine and deduplicate
  const allSpecialties = new Set([...specialtiesFromData, ...specialtiesFromMappings]);
  return Array.from(allSpecialties).sort();
}, [data, mappings]);

// ❌ WRONG: Only from mappings (will miss unmapped specialties)
const specialties = mappings.map(m => m.standardizedName);
```

---

## ⚠️ Common Pitfalls & Solutions

### Pitfall 1: Specialty Dropdown Only Shows Mapped Specialties

**Problem:** Dropdown only shows 3 specialties, but data has 60+ specialties.

**Solution:** Populate dropdown from actual data, not just mappings.

```typescript
// ✅ CORRECT
const specialties = useMemo(() => {
  const fromData = Array.from(new Set(data.map(r => r.standardizedName)));
  const fromMappings = mappings.map(m => m.standardizedName);
  return Array.from(new Set([...fromData, ...fromMappings])).sort();
}, [data, mappings]);
```

---

### Pitfall 2: Case-Sensitivity Mismatch

**Problem:** Data has `"pediatrics: general"` but dropdown shows `"Pediatrics: General"`.

**Solution:** Use case-insensitive comparison in filters.

```typescript
// ✅ CORRECT
if (row.standardizedName.toLowerCase() !== selectedSpecialty.toLowerCase()) {
  return false;
}
```

---

### Pitfall 3: Year Suffix in Survey Source

**Problem:** Survey type is `"MGMA Call Pay 2025"` but mapping has `"MGMA Call Pay"`.

**Solution:** System automatically handles this in `normalizeSpecialty()`, but ensure mappings don't include year.

```typescript
// ✅ CORRECT: Mapping should have "MGMA Call Pay" (no year)
// System automatically strips year during lookup
```

---

### Pitfall 4: Call Pay Data Filtered Out

**Problem:** Call Pay data has `providerType='CALL'` but filter is "Staff Physician".

**Solution:** Special handling for Call Pay data.

```typescript
// ✅ CORRECT
const isCallPayData = row.dataCategory === 'CALL_PAY';
const isCallPayFilter = selectedProviderType === 'Staff Physician' || 
                        selectedProviderType === 'Physician';

if (isCallPayData && isCallPayFilter) {
  // Allow through - Call Pay is physician compensation
} else if (row.providerType?.toLowerCase() !== selectedProviderType.toLowerCase()) {
  return false;
}
```

---

### Pitfall 5: Variable Not Found

**Problem:** Variable exists in data but `row.variables[variableName]` is undefined.

**Solution:** Check variable name normalization and try variations.

```typescript
// ✅ CORRECT
const getVariableValue = (row: DynamicAggregatedData, variableName: string, percentile: string) => {
  // Try exact match
  if (row.variables[variableName]) {
    return row.variables[variableName][percentile] || 0;
  }
  
  // Try normalized variations
  const normalized = variableName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (row.variables[normalized]) {
    return row.variables[normalized][percentile] || 0;
  }
  
  return 0;
};
```

---

## 🔍 Debugging Checklist

When data doesn't show up:

1. **Check Raw Data:**
   ```typescript
   // In browser console
   const dataService = getDataService();
   const surveys = await dataService.getAllSurveys();
   const surveyData = await dataService.getSurveyData(surveys[0].id);
   console.log('Raw data:', surveyData.rows[0]);
   ```

2. **Check Normalization:**
   ```typescript
   // Add logging in normalizeRowDynamic()
   console.log('Normalized:', {
     rawSpecialty: actualRowData.specialty,
     standardizedName: normalizedSpecialty,
     surveySource: survey.type
   });
   ```

3. **Check Mappings:**
   ```typescript
   const mappings = await dataService.getAllSpecialtyMappings();
   console.log('Mappings:', mappings);
   ```

4. **Check Aggregation:**
   ```typescript
   const analyticsService = new AnalyticsDataService();
   const data = await analyticsService.getAnalyticsDataByVariables({});
   console.log('Aggregated data:', data.slice(0, 5));
   ```

5. **Check Filters:**
   ```typescript
   console.log('Filter breakdown:', {
     totalRows: data.length,
     afterSpecialty: data.filter(r => r.standardizedName === selectedSpecialty).length,
     afterProviderType: data.filter(r => r.providerType === selectedProviderType).length,
     afterSurveySource: data.filter(r => r.surveySource === selectedSurveySource).length
   });
   ```

---

## 📚 Key Services Reference

### AnalyticsDataService
- **Purpose:** Normalize and aggregate survey data
- **Key Methods:**
  - `getAnalyticsDataByVariables(filters)`: Get aggregated data
  - `normalizeRowDynamic(row, survey, mappings)`: Normalize a single row
  - `normalizeSpecialty(rawSpecialty, mappings, surveyType)`: Normalize specialty

### VariableDiscoveryService
- **Purpose:** Discover available variables in surveys
- **Key Methods:**
  - `discoverAllVariables(dataCategory?)`: Discover all variables

### VariableFormattingService
- **Purpose:** Format variable values for display
- **Key Methods:**
  - `getRuleForVariable(variableName)`: Get formatting rule

### DataService (IndexedDB)
- **Purpose:** Access raw data from IndexedDB
- **Key Methods:**
  - `getAllSurveys()`: Get all surveys
  - `getSurveyData(surveyId)`: Get raw rows for a survey
  - `getAllSpecialtyMappings()`: Get specialty mappings
  - `getRegionMappings()`: Get region mappings

---

## ✅ Summary: Enterprise Architecture Principles

1. **Single Source of Truth:** IndexedDB stores raw data, never modified
2. **Normalization on Demand:** Mappings applied during retrieval, not storage
3. **Dynamic Variables:** System adapts to any variables in the data
4. **Exact Matching:** Filters use exact matches (with case-insensitive fallback)
5. **Data-Driven UI:** Dropdowns populated from actual data, not just mappings
6. **Layered Architecture:** Raw → Normalized → Aggregated → Display

**Remember:** When implementing new screens, always:
- Use `AnalyticsDataService.getAnalyticsDataByVariables()` for aggregated data
- Populate dropdowns from actual data, not just mappings
- Use case-insensitive filtering with exact match fallback
- Handle Call Pay data specially for provider type filtering
- Extract variables using `row.variables[variableName]`
- Format values using `VariableFormattingService`

This architecture ensures consistency, maintainability, and scalability for all future features.





