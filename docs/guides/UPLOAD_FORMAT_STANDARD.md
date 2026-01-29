# Upload Format Standard
## Normalized Format - The Only Format We Accept

**Decision**: One standard format for all survey data  
**Why**: Simplicity, reliability, predictability (like Salesforce, QuickBooks, SAP)

---

## The Standard Format

### Required Columns (6)
```csv
specialty,variable,p25,p50,p75,p90
```

1. **specialty** - Medical specialty name
2. **variable** - Metric name (TCC, Work RVU, CF, etc.)
3. **p25** - 25th percentile value
4. **p50** - 50th percentile (median) value
5. **p75** - 75th percentile value
6. **p90** - 90th percentile value

### Optional Columns (4)
```csv
provider_type,geographic_region,n_orgs,n_incumbents
```

7. **provider_type** - Provider category (Advanced Practice, Staff Physician)
8. **geographic_region** - Location or "National" for national data
9. **n_orgs** - Number of organizations reporting
10. **n_incumbents** - Number of individual providers

---

## Complete Example

```csv
specialty,provider_type,geographic_region,variable,n_orgs,n_incumbents,p25,p50,p75,p90
Family Medicine,Advanced Practice,National,TCC,120,950,120000,135000,150000,165000
Family Medicine,Advanced Practice,National,Work RVU,120,950,3500,4000,4500,5000
Family Medicine,Advanced Practice,National,CF,120,950,32,35,38,41
Internal Medicine,Advanced Practice,National,TCC,150,1100,125000,140000,155000,170000
Internal Medicine,Advanced Practice,National,Work RVU,150,1100,3600,4100,4600,5100
Internal Medicine,Advanced Practice,National,CF,150,1100,33,36,43,48
Emergency Medicine,Advanced Practice,National,TCC,100,800,130000,145000,160000,175000
Emergency Medicine,Advanced Practice,National,Work RVU,100,800,3800,4300,4800,5300
Emergency Medicine,Advanced Practice,National,CF,100,800,34,39,44,49
```

---

## Key Concepts

### One Row Per Metric Per Specialty

**❌ Wrong** (Wide Format):
```
specialty           | TCC_p25 | TCC_p50 | TCC_p75 | wRVU_p25 | wRVU_p50
Family Medicine     | 120000  | 135000  | 150000  | 3500     | 4000
```

**✅ Correct** (Normalized Format):
```
specialty           | variable | p25    | p50    | p75
Family Medicine     | TCC      | 120000 | 135000 | 150000
Family Medicine     | Work RVU | 3500   | 4000   | 4500
```

**Why This Way?**
- Easy to add new metrics (just add rows)
- Easy to add new percentiles (just add columns)
- Consistent structure across all surveys
- Simple to validate
- Clean data model

---

## National vs. Regional Data

### National Data (No Regions)
**Use "National" in `geographic_region` column:**

```csv
specialty,provider_type,geographic_region,variable,p25,p50,p75,p90
Family Medicine,Advanced Practice,National,TCC,120000,135000,150000,165000
Internal Medicine,Advanced Practice,National,TCC,125000,140000,155000,170000
```

### Regional Data
**Use actual region names:**

```csv
specialty,provider_type,geographic_region,variable,p25,p50,p75,p90
Family Medicine,Advanced Practice,Northeast,TCC,130000,145000,160000,175000
Family Medicine,Advanced Practice,Southeast,TCC,110000,125000,140000,155000
Family Medicine,Advanced Practice,West,TCC,140000,155000,170000,185000
```

---

## Column Specifications

### 1. specialty
- **Type**: Text
- **Required**: Yes
- **Examples**: 
  - `Family Medicine`
  - `Internal Medicine`
  - `Cardiology - Non-Invasive`
  - `Emergency Medicine`
- **Notes**: Use consistent naming across all rows

### 2. provider_type
- **Type**: Text
- **Required**: No (but recommended)
- **Common Values**:
  - `Advanced Practice`
  - `Staff Physician`
  - `Call Pay`
- **Notes**: Must match your filter selection during upload

### 3. geographic_region
- **Type**: Text
- **Required**: No
- **Common Values**:
  - `National` (for national data)
  - `Northeast`, `Southeast`, `Midwest`, `West`
  - State names
  - Custom regions
- **Notes**: Use "National" if no regional breakdown

### 4. variable
- **Type**: Text
- **Required**: Yes
- **Common Values**:
  - `TCC` (Total Cash Compensation)
  - `Work RVU` or `wRVU`
  - `CF` (Conversion Factor)
  - `Base Salary`
  - `Bonus`
  - Custom metrics
- **Notes**: One row per variable per specialty

### 5. n_orgs
- **Type**: Number (integer)
- **Required**: No
- **Description**: Number of organizations reporting this data
- **Example**: `120`

### 6. n_incumbents
- **Type**: Number (integer)
- **Required**: No
- **Description**: Number of individual providers in the data set
- **Example**: `950`

### 7-10. p25, p50, p75, p90
- **Type**: Number (decimal allowed)
- **Required**: Yes (at least p25, p50, p75, p90)
- **Description**: Percentile values for the metric
- **Examples**: 
  - `120000` (for TCC)
  - `3500` (for wRVU)
  - `32` (for CF)
- **Notes**: 
  - p50 is the median
  - Use actual values, not formulas
  - No dollar signs or commas

---

## Converting Your Data

### From Wide Format (Multiple Metrics Per Row)

**Your Data:**
```
specialty           | TCC_p25 | TCC_p50 | wRVU_p25 | wRVU_p50
Family Medicine     | 120000  | 135000  | 3500     | 4000
```

**Our Format:**
```
specialty,variable,p25,p50
Family Medicine,TCC,120000,135000
Family Medicine,Work RVU,3500,4000
```

**Steps:**
1. Download our template
2. For each row in your data:
   - Create separate rows for each metric (TCC, wRVU, etc.)
   - Put metric name in `variable` column
   - Put percentile values in p25, p50, p75, p90 columns
3. Fill in other columns (specialty, provider_type, region)

### From Multi-Row Headers (Merged Cells)

**Your Data (Excel with merged headers):**
```
Row 1: |          | Total Compensation    | Productivity        |
Row 2: | Specialty | 25th | 50th | 75th | 25th | 50th | 75th |
Row 3: | Family Med| 120K | 135K | 150K | 3500 | 4000 | 4500 |
```

**Our Format:**
```
specialty,variable,p25,p50,p75
Family Medicine,TCC,120000,135000,150000
Family Medicine,Work RVU,3500,4000,4500
```

**Steps:**
1. Download our template
2. Unmerge all cells in your file
3. For each specialty:
   - Create one row per metric
   - Put metric name in `variable` column
   - Put values in appropriate percentile columns

---

## Common Mistakes

### ❌ Missing Required Columns
```csv
specialty,p25,p50
Family Medicine,120000,135000
```
**Problem**: Missing `variable`, `p75`, `p90` columns  
**Fix**: Add all required columns

### ❌ Multiple Metrics in One Row
```csv
specialty,TCC_p25,TCC_p50,wRVU_p25,wRVU_p50
Family Medicine,120000,135000,3500,4000
```
**Problem**: Wide format (we need normalized)  
**Fix**: Create separate rows for TCC and wRVU

### ❌ Empty Required Columns
```csv
specialty,variable,p25,p50,p75,p90
,TCC,120000,135000,150000,165000
Family Medicine,,120000,135000,150000,165000
```
**Problem**: Missing values in required columns  
**Fix**: Fill in all required values

### ❌ Wrong Column Names
```csv
speciality,metric,25th,50th,75th,90th
Family Medicine,TCC,120000,135000,150000,165000
```
**Problem**: Column names don't match standard  
**Fix**: Use exact names: `specialty`, `variable`, `p25`, `p50`, `p75`, `p90`

---

## File Format Guidelines

### CSV Files
- **Encoding**: UTF-8 (recommended)
- **Delimiter**: Comma (`,`)
- **Line Endings**: Any (Windows, Mac, Unix all work)
- **Quotes**: Use quotes around values with commas
- **Example**: `"Cardiology - Cardiac Imaging (Echo, CT, MRI)",TCC,450000`

### Excel Files (.xlsx, .xls)
- **Worksheet**: Use first sheet or select which sheet to upload
- **Headers**: First row only (no merged cells)
- **Format**: Simple table format
- **No Formulas**: Values only, no Excel formulas

---

## Template File

### Download Template
Click **Download Template** button in the upload screen to get:
- Pre-formatted file with correct headers
- Example rows showing data structure
- Comments explaining each column

### What's Included
```csv
specialty,provider_type,geographic_region,variable,n_orgs,n_incumbents,p25,p50,p75,p90
# Replace these example rows with your data
Family Medicine,Advanced Practice,National,TCC,120,950,120000,135000,150000,165000
Family Medicine,Advanced Practice,National,Work RVU,120,950,3500,4000,4500,5000
# Add more rows as needed
```

---

## Quality Tips

### ✅ Best Practices
1. **Consistent Naming** - Use same specialty names across all rows
2. **Complete Data** - Include all 4 percentiles (p25, p50, p75, p90)
3. **Add Optional Columns** - Include n_orgs, n_incumbents for better quality
4. **Check Values** - Ensure percentiles increase (p25 < p50 < p75 < p90)
5. **Use Template** - Start with our template to avoid errors

### ⚠️ Common Issues
- Specialty names with typos or inconsistent formatting
- Missing percentile values (leaving some empty)
- Percentiles out of order (p75 < p50)
- Mixing regional and national data
- Including formulas instead of values

---

## Getting Help

### If You're Stuck
1. **Download Template** - Start with the correct format
2. **Check Examples** - See sample data in this guide
3. **Review Errors** - Validation messages tell you exactly what's wrong
4. **Contact Support** - We're here to help

### Support Resources
- Upload validation messages (tell you exactly what to fix)
- This documentation
- Template file with examples
- Support team

---

## Summary

**The Format**:
```csv
specialty,variable,p25,p50,p75,p90
```

**The Rule**:
One row per metric per specialty

**The Process**:
1. Download template
2. Add your data
3. Upload file
4. Fix any issues
5. Done!

**The Result**:
Clean, consistent data that works perfectly with all analytics features.

---

**Status**: ✅ Standard Format Documentation  
**Updated**: January 24, 2026  
**Version**: 2.0.0
