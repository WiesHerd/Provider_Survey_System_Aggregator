# Issue History and Solutions

## Critical Issue: Benchmarking Asterisks for Sullivan Cotter APP / WIDE Format (Jan 2025)

- **Problem**: Total Cash Compensation (and other variables) showed as `***` for Sullivan Cotter APP on the benchmarking screen; other surveys showed numeric data.
- **Root cause**: (1) WIDE-format variables were only stored when `p50 > 0`; (2) column pattern was too strict (e.g. no spaces or alternate percentile labels).
- **Fix**: Store variables when any percentile (p25/p50/p75/p90) is defined (including 0); relaxed WIDE column pattern for naming variations.
- **Prevention**: See **docs/issues/BENCHMARKING_WIDE_FORMAT_ASTERISK_FIX.md** for design rules (never require p50 > 0 for storage; handle missing/zero in display only; tolerate column naming variations).

---

## Critical Issue: SurveyAnalytics vs RegionalAnalytics Data Filtering Inconsistency

### **Issue Description**
- **Date**: December 2024
- **Problem**: SurveyAnalytics screen showed "No data available" for specialties that worked perfectly in RegionalAnalytics
- **Specific Case**: "Advanced Heart Failure Transplant Cardiology" showed data in RegionalAnalytics but not in SurveyAnalytics
- **Impact**: Users could not view survey data in the main analytics screen despite data being available

### **Root Cause Analysis**

#### **RegionalAnalytics (Working Approach)**
```typescript
// ✅ CORRECT: Uses source specialties from mapping
const mappedSpecialtyNames = mapping.sourceSpecialties.map((spec: any) => spec.specialty);
const filteredRows = normalizedRows.filter(row => {
  const rowSpecialty = String(row.specialty || '');
  return mappedSpecialtyNames.some((mappedName: string) => 
    rowSpecialty.toLowerCase().includes(mappedName.toLowerCase()) ||
    mappedName.toLowerCase().includes(rowSpecialty.toLowerCase())
  );
});
```

#### **SurveyAnalytics (Broken Approach)**
```typescript
// ❌ INCORRECT: Used only standardized name
const selectedSpecialty = selectedMapping.standardizedName.trim();
const specialtyMatch = rowSpecialty.toLowerCase() === selectedSpecialty.toLowerCase() ||
                      rowSpecialty.toLowerCase().includes(selectedSpecialty.toLowerCase()) ||
                      selectedSpecialty.toLowerCase().includes(rowSpecialty.toLowerCase());
```

### **Why This Happened**

1. **Different Data Sources**: 
   - Raw survey data contains source specialty names (e.g., "cardiology advanced heart failure")
   - Mappings contain both source specialties and standardized names (e.g., "Advanced Heart Failure Transplant Cardiology")

2. **Inconsistent Filtering Logic**:
   - RegionalAnalytics correctly used `mapping.sourceSpecialties` to match against actual data
   - SurveyAnalytics incorrectly used only `standardizedName` which doesn't exist in raw data

3. **Data Transformation Gap**:
   - The data transformation process doesn't always convert source specialties to standardized names
   - Raw data retains original specialty names from CSV files

### **The Fix**

#### **Before (Broken)**
```typescript
// Used only standardized name for filtering
const selectedSpecialty = selectedMapping.standardizedName.trim();
const specialtyMatch = rowSpecialty.toLowerCase() === selectedSpecialty.toLowerCase() ||
                      rowSpecialty.toLowerCase().includes(selectedSpecialty.toLowerCase()) ||
                      selectedSpecialty.toLowerCase().includes(rowSpecialty.toLowerCase());
```

#### **After (Fixed)**
```typescript
// Use source specialties from mapping (same as RegionalAnalytics)
const mappedSpecialtyNames = selectedMapping.sourceSpecialties.map((spec: any) => spec.specialty);
const specialtyMatch = mappedSpecialtyNames.some((mappedName: string) => 
  rowSpecialty.toLowerCase().includes(mappedName.toLowerCase()) ||
  mappedName.toLowerCase().includes(rowSpecialty.toLowerCase())
);
```

### **Key Lessons Learned**

1. **Consistency is Critical**: All analytics screens must use the same filtering logic
2. **Source vs Standardized Names**: Always use source specialties for filtering raw data
3. **Mapping Structure Understanding**: Mappings contain both source and standardized names for different purposes
4. **Data Flow Validation**: Verify that filtering logic matches the actual data structure

### **Prevention Measures**

1. **Unified Filtering Logic**: All analytics components should use the same filtering approach
2. **Data Structure Documentation**: Document the difference between source and standardized specialty names
3. **Cross-Screen Testing**: Always test the same specialty across multiple screens
4. **Code Review Checklist**: Ensure filtering logic uses `sourceSpecialties` not just `standardizedName`

### **Files Modified**
- `src/components/SurveyAnalytics.tsx` - Fixed filtering logic to match RegionalAnalytics

### **Testing Checklist**
- [ ] Same specialty shows data in both SurveyAnalytics and RegionalAnalytics
- [ ] Filtering works consistently across all analytics screens
- [ ] No "No data available" when data exists in other screens
- [ ] Source specialty names are properly matched against raw data

---

## Critical Issue: Header Row Appearing as First Data Row in AG Grid

### **Issue Description**
- **Date**: December 2024
- **Problem**: CSV header row was appearing as the first data row in the AG Grid preview
- **Specific Case**: Headers like "specialty", "provider_type", "geographic_region" were showing as data instead of column headers
- **Impact**: Users saw duplicate headers - once as actual column headers and once as the first data row

### **Root Cause Analysis**

#### **The Problem Chain**
1. **CSV Parsing**: Initially had flawed logic trying to detect and remove header rows
2. **Data Storage**: Some header rows were stored in IndexedDB as data
3. **Data Display**: DataPreview component was adding headers twice - once as column definitions and once as first data row

#### **DataPreview Component Issue (Primary Cause)**
```typescript
// ❌ INCORRECT: Adding headers as first data row
setPreviewData([headers, ...rows]);

// This caused:
// - Headers used for AG Grid column definitions (correct)
// - Headers also added as first data row (incorrect)
```

#### **IndexedDB Filtering Issue (Secondary)**
```typescript
// ❌ INCOMPLETE: Filter wasn't catching all header-like rows
const isFirstRowHeaders = JSON.stringify(firstRowValues) === JSON.stringify(headers);
```

### **The Fix**

#### **1. Fixed DataPreview Component**
```typescript
// ✅ CORRECT: Separate headers from data
const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);

// Store headers separately
setPreviewHeaders(headers);
setPreviewData(rows); // Only data, no headers

// Use separate headers for column definitions
const createColumnDefs = () => {
  const headers = previewHeaders; // Use stored headers
  // ... column definition logic
};
```

#### **2. Enhanced IndexedDB Filtering**
```typescript
// ✅ IMPROVED: More robust header detection
const headerKeywords = [
  'specialty', 'provider_type', 'geographic_region', 'variable', 
  'n_orgs', 'n_incumbents', 'p25', 'p50', 'p75', 'p90'
];

const headerMatches = values.filter(val => 
  typeof val === 'string' && 
  headerKeywords.some(keyword => 
    val.toLowerCase().includes(keyword.toLowerCase()) || 
    keyword.toLowerCase().includes(val.toLowerCase())
  )
).length;

const isHeaderRow = headerMatches > (values.length / 2);
```

### **Key Lessons Learned**

1. **Separation of Concerns**: Headers and data should be stored separately, not mixed together
2. **AG Grid Data Structure**: AG Grid expects headers as column definitions and data as row objects
3. **Defensive Filtering**: Multiple layers of filtering prevent header rows from appearing as data
4. **Console Logging**: Debugging logs helped identify where the issue was occurring

### **Prevention Measures**

1. **Clear Data Structure**: Always separate metadata (headers) from actual data
2. **AG Grid Best Practices**: Use columnDefs for headers, rowData for data only
3. **Robust Filtering**: Implement multiple layers of header detection
4. **Visual Testing**: Always verify that headers appear only as column headers, not as data

### **Files Modified**
- `src/components/DataPreview.tsx` - Fixed header/data separation
- `src/services/IndexedDBService.ts` - Enhanced header row filtering

### **Testing Checklist**
- [ ] Headers appear only as column headers in AG Grid
- [ ] No duplicate header rows in data
- [ ] CSV upload properly separates headers from data
- [ ] Existing data with header rows is filtered out
- [ ] Console logs show proper filtering activity

---

## Previous Issues

### [Add previous issues here as they occur] 