# Issue History and Solutions

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

## Previous Issues

### [Add previous issues here as they occur] 