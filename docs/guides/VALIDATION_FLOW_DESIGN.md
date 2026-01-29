# Validation Flow Design
## Apple-Inspired Enterprise Validation UX

**Reference**: Apple, Stripe, Shopify, Notion validation patterns  
**Goal**: Make validation easy, helpful, and confidence-building

---

## Design Principles

### 1. Progressive Disclosure
Show only what's needed at each step. Don't overwhelm.

### 2. Visual Hierarchy
Guide the eye with size, weight, color, spacing.

### 3. Clear Feedback
Every action gets immediate, understandable feedback.

### 4. Actionable Guidance
Never show an error without showing how to fix it.

### 5. Confidence Building
Show progress and success, not just failures.

---

## Validation Stages (Step by Step)

### Stage 1: File Selection
**Trigger**: User selects/drops file  
**Speed**: Instant (< 100ms)

#### Visual State
```
┌─────────────────────────────────────────┐
│  📄  survey-data.csv                     │
│      127 KB · Selected just now         │
│                                          │
│  ✓ Validating file...                   │
└─────────────────────────────────────────┘
```

#### Checks
- File type (.csv, .xlsx, .xls)
- File size (< 50MB)
- File not empty

#### Outcomes

**✅ Success:**
```
┌─────────────────────────────────────────┐
│  📄  survey-data.csv                     │
│      127 KB · Checking format...         │
│                                          │
│  ✓ File validated                       │
└─────────────────────────────────────────┘
```

**❌ Failure (File Type):**
```
┌─────────────────────────────────────────┐
│  📄  survey-data.txt                     │
│      127 KB                              │
│                                          │
│  ❌ Wrong file type                      │
│  Only CSV and Excel files are accepted  │
│                                          │
│  [ Download Template ]                   │
└─────────────────────────────────────────┘
```

---

### Stage 2: Header Validation
**Trigger**: File parsed successfully  
**Speed**: Fast (< 500ms)

#### Visual State (Checking)
```
┌─────────────────────────────────────────┐
│  📄  survey-data.csv                     │
│      127 rows × 4 columns                │
│                                          │
│  ⏳ Checking headers...                  │
└─────────────────────────────────────────┘
```

#### Checks
- All required columns present
- Column names match standard or aliases

#### Outcomes

**✅ Success (All Columns):**
```
┌─────────────────────────────────────────┐
│  📄  survey-data.csv                     │
│      127 rows × 10 columns               │
│                                          │
│  ✅ Format validated                     │
│  All required columns found              │
│                                          │
│  [ Preview Data ]                        │
└─────────────────────────────────────────┘
```

**⚠️ Partial Success (Missing Optional):**
```
┌─────────────────────────────────────────────────────┐
│  📄  survey-data.csv                                 │
│      127 rows × 6 columns                            │
│                                                      │
│  ⚠️  Missing optional columns                       │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ Missing 2 optional columns                    │  │
│  │ Consider adding for better data quality       │  │
│  │                                                │  │
│  │ Missing: provider_type, geographic_region     │  │
│  │                                                │  │
│  │ [ Show What These Do ▼ ]                      │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  [ Upload Anyway ]              [ Download Template ]│
└─────────────────────────────────────────────────────┘
```

**❌ Failure (Missing Required):**
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│  🔴  Cannot upload file                             │
│      Fix the issues below before uploading          │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ ❌ Missing required columns           [Get   │  │
│  │                                      Template]│  │
│  │ 3 columns missing                             │  │
│  │ Add these columns to match the template      │  │
│  │                                                │  │
│  │ [ Show Details ▼ ]                            │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [ ↓ Download Template ]    Other: [Norm] [Wide]   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Expanded Details:**
```
┌──────────────────────────────────────────────┐
│ ❌ Missing required columns           [Get   │
│                                      Template]│
│ 3 columns missing                             │
│ Add these columns to match the template      │
│                                                │
│ [ Hide Details ▲ ]                            │
│                                                │
│ ──────────────────────────────────────────── │
│                                                │
│ Missing:  [specialty]  [variable]  [p25]     │
│                                                │
│ Required: specialty · variable · p25 · p50 ·  │
│           p75 · p90                            │
└──────────────────────────────────────────────┘
```

---

### Stage 3: Data Preview
**Trigger**: Headers validated successfully  
**Speed**: Instant

#### Visual State
```
┌──────────────────────────────────────────────────────────┐
│  Data Preview                                            │
│  127 rows × 10 columns                                   │
│                                                          │
│  specialty          | variable | p25    | p50    | p75  │
│  ──────────────────────────────────────────────────────│
│  Family Medicine    | TCC      | 120000 | 135000 | 150…│
│  Family Medicine    | Work RVU | 3500   | 4000   | 4500│
│  Internal Medicine  | TCC      | 125000 | 140000 | 155…│
│                                                          │
│  [ Upload ]                                              │
└──────────────────────────────────────────────────────────┘
```

**Purpose**: Build confidence - user sees their data

---

### Stage 4: Data Validation
**Trigger**: User clicks Upload  
**Speed**: Fast (< 2s)

#### Visual State (Validating)
```
┌─────────────────────────────────────────┐
│  📄  survey-data.csv                     │
│      127 rows × 10 columns               │
│                                          │
│  ⏳ Validating data...                   │
│  [████████░░░░░░░░░░] 42%               │
└─────────────────────────────────────────┘
```

#### Checks
- Specialty column has values
- Variable column has values
- At least one percentile has values
- Data types correct
- Business rules (percentiles in order, etc.)

#### Outcomes

**✅ No Issues:**
```
┌─────────────────────────────────────────┐
│  📄  survey-data.csv                     │
│                                          │
│  ⏳ Uploading...                         │
│  [████████████████░░] 84%               │
└─────────────────────────────────────────┘
```

**⚠️ Warnings (Non-Blocking):**
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│  ⚠️   File needs attention                          │
│       Review these recommendations for best results  │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ ⚠️  Data validation                          │  │
│  │                                                │  │
│  │ 5 warnings found                              │  │
│  │ You can upload, but review these issues       │  │
│  │                                                │  │
│  │ [ Show Details ▼ ]                            │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [ Cancel ]                         [ Upload Anyway ]│
│                                                      │
└─────────────────────────────────────────────────────┘
```

**❌ Errors (Blocking):**
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│  🔴  Cannot upload file                             │
│      Fix the issues below before uploading          │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ ❌ Data validation                    │  │
│  │                                                │  │
│  │ 12 errors found                               │  │
│  │ Fix these errors before uploading             │  │
│  │                                                │  │
│  │ [ Show Details ▼ ]                            │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [ Close ]                         [ Download Template]│
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Color Usage

### Status Colors (Used Sparingly)

**Red** (Blocking Errors):
- Background: `bg-red-50` (very light)
- Border: `border-red-200` (light)
- Icon: `text-red-600` (medium)
- Text: `text-red-900` (dark)
- Use: Only for critical, blocking issues

**Amber** (Warnings):
- Background: `bg-amber-50`
- Border: `border-amber-200`
- Icon: `text-amber-600`
- Text: `text-amber-900`
- Use: Non-blocking issues, recommendations

**Green** (Success):
- Background: `bg-green-50`
- Border: `border-green-200`
- Icon: `text-green-600`
- Text: `text-green-900`
- Use: Success states, confirmation

**Blue** (Info):
- Background: `bg-blue-50`
- Border: `border-blue-200`
- Icon: `text-blue-600`
- Text: `text-blue-900`
- Use: Informational messages, tips

**Indigo** (Primary Actions):
- Button: `bg-indigo-600`
- Hover: `bg-indigo-700`
- Ring: `ring-indigo-500`
- Use: Primary action buttons only

**Gray** (Neutral):
- Background: `bg-gray-50`
- Border: `border-gray-200`
- Text: `text-gray-500/600/700/900`
- Use: Everything else (most of the UI)

---

## Spacing System

### Container Padding
```
Large cards:    p-6  (24px)
Medium cards:   p-4  (16px)
Small cards:    p-3  (12px)
```

### Element Gaps
```
Section spacing:  space-y-5  (20px between sections)
Card spacing:     space-y-3  (12px between cards)
Item spacing:     gap-3      (12px between items)
Small spacing:    gap-2      (8px tight spacing)
```

### Borders
```
Container:  border border-gray-200
Divider:    border-t border-gray-200
Selected:   ring-1 ring-indigo-600
```

---

## Typography Hierarchy

### Headings
```
H1 (Dialog Title):    text-lg font-semibold text-gray-900
H2 (Section):         text-base font-semibold text-gray-900
H3 (Card Title):      text-sm font-semibold text-gray-900
H4 (Subsection):      text-sm font-medium text-gray-900
```

### Body Text
```
Primary:    text-sm text-gray-900
Secondary:  text-sm text-gray-600
Tertiary:   text-xs text-gray-500
```

### Labels
```
Form labels:   text-sm font-medium text-gray-900
Help text:     text-xs text-gray-500
Error text:    text-xs text-red-700
```

---

## Component Patterns

### Status Bar
```tsx
<div className="px-6 py-4 border-b bg-red-50 border-red-100">
  <div className="flex items-center gap-3">
    <XCircleIcon className="h-6 w-6 text-red-600" />
    <div>
      <h3 className="text-base font-semibold text-gray-900">
        Cannot upload file
      </h3>
      <p className="text-sm text-gray-600 mt-0.5">
        Fix the issues below before uploading
      </p>
    </div>
  </div>
</div>
```

### Issue Card
```tsx
<div className="rounded-xl border border-red-200 bg-red-50 p-4">
  <div className="flex items-start gap-3">
    <XCircleIcon className="h-5 w-5 text-red-600 mt-0.5" />
    <div className="flex-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            Missing required columns
          </h4>
          <p className="text-sm text-gray-600 mt-0.5">
            3 columns missing
          </p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-indigo-700 bg-white border border-indigo-300 rounded-lg">
          Get Template
        </button>
      </div>
      <button className="mt-2 text-xs font-medium text-gray-700">
        Show Details ▼
      </button>
    </div>
  </div>
</div>
```

### Action Button (Primary)
```tsx
<button className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
  <ArrowDownTrayIcon className="h-4 w-4 inline mr-2" />
  Download Template
</button>
```

### Action Button (Secondary)
```tsx
<button className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
  Normalized
</button>
```

---

## Interaction Patterns

### 1. Expandable Details

**Collapsed State:**
```
┌──────────────────────────────────────────────┐
│ ❌ Missing required columns                   │
│                                                │
│ 3 columns missing                             │
│ Add these columns to match the template       │
│                                                │
│ [ Show Details ▼ ]              [Get Template]│
└──────────────────────────────────────────────┘
```

**Expanded State:**
```
┌──────────────────────────────────────────────┐
│ ❌ Missing required columns                   │
│                                                │
│ 3 columns missing                             │
│ Add these columns to match the template       │
│                                                │
│ [ Hide Details ▲ ]              [Get Template]│
│                                                │
│ ──────────────────────────────────────────── │
│                                                │
│ Missing:  [specialty]  [variable]  [p25]     │
│                                                │
│ Required: specialty · variable · p25 · p50 ·  │
│           p75 · p90                            │
└──────────────────────────────────────────────┘
```

### 2. File List (Multiple Files)

```
┌──────────────────────────────────────────────────────┐
│  Files (3)                                            │
│                                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ ✅  survey-2024.csv                              ││
│  │     127 rows · 10 cols · No issues              ││
│  └─────────────────────────────────────────────────┘│
│                                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ ⚠️   survey-2023.csv                             ││
│  │     95 rows · 8 cols · 2 warnings                ││
│  │     • Missing optional column: provider_type     ││
│  │     • Missing optional column: geographic_region ││
│  └─────────────────────────────────────────────────┘│
│                                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ ❌  survey-2022.csv                              ││
│  │     50 rows · 4 cols · 3 errors                  ││
│  │     • Missing column: specialty                  ││
│  │     • Missing column: variable                   ││
│  │     • Missing column: p25                        ││
│  └─────────────────────────────────────────────────┘│
│                                                       │
│  [ Cancel ]                            [ Upload (2) ]│
│                 Note: 1 file has errors and will be skipped│
└──────────────────────────────────────────────────────┘
```

---

## Excel Worksheet Selection

### Single Worksheet
```
(No selector shown - automatically uses first/only sheet)
```

### Multiple Worksheets

```
┌─────────────────────────────────────────────────────┐
│  Select worksheet                                    │
│  This Excel file contains 3 worksheets.              │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ ●  📄 2024 Data                              │   │
│  │    127 rows · 10 columns                     │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ ○  📄 2023 Data                              │   │
│  │    95 rows · 8 columns                       │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ ○  📄 Archive                                │   │
│  │    250 rows · 10 columns                     │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Interactions:**
- Click card to select
- Selected card: filled radio button, indigo border, indigo background
- Hover: gray background
- Disabled: 50% opacity

---

## Success States

### Upload Success
```
┌─────────────────────────────────────────┐
│                                          │
│       ✅                                 │
│                                          │
│  Upload successful                       │
│                                          │
│  survey-data.csv uploaded                │
│  127 rows processed                      │
│                                          │
│  [ View Survey ]          [ Upload More ]│
│                                          │
└─────────────────────────────────────────┘
```

### Multiple Files Success
```
┌─────────────────────────────────────────┐
│                                          │
│       ✅                                 │
│                                          │
│  3 files uploaded successfully           │
│                                          │
│  • survey-2024.csv (127 rows)           │
│  • survey-2023.csv (95 rows)            │
│  • survey-2022.csv (skipped - errors)   │
│                                          │
│  Total: 222 rows processed               │
│                                          │
│  [ View Surveys ]                        │
│                                          │
└─────────────────────────────────────────┘
```

---

## Mobile Responsive

### Desktop (> 768px)
- Two-column layouts where appropriate
- Horizontal action bars
- Side-by-side buttons

### Mobile (< 768px)
- Stack everything vertically
- Full-width buttons
- Simplified data tables (scroll horizontally)
- Collapse expandable sections by default

---

## Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Escape to close dialogs
- Arrow keys for radio button cards

### Screen Readers
- Proper ARIA labels
- Status announcements for validation results
- Error summaries read first
- Interactive elements properly labeled

### Visual
- High contrast text (WCAG AA)
- Focus visible on all interactive elements
- Icons plus text (never icons alone)
- Touch targets 44px minimum

---

## Animation & Transitions

### Micro-Interactions
```css
/* Smooth transitions for interactive elements */
transition-colors  /* 150ms */

/* Expandable sections */
transition-all transform rotate-90  /* Chevron rotation */

/* Focus rings */
focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
```

### Loading States
```
• Spinner for file parsing (< 1s)
• Progress bar for upload (1s+)
• Skeleton loaders for data preview
```

---

## Summary

### What Makes This Enterprise-Grade

1. **Fast** - Each stage completes in seconds
2. **Clear** - User always knows what's happening
3. **Helpful** - Errors include fix instructions
4. **Confident** - Shows progress and success
5. **Accessible** - Works for everyone
6. **Responsive** - Works on all devices
7. **Consistent** - Follows design system
8. **Professional** - Apple-level polish

### What We Avoid

❌ Error codes  
❌ Technical jargon  
❌ Overwhelming users  
❌ Blocking on warnings  
❌ Hiding important info  
❌ Making users guess  
❌ Inconsistent styling  

---

**Implementation**: Complete  
**Status**: ✅ Ready for Development  
**Updated**: January 24, 2026
