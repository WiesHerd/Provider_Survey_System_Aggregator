# Analytics Screen Fix - Step-by-Step Plan

## 🎯 **Objective**
Fix the analytics screen to properly display survey data by stacking normalized survey tables instead of incorrectly aggregating n_orgs and n_incumbents. Each section (TCC, wRVUs, CFs) should have its own n_orgs and n_incumbents values.

## 📊 **Current Problem Analysis**
1. **Incorrect Data Structure**: Analytics screen is aggregating n_orgs and n_incumbents across all metrics
2. **Wrong Data Source**: useSurveyData hook is loading from static CSV instead of IndexedDB
3. **Missing Normalization**: Not using the specialty/column mappings to normalize data
4. **Poor Data Flow**: Analytics not properly integrated with the mapping system

## 🔍 **Step 1: Analyze IndexedDB Data Structure** ✅ COMPLETED
- [x] Examine Sullivan Cotter survey data structure in IndexedDB
- [x] Examine Gallagher survey data structure in IndexedDB  
- [x] Document column names, data types, and sample values
- [x] Identify compensation metrics (TCC, wRVU, CF) columns
- [x] Identify organizational metrics (n_orgs, n_incumbents) columns
- [x] Document specialty, provider type, and region column variations

**Findings**: Data is stored in IndexedDB with proper structure, but analytics was using old CSV-based approach.

## 🗺️ **Step 2: Analyze Mapping System** ✅ COMPLETED
- [x] Review specialty mapping structure and relationships
- [x] Review column mapping structure for compensation metrics
- [x] Review provider type mapping structure
- [x] Review region mapping structure
- [x] Document how mappings normalize data across surveys

**Findings**: Mapping system exists but wasn't being used by analytics.

## 🏗️ **Step 3: Design Correct Data Structure** ✅ COMPLETED
- [x] Define proper analytics data interface
- [x] Design data stacking logic for multiple surveys
- [x] Ensure each metric section has its own n_orgs/n_incumbents
- [x] Plan data normalization pipeline using mappings

**Implementation**: Created `AnalyticsDataService` with proper data stacking logic.

## 🔧 **Step 4: Fix Data Retrieval** ✅ COMPLETED
- [x] Update useSurveyData hook to use IndexedDB instead of static CSV
- [x] Implement proper data filtering by specialty, survey, provider type, region
- [x] Use specialty mappings to normalize specialty names
- [x] Use column mappings to normalize compensation metric columns

**Implementation**: Created new `AnalyticsDataService` that properly retrieves and normalizes data from IndexedDB.

## 📈 **Step 5: Fix Analytics Processing** ✅ COMPLETED
- [x] Update useAnalyticsData hook to process normalized data correctly
- [x] Implement proper data stacking for multiple surveys
- [x] Ensure each metric section maintains separate n_orgs/n_incumbents
- [x] Fix percentile calculations to work with stacked data

**Implementation**: Updated `useAnalyticsData` hook to use the new service and properly handle data stacking.

## 🎨 **Step 6: Update Analytics UI** ✅ COMPLETED
- [x] Update Analytics component to use corrected data structure
- [x] Ensure proper display of n_orgs and n_incumbents per section
- [x] Add proper filtering controls for specialty, survey, provider type, region
- [x] Implement data stacking visualization

**Implementation**: Updated main Analytics component to use the new `SurveyAnalytics` component.

## 🧪 **Step 7: Testing & Validation** 🔄 IN PROGRESS
- [ ] Test with Sullivan Cotter data
- [ ] Test with Gallagher data
- [ ] Test with combined data from both surveys
- [ ] Validate that n_orgs and n_incumbents are correct per section
- [ ] Verify data normalization works correctly

## 📋 **Expected Data Structure After Fix** ✅ IMPLEMENTED
```typescript
interface AnalyticsData {
  specialty: string;
  surveySource: string;
  providerType: string;
  region: string;
  metrics: {
    tcc: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      n_orgs: number;
      n_incumbents: number;
    };
    wrvu: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      n_orgs: number;
      n_incumbents: number;
    };
    cf: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      n_orgs: number;
      n_incumbents: number;
    };
  };
}
```

## 🚀 **Implementation Priority**
1. **HIGH**: Fix data retrieval from IndexedDB ✅ COMPLETED
2. **HIGH**: Implement proper data normalization using mappings ✅ COMPLETED
3. **HIGH**: Fix analytics data processing logic ✅ COMPLETED
4. **MEDIUM**: Update UI components ✅ COMPLETED
5. **MEDIUM**: Add proper filtering controls ✅ COMPLETED
6. **LOW**: Polish and optimization 🔄 IN PROGRESS

## 📝 **Implementation Details**

### **New AnalyticsDataService**
- **Location**: `src/features/analytics/services/analyticsDataService.ts`
- **Purpose**: Handles data retrieval, normalization, and stacking
- **Key Features**:
  - Retrieves data from IndexedDB using DataService
  - Normalizes data using specialty, provider type, and region mappings
  - Stacks survey data properly without incorrect aggregation
  - Maintains separate n_orgs/n_incumbents for each metric section

### **Updated useAnalyticsData Hook**
- **Location**: `src/features/analytics/hooks/useAnalyticsData.ts`
- **Purpose**: Manages analytics data state and filtering
- **Key Changes**:
  - Uses new AnalyticsDataService instead of old logic
  - Properly handles filter changes
  - Applies client-side filtering for additional refinement

### **Updated Analytics Component**
- **Location**: `src/components/Analytics.tsx`
- **Purpose**: Main entry point for analytics
- **Key Changes**:
  - Now uses SurveyAnalytics component from analytics feature
  - Removed old hardcoded analytics logic
  - Clean, maintainable structure

## 🔧 **Next Steps for Testing**
1. **Start the development server** and navigate to analytics
2. **Check browser console** for debug logs from AnalyticsDataService
3. **Verify data loading** from IndexedDB instead of static CSV
4. **Test filtering** by specialty, survey source, provider type, region
5. **Validate data structure** - each metric section should have proper n_orgs/n_incumbents

## 📝 **Notes**
- Each compensation metric section (TCC, wRVU, CF) should have its own n_orgs and n_incumbents
- Data should be stacked from multiple surveys using normalized names
- Specialty mappings should be used to group similar specialties across surveys
- Column mappings should normalize compensation metric column names
- The system should handle multiple survey sources (Sullivan Cotter, Gallagher, etc.)

## 🎯 **Current Status**
**MAJOR MILESTONE ACHIEVED**: The analytics screen has been completely refactored to use proper data stacking and normalization. The core architecture is now correct and follows enterprise development standards.

**Next**: Testing and validation to ensure the implementation works correctly with real data.
