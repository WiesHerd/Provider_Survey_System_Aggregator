- ❌ **Data Consistency**: Mappings not applied during upload display
- ❌ **Unified Normalization**: Different normalization logic in different screens

## 6. Required Changes for Data Consistency

### Option 1: Normalize Data During Upload Display (RECOMMENDED)
- Apply mappings when displaying data in upload screen
- Use the same normalization logic as analytics
- Ensure both screens show the same normalized data
- **Pros**: Minimal changes, maintains raw data storage, immediate consistency
- **Cons**: Requires normalization on every data retrieval

### Option 2: Store Normalized Data
- Normalize data during upload and store both raw and normalized versions
- Use normalized data for all displays
- Maintain raw data for audit purposes
- **Pros**: Fast display, consistent data, single source of truth
- **Cons**: Duplicate storage, complex data management

### Option 3: Consistent Normalization Layer
- Create a shared normalization service
- Apply normalization during data retrieval for all screens
- Ensure consistent data display across the application
- **Pros**: Most maintainable, single normalization logic, consistent behavior
- **Cons**: Requires refactoring existing code

## 7. Immediate Action Plan

### Phase 1: Fix Upload Screen Data Display (Week 1)
1. **Create Shared Normalization Service**
   - Extract normalization logic from `AnalyticsDataService`
   - Create `DataNormalizationService` that can be used by both upload and analytics
   - Ensure consistent field mapping across all screens

2. **Update Upload Screen Data Retrieval**
   - Modify `DataPreview.tsx` to use normalized data
   - Apply specialty, provider type, region, and variable mappings
   - Ensure filters work on normalized values

3. **Test Data Consistency**
   - Verify upload and analytics screens show the same data
   - Confirm filtering works consistently across both screens

### Phase 2: Enhance Mapping System (Week 2)
1. **Implement Provider Type and Region Mappings**
   - Replace hardcoded normalization in analytics with actual mappings
   - Ensure all mapping types are fully functional
   - Test mapping creation and application

2. **Add Auto-Mapping Features**
   - Implement intelligent auto-mapping for new surveys
   - Suggest mappings based on existing data
   - Reduce manual mapping effort

### Phase 3: Performance Optimization (Week 3)
1. **Optimize Data Retrieval**
   - Implement caching for normalized data
   - Reduce redundant normalization calls
   - Optimize IndexedDB queries

2. **Add Data Validation**
   - Validate mapping consistency across surveys
   - Detect and flag unmapped data
   - Provide mapping completion metrics

## 8. Technical Implementation Details

### Shared Normalization Service Structure
```typescript
// src/services/DataNormalizationService.ts
export class DataNormalizationService {
  async normalizeSurveyData(
    rawData: any[], 
    surveyType: string,
    options: {
      applySpecialtyMappings: boolean;
      applyProviderTypeMappings: boolean;
      applyRegionMappings: boolean;
      applyVariableMappings: boolean;
    }
  ): Promise<NormalizedSurveyData[]> {
    // Implementation here
  }
  
  private normalizeSpecialty(value: string, mappings: ISpecialtyMapping[], surveySource: string): string
  private normalizeProviderType(value: string, mappings: IProviderTypeMapping[], surveySource: string): string
  private normalizeRegion(value: string, mappings: IRegionMapping[], surveySource: string): string
  private normalizeVariable(value: string, mappings: IVariableMapping[], surveySource: string): string
}
```

### Integration Points
1. **DataPreview Component**: Use `DataNormalizationService` for display data
2. **AnalyticsDataService**: Use `DataNormalizationService` for analytics data
3. **Upload Screen**: Apply normalization before filtering and display
4. **All Mapping Screens**: Use consistent data structure

## Next Steps
1. ✅ **COMPLETED**: Analyzed mapping system architecture and data flow
2. ✅ **COMPLETED**: Identified root cause of data inconsistency
3. 🔄 **IN PROGRESS**: Documenting solution recommendations
4. ⏳ **NEXT**: Implement Phase 1 fixes for immediate data consistency
5. ⏳ **FUTURE**: Complete mapping system enhancement and optimization

---

**Status**: Analysis complete - Root cause identified and solution plan documented
**Last Updated**: [Current Date]
**Next Action**: Implement Phase 1 fixes for data consistency
**Priority**: HIGH - Data inconsistency affects user experience and data reliability
