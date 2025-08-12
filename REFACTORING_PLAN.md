# Survey Aggregator - Codebase Refactoring Plan

## 🎯 Project Overview
This document outlines the comprehensive refactoring strategy to transform the Survey Aggregator codebase from a monolithic structure into a modular, enterprise-grade architecture following Silicon Valley best practices.

## 📊 Current State Analysis

### **Critical Issues Identified:**
- **Massive Components**: 5 files exceed 500 lines (SurveyAnalytics: 1,260 lines)
- **Monolithic Structure**: All components in single `/components` directory
- **Mixed Concerns**: Business logic, UI, and utilities scattered throughout
- **Poor Maintainability**: Difficult to locate and modify specific functionality
- **Performance Impact**: Large bundle sizes, slow development builds

### **Current File Sizes:**
```
SurveyAnalytics.tsx     - 1,260 lines  ❌ CRITICAL
FMVCalculator.tsx       - 832 lines    ❌ CRITICAL  
SurveyUpload.tsx        - 758 lines    ❌ CRITICAL
DataPreview.tsx         - 708 lines    ❌ CRITICAL
Charts.tsx              - 590 lines    ⚠️  HIGH
SpecialtyMapping.tsx    - 589 lines    ⚠️  HIGH
ColumnMapping.tsx       - 528 lines    ⚠️  HIGH
```

## 🏗️ Target Architecture

### **New Directory Structure:**
```
src/
├── app/                          # Application-level concerns
│   ├── App.tsx                   # Main app component
│   ├── Sidebar.tsx               # Navigation
│   ├── routing/                  # Route definitions
│   └── providers/                # Context providers
├── features/                     # Feature-based modules
│   ├── analytics/                # Survey Analytics feature
│   │   ├── components/           # Feature-specific components
│   │   ├── hooks/                # Custom hooks
│   │   ├── services/             # Feature services
│   │   ├── types/                # Feature types
│   │   ├── utils/                # Feature utilities
│   │   └── index.ts              # Public API
│   ├── upload/                   # Survey Upload feature
│   ├── regional/                 # Regional Analytics feature
│   ├── fmv/                      # Fair Market Value feature
│   ├── mapping/                  # Specialty/Column Mapping feature
│   └── dashboard/                # Dashboard feature
├── shared/                       # Shared resources
│   ├── components/               # Reusable UI components
│   ├── hooks/                    # Shared custom hooks
│   ├── utils/                    # Shared utilities
│   ├── types/                    # Shared type definitions
│   ├── constants/                # Application constants
│   └── services/                 # Shared services
└── styles/                       # Global styles
```

## 📋 Refactoring Phases

### **Phase 1: Foundation & Infrastructure** ⏳
**Duration**: 2-3 days
**Priority**: CRITICAL

#### **Tasks:**
- [ ] Create new directory structure
- [ ] Set up feature-based architecture
- [ ] Create shared utilities and types
- [ ] Establish import/export patterns
- [ ] Set up barrel exports (index.ts files)

#### **Deliverables:**
- [ ] New directory structure implemented
- [ ] Shared utilities extracted and organized
- [ ] Type definitions centralized
- [ ] Import/export patterns established

### **Phase 2: Analytics Feature Refactoring** ⏳
**Duration**: 3-4 days
**Priority**: CRITICAL

#### **Tasks:**
- [ ] Break down `SurveyAnalytics.tsx` (1,260 lines)
- [ ] Extract utility functions
- [ ] Create custom hooks
- [ ] Split into focused components
- [ ] Update imports and dependencies

#### **Components to Create:**
```
src/features/analytics/
├── components/
│   ├── SurveyAnalytics.tsx       # Main container (200 lines)
│   ├── AnalyticsTable.tsx        # Table component (300 lines)
│   ├── AnalyticsFilters.tsx      # Filter components (200 lines)
│   ├── AnalyticsCharts.tsx       # Chart components (200 lines)
│   └── AnalyticsSummary.tsx      # Summary components (150 lines)
├── hooks/
│   ├── useAnalyticsData.ts       # Data management
│   ├── useAnalyticsFilters.ts    # Filter logic
│   └── useAnalyticsCharts.ts     # Chart logic
├── utils/
│   ├── analyticsCalculations.ts  # Calculation utilities
│   ├── dataFormatters.ts         # Formatting utilities
│   └── specialtyMatching.ts      # Specialty matching logic
└── types/
    └── analytics.ts              # Analytics-specific types
```

#### **Deliverables:**
- [ ] SurveyAnalytics broken into 5 focused components
- [ ] Custom hooks for state management
- [ ] Utility functions extracted
- [ ] All imports updated

### **Phase 3: Upload Feature Refactoring** ⏳
**Duration**: 2-3 days
**Priority**: HIGH

#### **Tasks:**
- [ ] Break down `SurveyUpload.tsx` (758 lines)
- [ ] Extract file upload logic
- [ ] Create form components
- [ ] Separate year picker logic

#### **Components to Create:**
```
src/features/upload/
├── components/
│   ├── SurveyUpload.tsx          # Main container (150 lines)
│   ├── UploadForm.tsx            # Form logic (200 lines)
│   ├── FileUpload.tsx            # Dropzone logic (150 lines)
│   ├── YearPicker.tsx            # Year picker (100 lines)
│   └── UploadedSurveys.tsx       # Survey list (150 lines)
├── hooks/
│   ├── useFileUpload.ts          # File upload logic
│   └── useSurveyMetadata.ts      # Metadata management
└── types/
    └── upload.ts                 # Upload-specific types
```

### **Phase 4: FMV Calculator Refactoring** ⏳
**Duration**: 2-3 days
**Priority**: HIGH

#### **Tasks:**
- [ ] Break down `FMVCalculator.tsx` (832 lines)
- [ ] Extract calculation logic
- [ ] Create form components
- [ ] Separate chart components

### **Phase 5: Data Preview Refactoring** ⏳
**Duration**: 2 days
**Priority**: MEDIUM

#### **Tasks:**
- [ ] Break down `DataPreview.tsx` (708 lines)
- [ ] Extract AG Grid logic
- [ ] Create filter components
- [ ] Separate pagination logic

### **Phase 6: Charts & Visualization Refactoring** ⏳
**Duration**: 2 days
**Priority**: MEDIUM

#### **Tasks:**
- [ ] Break down `Charts.tsx` (590 lines)
- [ ] Extract chart components
- [ ] Create chart utilities
- [ ] Separate data processing

### **Phase 7: Mapping Features Refactoring** ⏳
**Duration**: 2 days
**Priority**: MEDIUM

#### **Tasks:**
- [ ] Break down `SpecialtyMapping.tsx` (589 lines)
- [ ] Break down `ColumnMapping.tsx` (528 lines)
- [ ] Extract mapping logic
- [ ] Create reusable mapping components

### **Phase 8: Testing & Documentation** ⏳
**Duration**: 2-3 days
**Priority**: HIGH

#### **Tasks:**
- [ ] Update all imports throughout application
- [ ] Write unit tests for new components
- [ ] Update documentation
- [ ] Performance testing
- [ ] Code review and cleanup

## 🎯 Success Metrics

### **Code Quality Metrics:**
- [ ] **Component Size**: No component > 300 lines
- [ ] **File Organization**: Feature-based structure implemented
- [ ] **Code Reusability**: 80%+ shared components
- [ ] **Import Clarity**: Clear dependency chains

### **Performance Metrics:**
- [ ] **Bundle Size**: < 500KB initial load
- [ ] **Build Time**: < 30 seconds
- [ ] **Development Build**: < 10 seconds
- [ ] **Lighthouse Score**: > 90

### **Maintainability Metrics:**
- [ ] **Cyclomatic Complexity**: < 10 per function
- [ ] **Code Coverage**: > 80%
- [ ] **Documentation**: 100% of public APIs documented

## 📝 Implementation Guidelines

### **Component Structure:**
```typescript
// src/features/analytics/components/AnalyticsTable.tsx
import React from 'react';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { AnalyticsTableProps } from '../types/analytics';

export const AnalyticsTable: React.FC<AnalyticsTableProps> = ({ 
  data, 
  filters 
}) => {
  // Component logic here
  return (
    // JSX here
  );
};
```

### **Custom Hook Structure:**
```typescript
// src/features/analytics/hooks/useAnalyticsData.ts
import { useState, useEffect } from 'react';
import { AnalyticsData } from '../types/analytics';

export const useAnalyticsData = () => {
  // Hook logic here
  return {
    data,
    loading,
    error,
    refetch
  };
};
```

### **Utility Function Structure:**
```typescript
// src/features/analytics/utils/analyticsCalculations.ts
import { AnalyticsData } from '../types/analytics';

export const calculatePercentile = (
  numbers: number[], 
  percentile: number
): number => {
  // Implementation here
};
```

## 🔄 Git Workflow

### **Branch Strategy:**
- **Main Branch**: `main` (production-ready code)
- **Development Branch**: `develop` (integration branch)
- **Feature Branches**: `refactor/phase-1-foundation`, `refactor/phase-2-analytics`, etc.

### **Commit Convention:**
```
refactor: break down SurveyAnalytics into modular components

- Extract AnalyticsTable component (300 lines)
- Create useAnalyticsData custom hook
- Move utility functions to shared/utils
- Update all imports and dependencies

Closes #123
```

### **Pull Request Template:**
- **Description**: What was changed and why
- **Testing**: How to test the changes
- **Breaking Changes**: Any API changes
- **Performance Impact**: Bundle size and build time changes

## 🚨 Risk Mitigation

### **High-Risk Areas:**
1. **Import Dependencies**: Complex import chains
2. **State Management**: Shared state between components
3. **Type Definitions**: Breaking type changes
4. **Performance**: Bundle size increases

### **Mitigation Strategies:**
1. **Incremental Refactoring**: One component at a time
2. **Comprehensive Testing**: Unit tests for each component
3. **Backward Compatibility**: Maintain existing APIs during transition
4. **Performance Monitoring**: Regular bundle analysis

## 📅 Timeline

### **Week 1:**
- Phase 1: Foundation & Infrastructure
- Phase 2: Analytics Feature (start)

### **Week 2:**
- Phase 2: Analytics Feature (complete)
- Phase 3: Upload Feature

### **Week 3:**
- Phase 4: FMV Calculator
- Phase 5: Data Preview

### **Week 4:**
- Phase 6: Charts & Visualization
- Phase 7: Mapping Features

### **Week 5:**
- Phase 8: Testing & Documentation
- Final cleanup and optimization

## ✅ Definition of Done

### **For Each Phase:**
- [ ] All components broken down to < 300 lines
- [ ] Custom hooks created for complex state
- [ ] Utility functions extracted to appropriate locations
- [ ] All imports updated and working
- [ ] Unit tests written and passing
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Performance metrics met
- [ ] Code review completed
- [ ] Documentation updated

### **For Overall Project:**
- [ ] All phases completed
- [ ] Feature-based architecture implemented
- [ ] Performance benchmarks met
- [ ] Code coverage > 80%
- [ ] Bundle size < 500KB
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Production deployment successful

---

**Last Updated**: [Current Date]
**Status**: Planning Phase
**Next Review**: [Date]
