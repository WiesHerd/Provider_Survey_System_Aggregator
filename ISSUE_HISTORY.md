# Issue History: Survey Analytics App

## 2024-05-15 — Dropdowns Not Populating (Provider Type, Region, Specialty)

**Problem:**
- Provider Type and Region dropdowns were empty in the Fair Market Value screen.
- Specialty dropdown was also empty or incomplete.
- Market Comparison showed all zeros when filtering by Provider Type or Region.

**Root Cause:**
- Survey CSVs used snake_case headers (e.g., `provider_type`, `geographic_region`), but the app expected camelCase (`providerType`, `geographicRegion`).
- The normalization logic did not use the column mapping for these fields, so they were blank in normalized rows.
- Filtering logic was case/whitespace sensitive, causing mismatches.

**Solution:**
- Updated the upload normalization logic to map both camelCase and snake_case using a normalization function.
- Updated `normalizeSurveyRow` to use the column mapping (`cm`) for `providerType`, `geographicRegion`, and `specialty`.
- Added a robust `normalizeString` utility for all filter comparisons (lowercase, trim, single spaces).
- Added debug logging to verify values during filtering.
- Now, all dropdowns are populated from the actual survey data, and filtering works regardless of case or whitespace differences.

**Code locations:**
- `src/components/SurveyUpload.tsx` (normalization and mapping)
- `src/components/FMVCalculator.tsx` (row normalization, robust filtering)

**Best Practice:**
- Always use column mapping and normalization for all user-uploaded data fields.
- Use robust string normalization for all filter comparisons.
- Document fixes and add debug logging when troubleshooting data issues.

---

Add new issues and solutions below as they arise. 