# Analytics Filtering Standards

## Overview
This document establishes standards for filtering logic across all analytics components to ensure consistency and prevent data display issues.

## Core Principle: Use Source Specialties for Filtering

### ✅ **CORRECT Approach (Use This)**
```typescript
// Always use source specialties from mapping for filtering raw data
const mappedSpecialtyNames = selectedMapping.sourceSpecialties.map((spec: any) => spec.specialty);
const specialtyMatch = mappedSpecialtyNames.some((mappedName: string) => 
  rowSpecialty.toLowerCase().includes(mappedName.toLowerCase()) ||
  mappedName.toLowerCase().includes(rowSpecialty.toLowerCase())
);
```

### ❌ **INCORRECT Approach (Never Use This)**
```typescript
// Never use only standardized name for filtering raw data
const selectedSpecialty = selectedMapping.standardizedName.trim();
const specialtyMatch = rowSpecialty.toLowerCase() === selectedSpecialty.toLowerCase();
```

## Data Structure Understanding

### Mapping Structure
```typescript
interface SpecialtyMapping {
  standardizedName: string;        // For display purposes (e.g., "Advanced Heart Failure Transplant Cardiology")
  sourceSpecialties: Array<{       // For filtering raw data
    specialty: string;             // Actual name in CSV files (e.g., "cardiology advanced heart failure")
    surveySource: string;
  }>;
}
```

### Raw Data Structure
```typescript
interface SurveyRow {
  specialty: string;               // Contains source specialty names from CSV
  surveySource: string;
  // ... other fields
}
```

## Filtering Standards

### 1. Specialty Filtering
```typescript
// ✅ Standard implementation for all analytics components
const filterBySpecialty = (rows: SurveyRow[], selectedMapping: SpecialtyMapping) => {
  const mappedSpecialtyNames = selectedMapping.sourceSpecialties.map(spec => spec.specialty);
  
  return rows.filter(row => {
    const rowSpecialty = String(row.specialty || '').toLowerCase();
    return mappedSpecialtyNames.some(mappedName => 
      rowSpecialty.includes(mappedName.toLowerCase()) ||
      mappedName.toLowerCase().includes(rowSpecialty)
    );
  });
};
```

### 2. Provider Type Filtering
```typescript
// ✅ Use flexible field name matching
const filterByProviderType = (rows: SurveyRow[], providerType: string) => {
  return rows.filter(row => {
    const rowProviderType = String(
      row.providerType || 
      row.provider_type || 
      (row as any)['Provider Type'] || 
      ''
    ).toLowerCase();
    return rowProviderType.includes(providerType.toLowerCase());
  });
};
```

### 3. Region Filtering
```typescript
// ✅ Use flexible field name matching
const filterByRegion = (rows: SurveyRow[], region: string) => {
  return rows.filter(row => {
    const rowRegion = String(
      row.geographicRegion || 
      row.region || 
      row.Region || 
      ''
    ).toLowerCase();
    return rowRegion.includes(region.toLowerCase());
  });
};
```

## Implementation Checklist

### Before Implementing Any Analytics Filtering:
- [ ] Use `mapping.sourceSpecialties` for specialty filtering
- [ ] Never use only `mapping.standardizedName` for filtering
- [ ] Implement flexible field name matching for provider type and region
- [ ] Use case-insensitive `includes()` matching
- [ ] Handle null/undefined values gracefully
- [ ] Add debug logging for troubleshooting

### Code Review Checklist:
- [ ] Filtering logic matches this standard
- [ ] No hardcoded field names
- [ ] Proper error handling for missing data
- [ ] Consistent with other analytics components
- [ ] Debug logging included for troubleshooting

## Testing Requirements

### Cross-Screen Validation:
- [ ] Same specialty shows data in SurveyAnalytics and RegionalAnalytics
- [ ] Filtering works consistently across all screens
- [ ] No "No data available" when data exists in other screens
- [ ] Source specialty names properly matched against raw data

### Data Validation:
- [ ] Test with various specialty name formats
- [ ] Test with different survey sources
- [ ] Test with missing or malformed data
- [ ] Verify filtering performance with large datasets

## Common Pitfalls to Avoid

1. **Using standardized names for filtering raw data**
2. **Hardcoding field names instead of using flexible matching**
3. **Case-sensitive comparisons**
4. **Not handling null/undefined values**
5. **Inconsistent filtering logic across components**

## Debugging Guidelines

### When Filtering Issues Occur:
1. Check console logs for "Available specialties in processed data"
2. Verify "Mapped source specialties" contains expected values
3. Compare filtering logic with RegionalAnalytics implementation
4. Ensure data transformation preserves original specialty names
5. Validate mapping structure contains both source and standardized names

### Debug Logging Template:
```typescript
console.log('Filtering debug:', {
  selectedSpecialty: selectedMapping.standardizedName,
  mappedSourceSpecialties: selectedMapping.sourceSpecialties.map(s => s.specialty),
  availableSpecialties: [...new Set(rows.map(r => r.specialty))].slice(0, 10),
  filteredCount: filteredRows.length
});
```

## References

- **Working Implementation**: `src/components/RegionalAnalytics.tsx`
- **Fixed Implementation**: `src/components/SurveyAnalytics.tsx`
- **Issue Documentation**: `ISSUE_HISTORY.md`

---

**Remember**: Always use source specialties for filtering raw data, never just standardized names!
