# Upload Validation Guide
## Enterprise-Grade Validation Process

**Inspired by**: Apple, Stripe, Shopify best practices

---

## Philosophy

### The Apple Way
1. **Fail Fast** - Catch issues immediately, before wasting user's time
2. **Clear Language** - No technical jargon, plain English
3. **Visual Hierarchy** - Icons and colors guide the eye
4. **Actionable** - Always tell user what to do next
5. **Confidence-Building** - Show progress, not just errors
6. **Progressive Disclosure** - Reveal details only when needed

---

## Validation Stages

### Stage 1: File Structure (Instant)
**Validates immediately on file selection**

✅ **What We Check:**
- File type (.csv, .xlsx, .xls)
- File size (< 50MB)
- File encoding (UTF-8)
- File not empty

❌ **If It Fails:**
```
Cannot upload file

File type not supported
Only CSV and Excel files (.csv, .xlsx, .xls) are accepted.

[Download Template]
```

---

### Stage 2: Header Validation (< 500ms)
**Validates after file is parsed**

✅ **What We Check:**
- Required columns present:
  - `specialty`
  - `variable`
  - `p25`, `p50`, `p75`, `p90`
- Optional columns (enhance quality):
  - `provider_type`
  - `geographic_region`
  - `n_orgs`, `n_incumbents`

❌ **If It Fails:**
```
Missing required columns

3 columns missing

[Show Details ▼]
  Missing: specialty, variable, p25
  
  Required: specialty, variable, p25, p50, p75, p90
  Optional: provider_type, geographic_region, n_orgs, n_incumbents

[Download Template]
```

---

### Stage 3: Data Preview (Instant)
**Shows user what was uploaded**

✅ **What We Show:**
```
Data Preview (127 rows × 4 columns)

specialty            | variable | p25    | p50    | p75
Family Medicine      | TCC      | 120000 | 135000 | 150000
Internal Medicine    | TCC      | 125000 | 140000 | 155000
Emergency Medicine   | Work RVU | 3500   | 4000   | 4500
```

**Purpose**: Build confidence - user sees their data is recognized

---

### Stage 4: Data Validation (< 2s)
**Validates data quality**

✅ **What We Check:**
- **Critical** (blocks upload):
  - Specialty column has values
  - Variable column has values
  - At least one percentile has values
  
- **Warnings** (allows upload):
  - Missing optional columns
  - Some rows have empty values
  - Percentile values out of expected range

❌ **If It Fails:**
```
Data validation

1 error found

[Show Details ▼]
  ❌ Add Specialty column
  Add Specialty to your file header and include values for each row.
  
  Columns: Specialty
```

---

## User Experience Flow

### Perfect Upload (No Issues)
```
1. User selects file
   ↓
2. ✅ File validated (instant)
   ↓
3. ✅ Headers validated (< 500ms)
   ↓
4. Shows data preview (127 rows × 10 columns)
   ↓
5. [Upload] button enabled
   ↓
6. User clicks Upload
   ↓
7. Progress indicator (Uploading... 50%)
   ↓
8. ✅ Success! File uploaded
```

### Upload with Missing Columns
```
1. User selects file
   ↓
2. ✅ File validated
   ↓
3. ❌ Missing required columns
   
   Cannot upload file
   
   Missing required columns
   3 columns missing: specialty, variable, p25
   
   [Download Template]  [Other formats: Normalized | Wide]
   ↓
4. User clicks Download Template
   ↓
5. User copies data into template
   ↓
6. User uploads again
   ↓
7. ✅ Success!
```

### Upload with Data Issues (Non-Blocking)
```
1. User selects file
   ↓
2. ✅ File validated
   ↓
3. ✅ Headers validated
   ↓
4. ⚠️ Data validation warnings
   
   File needs attention
   
   Data validation
   5 warnings found
   
   [Show Details ▼]
   ⚠️ Some rows have empty values
   Rows 12, 15, 18 have empty percentile values
   
   [Upload Anyway]  [Fix Issues]
   ↓
5. User clicks Upload Anyway
   ↓
6. ✅ Success (with warnings logged)
```

---

## Visual Design

### Status Indicators

**Blocking Errors** (Red):
```
🔴 Cannot upload file
   Fix the issues below before uploading
```

**Warnings** (Amber):
```
⚠️  File needs attention
   Review these recommendations for best results
```

**Success** (Green):
```
✅ File validated
   Ready to upload
```

### Issue Cards

```
┌─────────────────────────────────────────────────────┐
│ ❌  Missing required columns                         │
│                                                      │
│ 3 columns missing                                   │
│ Add these columns to match the template format.    │
│                                                      │
│ [Show Details ▼]                    [Get Template] │
└─────────────────────────────────────────────────────┘
```

**Expanded:**
```
┌─────────────────────────────────────────────────────┐
│ ❌  Missing required columns                         │
│                                                      │
│ 3 columns missing                                   │
│ Add these columns to match the template format.    │
│                                                      │
│ [Hide Details ▲]                    [Get Template] │
│                                                      │
│ ─────────────────────────────────────────────────── │
│                                                      │
│ Missing:  [specialty]  [variable]  [p25]           │
│                                                      │
│ Required: specialty · variable · p25 · p50 ·        │
│           p75 · p90                                 │
└─────────────────────────────────────────────────────┘
```

---

## Error Messages

### Principles
1. **User-Focused** - "Your file" not "The file"
2. **Specific** - Exactly what's wrong
3. **Actionable** - Exactly how to fix it
4. **No Jargon** - Plain English

### Examples

**❌ Bad:**
```
Error: Invalid CSV format. Required columns missing. ERR_VALIDATION_001
```

**✅ Good:**
```
Missing required columns

3 columns missing from your file: specialty, variable, p25

Add these columns to match our template format.
```

---

**❌ Bad:**
```
File encoding error. UTF-8 BOM detected at byte offset 0x0000.
```

**✅ Good:**
```
File encoding issue

Your file has encoding issues that may cause problems.

Re-save your file as UTF-8 CSV:
• In Excel: File → Save As → CSV UTF-8
• In Google Sheets: File → Download → CSV
```

---

**❌ Bad:**
```
Validation failed: Empty cells detected in required fields at rows [12,15,18,23,24].
```

**✅ Good:**
```
Some rows have empty values

5 rows have empty percentile values

Affected rows: 12, 15, 18, 23, 24

Fill in the missing values or remove these rows.
```

---

## Help & Documentation

### Download Template Button
```
┌──────────────────────────────────────┐
│  ↓  Download Template                │
│                                      │
│  Get the correct file format         │
└──────────────────────────────────────┘
```

**What It Provides:**
- Pre-formatted CSV with correct headers
- Example rows showing data structure
- Comments explaining each column
- Link to documentation

### Template File Content:
```csv
specialty,provider_type,geographic_region,variable,n_orgs,n_incumbents,p25,p50,p75,p90
# Example rows - replace with your data
Family Medicine,Advanced Practice,National,TCC,120,950,120000,135000,150000,165000
Family Medicine,Advanced Practice,National,Work RVU,120,950,3500,4000,4500,5000
Internal Medicine,Advanced Practice,National,TCC,150,1100,125000,140000,155000,170000

# Column descriptions:
# specialty: Medical specialty (e.g., Family Medicine, Cardiology)
# provider_type: Type of provider (e.g., Advanced Practice, Staff Physician)
# geographic_region: Geographic location or "National" for national data
# variable: Metric name (e.g., TCC, Work RVU, CF)
# n_orgs: Number of organizations reporting
# n_incumbents: Number of individual providers
# p25, p50, p75, p90: Percentile values (25th, 50th/median, 75th, 90th)

# For more help, see: [link to documentation]
```

---

## Best Practices Summary

### DO ✅
- Validate early and often
- Show progress at each stage
- Use clear, plain language
- Provide actionable next steps
- Show examples and templates
- Build confidence with previews
- Use color sparingly and purposefully

### DON'T ❌
- Show error codes
- Use technical jargon
- Block on warnings
- Hide details users need
- Make users guess what's wrong
- Overwhelm with too many issues at once
- Use alarming language

---

## Implementation Checklist

### File Upload Component
- [ ] Drag & drop support
- [ ] File type validation (instant)
- [ ] File size validation (instant)
- [ ] Loading indicator
- [ ] Error state with retry

### Validation Display
- [ ] Status bar (red/amber/green)
- [ ] Issue cards (expandable)
- [ ] Download template button
- [ ] Data preview table
- [ ] Clear actionNext steps

### Error Messages
- [ ] User-focused language
- [ ] Specific issue description
- [ ] Fix instructions
- [ ] Examples where helpful
- [ ] Links to docs

### User Flow
- [ ] Immediate feedback
- [ ] Progressive validation
- [ ] Clear success state
- [ ] Easy recovery from errors
- [ ] Help always available

---

**Status**: ✅ Enterprise-Grade Validation System  
**Updated**: January 24, 2026  
**Version**: 2.0.0
