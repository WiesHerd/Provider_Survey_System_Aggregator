# Benchmarking: Sullivan Cotter APP / WIDE Format Asterisk Fix

**Date**: January 2025  
**Severity**: Critical – Data not displayed  
**Affected**: Benchmarking screen (`/benchmarking`), Total Cash Compensation and other variables for Sullivan Cotter APP (and any WIDE-format survey)

---

## 1. What Was the Issue?

On the benchmarking screen, **Total Cash Compensation** and other variables showed **asterisks (`***`)** for Sullivan Cotter APP (and some other surveys), while the same variables showed real numbers for other sources (e.g. MGMA).

- **Symptom**: TCC (and sometimes other metrics) displayed as `***` for Sullivan Cotter APP.
- **Other surveys**: Same variables showed numeric data.
- **User impact**: Compensation admins could not compare Sullivan Cotter APP data in the benchmarking table.

---

## 2. Root Cause

The problem was in **WIDE format** processing inside `normalizeRowDynamic()` in `analyticsDataService.ts`.

### 2.1 Over-strict storage condition

Variables were only stored when **`p50 > 0`**:

```ts
// BEFORE (problematic)
if (shouldProcess && varData.p50 && varData.p50 > 0) {
  variables[normalizedVarName] = { ... };
}
```

Effects:

- If **p50 was 0** (valid in some specialties or small samples), the variable was **never stored** → table showed `***`.
- If **p50 was missing** but p25/p75/p90 were present, the variable was **dropped** → `***`.
- Any survey (e.g. Sullivan Cotter APP) whose WIDE columns produced `p50 === 0` or missing p50 was affected.

So the bug was **not** Sullivan Cotter–specific; it was the **combination** of:

1. Only considering `p50 > 0`.
2. WIDE-format data that sometimes had zero or missing p50.

### 2.2 Brittle column naming

The percentile column pattern was too strict:

- Only matched `variable_p25`, `variable_p50`, etc. (single underscore).
- Did not allow spaces or alternate labels (e.g. `Total Cash Compensation p50`, `50th%`).

That could cause some columns (e.g. “Total Cash Compensation_p50”) or alternate percentile names to be **skipped**, so no variable was stored and the UI showed `***`.

---

## 3. The Fix (Enterprise-Grade)

### 3.1 Store variable if any percentile is present

Variables are now stored when **any** percentile is defined (including 0):

```ts
// AFTER (robust)
const hasAnyValue =
  varData.p25 !== undefined && varData.p25 !== null ||
  varData.p50 !== undefined && varData.p50 !== null ||
  varData.p75 !== undefined && varData.p75 !== null ||
  varData.p90 !== undefined && varData.p90 !== null;

if (shouldProcess && hasAnyValue) {
  variables[normalizedVarName] = { ... };
}
```

- **0 is valid**: Metrics like p50 can be 0; we still store and show them (formatter can show `***` only when appropriate).
- **Partial data**: If only p25/p75/p90 exist, the variable is still stored and displayed.

### 3.2 Flexible WIDE-format column pattern

The regex for WIDE columns was generalized to support:

- `tcc_p50`, `Total Cash Compensation_p50`
- `Total Cash Compensation p50` (space)
- `25th`, `50th`, `75th`, `90th` and `25th%`, `50th%`, etc.

Pattern (conceptually): **variable name** + **separator** (`_` or space) + **percentile** (p25/p50/p75/p90 or 25th/50th/75th/90th with optional `%`).

### 3.3 Normalization unchanged

Variable names from WIDE columns still go through `normalizeVariableName()` (which uses `mapVariableNameToStandard()`), so names like “Total Cash Compensation” correctly map to `tcc` and match the rest of the app.

---

## 4. Prevention: Design Rules (Do Not Weaken)

These rules should be followed so this class of bug does not return.

### 4.1 Never require “primary” percentile to be non-zero for storage

- **Rule**: When persisting variable metrics from any format (LONG or WIDE), do **not** require a single “primary” percentile (e.g. p50) to be `> 0` in order to store the variable.
- **Store** if at least one of p25/p50/p75/p90 is defined (including 0).
- **Display** logic (e.g. “show `***` when no value”) should live in formatting/presentation, not in “do we store this variable?”

### 4.2 Tolerate column naming variations

- **Rule**: WIDE-format column detection must accept common variations: underscores, spaces, case, and labels like `p50`, `50th`, `50th%`.
- **Rule**: New survey sources (or new exports from existing sources) may use different headers; the parser should be **defensive** and pattern-based, not tied to one exact string.

### 4.3 One place for “missing value” display

- **Rule**: The decision to show `***` (or “N/A”, etc.) is a **display/formatting** decision based on the stored value (e.g. 0, null, or “insufficient data”).
- **Rule**: Data normalization should **never** drop a variable solely because its value is 0 or because one percentile is missing; store what’s present and let the UI decide how to render it.

### 4.4 Document format assumptions

- **Rule**: Any new format (or new survey source) that introduces column naming or structure changes should be documented (e.g. in `docs/` or in code comments) and, if possible, covered by a small test or fixture so regressions are caught.

---

## 5. Where the Logic Lives

| What | Where |
|------|--------|
| WIDE format variable extraction | `src/features/analytics/services/analyticsDataService.ts` → `normalizeRowDynamic()` (branch `else { /* WIDE FORMAT */ }`) |
| “Store if any percentile” rule | Same method: `variableMap.forEach(...)` where `hasAnyValue` is computed |
| Percentile column regex | Same method: `percentilePattern` |
| Display of `***` when no value | `src/features/analytics/components/AnalyticsTableRow.tsx`, `variableFormatters.ts` / `VariableFormattingService` |

---

## 6. Robustness Checklist (for future changes)

When touching analytics normalization or benchmarking:

- [ ] **No “p50 > 0 only”** – Variables are stored if any percentile is defined (including 0).
- [ ] **WIDE pattern** – New column naming variants are handled by the existing (or updated) pattern, not by one-off conditionals.
- [ ] **Missing = display, not drop** – Missing or zero values are handled in formatting, not by refusing to store the variable.
- [ ] **Standard names** – All variable names still go through `normalizeVariableName()` / standard mapping so UI and filters see consistent keys (e.g. `tcc`).

---

## 7. Summary

- **Issue**: TCC (and sometimes other variables) showed as `***` for Sullivan Cotter APP on the benchmarking screen.
- **Cause**: (1) Variables were only stored when `p50 > 0`; (2) WIDE column pattern was too strict.
- **Fix**: Store variables when any percentile is present (including 0); relax WIDE column pattern to common naming variants.
- **Prevention**: Treat “store variable” separately from “show value vs `***`”; accept 0 and partial percentiles; keep column parsing flexible and document assumptions.

This keeps the solution **enterprise-grade and robust** across survey sources and future format changes.
