# New Enterprise Report Builder

## Overview

This is a **completely separate, parallel implementation** of the report builder. It does NOT modify or replace any existing report screens.

## Separation

### Existing Report Screens (Untouched)
- `/custom-reports` - Uses `CustomReports` component
- `/custom-reports-v2` - Uses `QuickReportBuilder` component (if exists)
- All existing components remain unchanged:
  - `EnhancedCustomReports.tsx`
  - `QuickReportBuilder.tsx` (if exists)
  - `ReportWizard.tsx` (if exists)
  - `ReportTemplates.tsx`
  - `VisualFilterBuilder.tsx`

### New Report Builder (Separate)
- **Route**: `/report-builder-new`
- **Component**: `ReportBuilder` from `components/builder/ReportBuilder.tsx`
- **Location**: All files in `src/features/reports/components/builder/` and `src/features/reports/components/components/`

## File Structure

```
src/features/reports/
├── components/
│   ├── builder/              ← NEW: All new builder components
│   │   ├── ReportBuilder.tsx
│   │   ├── ReportCanvas.tsx
│   │   ├── ComponentPalette.tsx
│   │   ├── PropertiesPanel.tsx
│   │   ├── ReportToolbar.tsx
│   │   └── ComponentWrapper.tsx
│   ├── components/           ← NEW: Component renderers
│   │   ├── ChartComponent.tsx
│   │   ├── TableComponent.tsx
│   │   ├── KPICardComponent.tsx
│   │   ├── FilterComponent.tsx
│   │   └── TextComponent.tsx
│   ├── EnhancedCustomReports.tsx  ← EXISTING: Untouched
│   ├── ReportBuilder.tsx          ← EXISTING: Untouched (different file)
│   ├── ReportTemplates.tsx        ← EXISTING: Untouched
│   ├── VisualFilterBuilder.tsx    ← EXISTING: Untouched
│   ├── ReportChart.tsx            ← NEW: Shared chart component
│   └── ReportTable.tsx            ← NEW: Shared table component
├── hooks/
│   ├── useReportBuilder.ts        ← NEW
│   └── useReportData.ts           ← NEW
├── services/
│   ├── reportBuilderService.ts    ← NEW
│   ├── reportDataService.ts       ← NEW
│   ├── reportStorageService.ts    ← NEW
│   ├── componentRegistry.ts       ← NEW
│   └── layoutService.ts           ← NEW
└── types/
    ├── reportBuilder.ts           ← NEW
    └── components.ts              ← NEW
```

## Access

To access the new report builder:
1. Navigate to `/report-builder-new` in the browser
2. Or add a menu item in the sidebar pointing to this route

## Features

The new builder includes:
- Drag-and-drop component placement
- Real-time preview
- Component palette with charts, tables, KPIs, filters, and text
- Properties panel for component configuration
- Save/load reports
- Export functionality (PDF, Excel, PNG)
- Undo/redo support
- Grid-based layout system

## Testing

The new builder is completely isolated and can be tested independently without affecting existing report functionality.

