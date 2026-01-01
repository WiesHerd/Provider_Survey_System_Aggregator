# Custom Reports Component - Code Analysis & Improvements

## 🔍 Executive Summary

The refactored CustomReports component is well-structured but has several opportunities for improvement in type safety, performance, error handling, and code organization.

---

## 🚨 Critical Issues

### 1. **Memory Leak: URL.createObjectURL Not Cleaned Up**
**Location:** `CustomReports.tsx:205-209`
**Issue:** `window.URL.createObjectURL()` creates a blob URL that must be revoked to prevent memory leaks.
**Impact:** Memory leaks on repeated exports
**Fix:**
```typescript
const handleExport = () => {
  // ... existing code ...
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `custom-report-${config.dimension}-${config.metric}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  // Add cleanup
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
};
```

### 2. **Type Safety: `any` Type for Error State**
**Location:** `CustomReports.tsx:88`
**Issue:** `const [error, setError] = useState<any>(null);`
**Impact:** Loss of type safety, potential runtime errors
**Fix:**
```typescript
const [error, setError] = useState<ErrorContext | null>(null);
```

### 3. **Unused Props**
**Location:** `CustomReports.tsx:31-34`
**Issue:** `propData` and `title` props are defined but never used
**Impact:** Confusing API, potential future bugs
**Fix:** Remove unused props or document their purpose

---

## ⚡ Performance Optimizations

### 4. **Missing useCallback for Event Handlers**
**Location:** `CustomReports.tsx:163-226`
**Issue:** Handlers recreated on every render, causing unnecessary re-renders of child components
**Impact:** Performance degradation with complex child components
**Fix:**
```typescript
import { useCallback } from 'react';

const handleClearAllFilters = useCallback(() => {
  updateFilter('specialties', []);
  updateFilter('regions', []);
  updateFilter('surveySources', []);
  updateFilter('providerTypes', []);
  updateFilter('years', []);
  setError(null);
}, [updateFilter]);

const handleSave = useCallback(() => {
  const newReport: ReportConfig = {
    ...config,
    id: Date.now().toString(),
    created: new Date()
  };
  saveReport(newReport);
  updateConfig('name', '');
}, [config, saveReport, updateConfig]);

const handleExport = useCallback(() => {
  // ... existing code ...
}, [config, chartData]);

const handleLoadReport = useCallback((report: ReportConfig) => {
  loadConfig({
    name: '',
    dimension: report.dimension,
    metric: report.metric,
    metrics: report.metrics || [report.metric],
    chartType: report.chartType,
    secondaryDimension: report.secondaryDimension || null,
    filters: {
      ...report.filters,
      years: report.filters.years || [currentYear]
    }
  });
}, [loadConfig, currentYear]);
```

### 5. **Specialty Mappings Loading Should Be Extracted to Hook**
**Location:** `CustomReports.tsx:44-71`
**Issue:** Specialty mappings loading logic duplicated across components
**Impact:** Code duplication, harder to maintain
**Fix:** Create `useSpecialtyMappings` hook:
```typescript
// src/features/reports/chart-builder/hooks/useSpecialtyMappings.ts
export const useSpecialtyMappings = () => {
  const [specialtyMappings, setSpecialtyMappings] = useState<Map<string, Set<string>>>(new Map());
  const dataService = useMemo(() => getDataService(), []);

  useEffect(() => {
    const loadMappings = async () => {
      try {
        const mappings = await dataService.getAllSpecialtyMappings();
        const mappingMap = new Map<string, Set<string>>();
        
        mappings.forEach(mapping => {
          const standardizedName = mapping.standardizedName.toLowerCase();
          if (!mappingMap.has(standardizedName)) {
            mappingMap.set(standardizedName, new Set());
          }
          mappingMap.get(standardizedName)!.add(standardizedName);
          mapping.sourceSpecialties?.forEach(source => {
            mappingMap.get(standardizedName)!.add(source.specialty.toLowerCase());
          });
        });
        
        setSpecialtyMappings(mappingMap);
      } catch (error) {
        console.error('Error loading specialty mappings:', error);
      }
    };
    
    loadMappings();
  }, [dataService]);

  return specialtyMappings;
};
```

### 6. **Error Detection Logic Should Be Extracted to Hook**
**Location:** `CustomReports.tsx:108-160`
**Issue:** Complex error detection logic in useEffect makes component harder to test and maintain
**Impact:** Reduced testability, harder to debug
**Fix:** Create `useReportErrorDetection` hook:
```typescript
// src/features/reports/chart-builder/hooks/useReportErrorDetection.ts
export const useReportErrorDetection = (
  loading: boolean,
  totalRecords: number,
  chartData: ChartDataItem[],
  config: ReportConfigInput,
  updateFilter: (filterType: keyof ReportFilters, value: string[]) => void
) => {
  const [error, setError] = useState<ErrorContext | null>(null);

  useEffect(() => {
    if (!loading && totalRecords === 0) {
      setError({
        type: 'no_data',
        message: 'No survey data available',
        suggestions: [
          'Upload survey data from the Upload screen',
          'Check that surveys contain data for the selected year',
          'Verify that data has been properly processed'
        ]
      });
      return;
    }

    if (!loading && chartData.length === 0 && totalRecords > 0) {
      const hasFilters = 
        config.filters.specialties.length > 0 ||
        config.filters.regions.length > 0 ||
        config.filters.surveySources.length > 0 ||
        config.filters.providerTypes.length > 0 ||
        config.filters.years.length > 0;
      
      if (hasFilters) {
        setError({
          type: 'filter_too_restrictive',
          message: 'No data matches your current filter selection',
          suggestions: [
            'Try removing some filters to expand your selection',
            'Select more specialties or regions',
            'Check if data exists for the selected survey sources'
          ],
          onAction: () => {
            updateFilter('specialties', []);
            updateFilter('regions', []);
            updateFilter('surveySources', []);
            updateFilter('providerTypes', []);
            updateFilter('years', []);
          },
          actionLabel: 'Clear All Filters'
        });
        return;
      }

      if (config.dimension === 'specialty' && config.filters.specialties.length === 0) {
        setError({
          type: 'no_specialties',
          message: 'Please select at least one specialty to view data',
          suggestions: [
            'Select specialties from the filter dropdown',
            'Try selecting multiple specialties for comparison'
          ]
        });
        return;
      }
    }

    setError(null);
  }, [loading, totalRecords, chartData.length, config, updateFilter]);

  return { error, setError };
};
```

### 7. **Multiple ErrorBoundary Wrappers - Optimize**
**Location:** `CustomReports.tsx:242-293`
**Issue:** Each child component wrapped in separate ErrorBoundary
**Impact:** Unnecessary overhead, harder to debug
**Fix:** Single ErrorBoundary at top level (already exists), remove redundant ones:
```typescript
return (
  <ErrorBoundary>
    <div className="bg-gray-50 min-h-full">
      <div className="w-full px-2 py-2">
        <ReportActions {...props} />
        <ReportConfigPanel {...props} />
        <ReportFilters {...props} />
        {processingProgress > 0 && processingProgress < 100 && (
          <ProcessingProgress progress={processingProgress} />
        )}
        <ReportPreview {...props} />
      </div>
    </div>
  </ErrorBoundary>
);
```

---

## 🏗️ Architecture Improvements

### 8. **Export Logic Should Be Extracted to Utility**
**Location:** `CustomReports.tsx:184-210`
**Issue:** Export logic mixed with component logic
**Impact:** Harder to test, reuse, and maintain
**Fix:** Create `exportReportToCSV` utility:
```typescript
// src/features/reports/chart-builder/utils/reportExport.ts
export const exportReportToCSV = (
  config: ReportConfigInput,
  chartData: ChartDataItem[]
): void => {
  const metricLabel = getMetricDisplayLabel(config.metric);
  const yearsText = config.filters.years.length > 0 ? config.filters.years.join(', ') : 'All';
  const regionsText = config.filters.regions.length > 0 ? `${config.filters.regions.length} selected` : 'All';
  const sourcesText = config.filters.surveySources.length > 0 ? `${config.filters.surveySources.length} selected` : 'All';
  const specialtiesText = config.filters.specialties.length > 0 ? `${config.filters.specialties.length} selected` : 'All';

  const metaLines = [
    `Report: ${config.dimension} × ${metricLabel}`,
    `Years: ${yearsText}`,
    `Regions: ${regionsText}`,
    `Survey Sources: ${sourcesText}`,
    `Specialties: ${specialtiesText}`,
    `Items: ${chartData.length}`,
    `Generated: ${new Date().toISOString()}`
  ].join('\n');

  const tableHeaders = `${config.dimension},${config.metric},Count\n`;
  const tableRows = chartData.map(row => `${row.name},${row.value},${row.count}`).join('\n');

  const blob = new Blob([metaLines + '\n\n' + tableHeaders + tableRows], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `custom-report-${config.dimension}-${config.metric}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
};
```

### 9. **Processing Progress Logic is Complex**
**Location:** `useReportData.ts:330-344`
**Issue:** Complex setTimeout chain for progress simulation
**Impact:** Hard to understand, potential race conditions
**Fix:** Use a proper progress state machine or simplify:
```typescript
useEffect(() => {
  if (loading) {
    setProcessingProgress(0);
  } else if (surveyData.length > 0 && chartData.length > 0) {
    // Simple progress: 0 -> 50 -> 100 -> 0
    const progressSteps = [50, 100, 0];
    let stepIndex = 0;
    
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setProcessingProgress(progressSteps[stepIndex]);
        stepIndex++;
      } else {
        clearInterval(progressInterval);
      }
    }, 200);

    return () => clearInterval(progressInterval);
  }
}, [loading, surveyData.length, chartData.length]);
```

---

## 🐛 Code Quality Issues

### 10. **Missing Error Handling for Async Operations**
**Location:** `CustomReports.tsx:47-71`
**Issue:** Error in specialty mappings loading only logged, not surfaced to user
**Impact:** Silent failures, poor UX
**Fix:** Add error state and display:
```typescript
const [mappingError, setMappingError] = useState<string | null>(null);

useEffect(() => {
  const loadMappings = async () => {
    try {
      setMappingError(null);
      // ... existing code ...
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load specialty mappings';
      console.error('Error loading specialty mappings:', error);
      setMappingError(errorMessage);
      // Optionally show toast notification
    }
  };
  loadMappings();
}, [dataService]);
```

### 11. **Inconsistent Error Handling Pattern**
**Location:** Multiple locations
**Issue:** Some errors logged, some ignored, some shown to user
**Impact:** Inconsistent UX, harder to debug
**Fix:** Establish consistent error handling pattern:
- Critical errors: Show to user + log
- Non-critical errors: Log only
- User actions: Show toast notifications

### 12. **Missing Input Validation**
**Location:** `handleSave`, `handleExport`
**Issue:** No validation before operations
**Impact:** Potential runtime errors
**Fix:** Add validation:
```typescript
const handleSave = useCallback(() => {
  if (!config.name.trim()) {
    // Show error toast
    return;
  }
  if (chartData.length === 0) {
    // Show warning toast
    return;
  }
  // ... existing code ...
}, [config, chartData, saveReport, updateConfig]);
```

---

## 📊 Performance Metrics

### Current State:
- **Component Size:** ~300 lines ✅ (Good)
- **Re-renders:** Potentially excessive due to missing useCallback
- **Memory Leaks:** 1 identified (URL cleanup)
- **Type Safety:** 1 `any` type found

### Recommended Improvements Priority:
1. **High Priority:** Memory leak fix, type safety, useCallback for handlers
2. **Medium Priority:** Extract hooks, extract utilities, optimize ErrorBoundary
3. **Low Priority:** Error handling improvements, validation

---

## ✅ What's Working Well

1. **Good Separation of Concerns:** Components properly extracted
2. **Custom Hooks:** Good use of `useReportConfig`, `useReportData`, `useSavedReports`
3. **Type Definitions:** Well-structured types in `reportBuilder.ts`
4. **Component Size:** Maintainable ~300 lines
5. **Error Boundaries:** Proper error boundary usage (though could be optimized)

---

## 🎯 Recommended Action Plan

1. **Immediate (Critical):**
   - Fix memory leak in `handleExport`
   - Replace `any` type with proper `ErrorContext | null`
   - Add `useCallback` to all event handlers

2. **Short-term (High Priority):**
   - Extract `useSpecialtyMappings` hook
   - Extract `useReportErrorDetection` hook
   - Extract `exportReportToCSV` utility
   - Optimize ErrorBoundary usage

3. **Medium-term (Nice to Have):**
   - Improve error handling consistency
   - Add input validation
   - Simplify processing progress logic
   - Add unit tests for extracted hooks/utilities

---

## 📝 Summary

The refactored CustomReports component is well-architected but needs optimization for production readiness. The main issues are:
- **1 critical memory leak**
- **1 type safety issue**
- **4 performance optimizations needed**
- **3 architecture improvements**

All issues are fixable without breaking changes, and the improvements will significantly enhance maintainability, performance, and user experience.







