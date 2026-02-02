# Blend Transparency: Click Row to See How It Was Aggregated

## Goal

Let users **click on a row (or specialty)** to see how that row was blended: which years and survey sources contributed, sample sizes, weights, and the formula. Enterprise-grade, minimal UI clutter, no reliance on AG Grid Enterprise.

---

## Recommended UX: Click Row → Side Panel (Drawer)

**Why this over tooltips or inline expand:**

- **AG Grid Community** does not include master-detail (expandable rows); that is an Enterprise feature. So we avoid depending on it.
- **Click row → side panel** is a standard, enterprise pattern (e.g. Gmail, Drive, Material Design): primary content stays in the grid; detail lives in a panel. No extra icons in cells, no modal overlay.
- **Robust**: Works with sorting, filtering, pagination. One panel instance; content updates when user clicks another row.
- **Accessible**: Panel can have a clear heading, close button, and keyboard-friendly behavior.

**Flow:**

1. User sees the report table. Blended rows are visually indicated (e.g. subtle row style or a small “Blended” badge in the existing Blended column).
2. User **clicks a blended row** (or specifically the specialty cell, if you want to limit click target). The table does not change; a **side panel (drawer)** opens to the right (or bottom on small screens).
3. Panel title: **“How this row was calculated”** or **“Blend breakdown: [Specialty name]”**.
4. Panel content:
   - **Formula line**: “Weighted by sample size (n_incumbents)” or “Equal weight per source.”
   - **Table**: Columns = Year | Survey source | n (incumbents) | P25 | P50 | P75 | P90 (as configured) | Weight. One row per source row that was blended.
5. User closes the panel (X or click outside) and can click another row to see its breakdown.

**Affordance:** Only **blended** rows are clickable for this (cursor pointer on the row or on the specialty cell). Non-blended rows do not open the panel (or open it with “Single source – no aggregation”).

---

## Data Model (unchanged from earlier plan)

- **ReportDataRow** (optional, blended rows only):
  - `blendBreakdown?: BlendBreakdownItem[]`
  - `blendMethod?: BlendingMethod`
- **BlendBreakdownItem**: `year`, `surveySource`, `n_incumbents`, `n_orgs?`, `p25?`, `p50?`, `p75?`, `p90?`, `weight`.

Report generation already has the source rows at blend time; build `blendBreakdown` and set `blendMethod` when pushing each blended row.

---

## Implementation Outline

| Step | Action |
|------|--------|
| 1. Types | Add `BlendBreakdownItem` and optional `blendBreakdown` and `blendMethod` on `ReportDataRow` in [src/features/reports/types/reports.ts](src/features/reports/types/reports.ts). |
| 2. Report generation | In [reportGenerationService.ts](src/features/reports/services/reportGenerationService.ts), when pushing a blended row, build `blendBreakdown` from `specialtyRows` (year, surveySource, n_incumbents, percentiles, weight) and set `blendMethod`. |
| 3. Report table – row click | In [ReportTable.tsx](src/features/reports/components/ReportTable.tsx), enable row click (or cell click on specialty) for blended rows. On click, set state: `selectedRowForBreakdown = row` (or null to close). |
| 4. Report table – drawer | Render a **drawer/panel** (MUI `Drawer` or a fixed-position panel) that is open when `selectedRowForBreakdown` is set and that row has `blendBreakdown`. Content: title “Blend breakdown: [specialty]”, formula line, and a small table (MUI Table or simple layout) of `blendBreakdown` with columns Year, Survey source, n, P50 (etc.), Weight. Close button clears `selectedRowForBreakdown`. |
| 5. Affordance | For rows with `row.isBlended`, apply `cursor: pointer` (e.g. via rowClassRules or cell class on specialty). Optionally show a small “View calculation” or info icon only in the Blended column for “Yes” rows. |

---

## Optional: Inline Expand (if you add AG Grid Enterprise later)

If the project later adopts **AG Grid Enterprise**, you can add **master-detail**: blended rows get an expand chevron; expanding shows a full-width detail row with the same breakdown table and formula. The data model (`blendBreakdown`, `blendMethod`) stays the same; only the UI would switch from “click → drawer” to “expand → inline detail.”

---

## Summary

- **Interaction**: Click blended row (or specialty cell) → side panel opens with “How this row was calculated.”
- **Panel content**: Formula line + table of Year, Survey source, n, percentiles, Weight.
- **Data**: Attach `blendBreakdown` and `blendMethod` to blended report rows at generation time.
- **Stack**: Uses existing MUI + AG Grid Community; no new dependencies; pattern is familiar and enterprise-appropriate.
