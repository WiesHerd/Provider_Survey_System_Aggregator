# Validation Data Structure Analysis

## Real-World Data Patterns Discovered

### Provider Types Found in Actual Survey Data

Based on analysis of sample files, the following provider types are **legitimate and commonly used**:

1. **Staff Physician** - Most common
2. **Program Director** - Academic/administrative role
3. **Division Chief** - Academic/administrative role  
4. **Department Chair** - Academic/administrative role

### Data Format Patterns

#### 1. Wide Variable Format (Sullivan-Cotter, MGMA)
**Structure:**
```
specialty,provider_type,geographic_region,n_orgs,n_incumbents,tcc_p25,tcc_p50,tcc_p75,tcc_p90,wrvu_p25,wrvu_p50,wrvu_p75,wrvu_p90,cf_p25,cf_p50,cf_p75,cf_p90
```

**Characteristics:**
- All percentile columns are separate (tcc_p25, wrvu_p25, cf_p25, etc.)
- Provider types: Staff Physician, Program Director, Division Chief, Department Chair
- Numeric values are clean integers (no formatting)
- Geographic regions: National, Northeast, North Central, South, West

**Example Row:**
```
General Pediatrics,Program Director,National,32,144,602520,669467,736414,803361,5976,6640,7304,7968,103,112,121,130
```

#### 2. Normalized Format (Gallagher)
**Structure:**
```
specialty,provider_type,geographic_region,variable,n_orgs,n_incumbents,p25,p50,p75,p90
```

**Characteristics:**
- Variable column contains: "TCC", "Work RVUs", "CFs"
- Multiple rows per specialty/provider/region (one per variable)
- Same provider types as wide variable format

**Example Rows:**
```
General Pediatrics,Program Director,National,TCC,32,144,602520,669467,736414,803361
General Pediatrics,Program Director,National,Work RVUs,32,144,5976,6640,7304,7968
General Pediatrics,Program Director,National,CFs,32,144,103,112,121,130
```

#### 3. Wide Format (ECG)
**Structure:**
```
Provider Name,Specialty,Geographic Region,Provider Type,Compensation
```

**Characteristics:**
- Single compensation value per row
- Provider Name column (not always used)
- Same provider types

**Example Row:**
```
Cardiology Provider,Cardiology,National,Staff Physician,525000
```

### Missing Data Indicators

Real survey data uses these indicators for suppressed/missing data:
- `*` (single asterisk)
- `**` (double asterisk)
- `***` (triple asterisk)
- `ISD` (Insufficient Sample Data - Sullivan-Cotter)
- `N/A`, `NA`
- `NULL`, `UNDEFINED`
- `-`, `--`, `---`

### Validation Rules Based on Real Data

1. **Provider Types**: Accept Staff Physician, Program Director, Division Chief, Department Chair, and any type containing keywords like "DIRECTOR", "CHAIR", "CHIEF", "PHYSICIAN"

2. **Numeric Values**: 
   - Accept formatted numbers: `$321,645`, `321,645`
   - Accept missing data indicators: `*`, `ISD`, `N/A`
   - Validate ranges only for actual numbers

3. **Format Detection**:
   - Wide Variable: Has tcc_p25, wrvu_p25, cf_p25 columns
   - Normalized: Has variable column with p25, p50, p75, p90
   - Wide: Has Provider Name, Compensation columns

4. **Geographic Regions**: Accept National, Northeast, North Central, South, West (case-insensitive)

### Key Insights for Validation

1. **Don't be too restrictive** - Provider types vary widely (academic roles are common)
2. **Handle missing data gracefully** - Surveys use various suppression indicators
3. **Format flexibility** - Column names can vary (snake_case vs camelCase vs Title Case)
4. **Numeric normalization** - Strip formatting before validation
5. **Warnings vs Errors** - Most issues should be warnings, not blocking errors

