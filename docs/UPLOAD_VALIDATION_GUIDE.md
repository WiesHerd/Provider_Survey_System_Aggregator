# Upload Validation Guide

## Overview

The Survey Aggregator uses a comprehensive, enterprise-grade validation system that provides immediate feedback on CSV file uploads. Validation occurs in multiple layers to ensure data quality and format correctness.

## Validation Layers

### 1. Pre-Upload Validation (< 500ms)

**File Structure Validation:**
- File extension check (.csv only)
- File size validation (< 50MB)
- Empty file detection
- Encoding detection (UTF-8, Windows-1252, ISO-8859-1)

**Header-Only Validation (< 1s):**
- Parses only the first line (headers)
- Column count consistency check
- Format detection
- Empty header detection

### 2. Column Validation

**Format Detection:**
- Normalized format: `specialty, variable, n_orgs, n_incumbents, p25, p50, p75, p90`
- Wide format: `Provider Name, Specialty, Geographic Region, Provider Type, Compensation`
- Wide Variable format: `specialty, provider_type, geographic_region, n_orgs, n_incumbents, tcc_p25, tcc_p50, ..., wrvu_p25, ..., cf_p25, ...`

**Column Requirements:**
- Validates required columns are present
- Checks for missing columns
- Identifies unknown columns
- Provides column mapping suggestions

### 3. Data Type Validation

**Numeric Validation:**
- Verifies percentile columns (p25, p50, p75, p90) are numbers
- Validates count columns (n_orgs, n_incumbents) are numbers
- Checks for non-numeric values in numeric fields

**Range Validation:**
- Compensation values: 0 - 10,000,000
- Count values: >= 0
- Detects negative values
- Flags unusually high values

**Required Field Validation:**
- Checks required fields are not empty
- Reports missing values with row numbers

### 4. Business Rule Validation

**Provider Type Validation:**
- Validates against: PHYSICIAN, APP, CALL, CUSTOM
- Checks for invalid combinations (e.g., CALL_PAY + APP)
- Verifies data matches selected provider type

**Data Category Validation:**
- Validates against: COMPENSATION, CALL_PAY, MOONLIGHTING, CUSTOM
- Checks category matches data content

**Survey Source Validation:**
- Validates against: MGMA, SullivanCotter, Gallagher, ECG, AMGA
- Maps survey sources to expected formats

## Supported Formats

### Normalized Format

**Required Columns:**
- `specialty` - Medical specialty name
- `variable` - Variable type (TCC, Work RVUs, CFs)
- `n_orgs` - Number of organizations
- `n_incumbents` - Number of incumbents
- `p25` - 25th percentile
- `p50` - 50th percentile (median)
- `p75` - 75th percentile
- `p90` - 90th percentile

**Optional Columns:**
- `provider_type` - Provider type
- `geographic_region` - Geographic region

**Example:**
```csv
specialty,provider_type,geographic_region,variable,n_orgs,n_incumbents,p25,p50,p75,p90
Cardiology,Staff Physician,National,TCC,150,1200,450000,525000,600000,675000
Cardiology,Staff Physician,National,Work RVUs,150,1200,6500,7500,8500,9500
```

**Used By:** Gallagher, AMGA

### Wide Variable Format

**Required Columns:**
- `specialty` - Medical specialty name
- `provider_type` - Provider type
- `geographic_region` - Geographic region
- `n_orgs` - Number of organizations
- `n_incumbents` - Number of incumbents
- `tcc_p25`, `tcc_p50`, `tcc_p75`, `tcc_p90` - TCC percentiles
- `wrvu_p25`, `wrvu_p50`, `wrvu_p75`, `wrvu_p90` - wRVU percentiles
- `cf_p25`, `cf_p50`, `cf_p75`, `cf_p90` - CF percentiles

**Example:**
```csv
specialty,provider_type,geographic_region,n_orgs,n_incumbents,tcc_p25,tcc_p50,tcc_p75,tcc_p90,wrvu_p25,wrvu_p50,wrvu_p75,wrvu_p90,cf_p25,cf_p50,cf_p75,cf_p90
Cardiology,Staff Physician,National,150,1200,450000,525000,600000,675000,6500,7500,8500,9500,65,75,85,95
```

**Used By:** MGMA, SullivanCotter

### Wide Format

**Required Columns:**
- `Provider Name` - Provider name
- `Specialty` - Medical specialty
- `Geographic Region` - Geographic region
- `Provider Type` - Provider type
- `Compensation` - Single compensation value

**Example:**
```csv
Provider Name,Specialty,Geographic Region,Provider Type,Compensation
Cardiology Provider,Cardiology,National,Staff Physician,525000
```

**Used By:** ECG

## Survey Source Format Mapping

| Survey Source | Expected Format |
|--------------|----------------|
| MGMA | wide_variable |
| SullivanCotter | wide_variable |
| Gallagher | normalized |
| ECG | wide |
| AMGA | normalized |

## Error Severity Levels

### Critical Errors
- Block upload
- Must be fixed before proceeding
- Examples:
  - Missing required columns
  - Invalid file format
  - File too large
  - Empty file

### Warnings
- Allow upload with confirmation
- Should be reviewed
- Examples:
  - Format mismatch
  - Data type inconsistencies
  - Unusual values
  - Missing optional columns

### Info Messages
- Informational only
- Best practices
- Examples:
  - Encoding information
  - Format suggestions
  - Data quality tips

## Common Errors and Fixes

### Error: "Missing required columns"

**Fix:**
1. Check sample file for correct column names
2. Ensure all required columns are present
3. Verify column names match exactly (case-sensitive)
4. Download sample file for reference

### Error: "File format mismatch"

**Fix:**
1. Check which format your survey source uses
2. Convert file to correct format
3. Download sample file for correct format
4. Or change survey source to match your format

### Error: "Column must be a number"

**Fix:**
1. Remove any text or special characters from numeric columns
2. Ensure no currency symbols ($, commas)
3. Use numbers only (e.g., 567345 not $567,345)

### Error: "Invalid provider type"

**Fix:**
1. Use standard provider types: PHYSICIAN, APP, CALL, CUSTOM
2. Or use descriptive names: Staff Physician, Advanced Practice Provider
3. Check spelling and capitalization

## Sample Files

Sample files are available for download:
- `sample-normalized-format.csv` - Normalized format example
- `sample-wide-format.csv` - Wide format example
- `sample-wide-variable-format.csv` - Wide variable format example
- `sample-physician-compensation.csv` - Physician compensation data
- `sample-app-compensation.csv` - APP compensation data
- `sample-call-pay.csv` - Call pay data
- `sample-moonlighting.csv` - Moonlighting data

## Best Practices

1. **Use UTF-8 Encoding:** Save files as UTF-8 CSV to avoid encoding issues
2. **Check Column Names:** Ensure column names match exactly (case-sensitive)
3. **Validate Data Types:** Ensure numeric columns contain only numbers
4. **Check Required Fields:** Fill in all required fields
5. **Review Warnings:** Address warnings before uploading for best results
6. **Use Sample Files:** Download sample files as templates

## Performance

- Pre-upload validation: < 500ms
- Header validation: < 1s
- Full validation: < 5s for files < 10MB
- Feedback appears within 2 seconds of file selection

## Support

If you encounter validation errors you cannot resolve:
1. Check this guide for common errors
2. Download and review sample files
3. Verify your file matches the expected format for your survey source
4. Contact support with specific error messages




