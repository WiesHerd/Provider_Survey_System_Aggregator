# Survey Aggregator Data Dictionary

## 📊 Database Schema Overview

### Core Tables

#### 1. `surveys` - Survey Metadata
- **Purpose**: Stores metadata about uploaded survey files
- **Key Fields**:
  - `id` (TEXT): Unique UUID for each survey
  - `name` (TEXT): Original filename (e.g., "SullivanCotter_provider_comp_generated_ascii.csv")
  - `type` (TEXT): Survey provider type (e.g., "SullivanCotter", "MGMA", "Gallagher")
  - `surveyProvider` (TEXT): Currently undefined - needs to be populated
  - `surveyYear` (TEXT): Currently undefined - needs to be populated
  - `uploadDate` (TEXT): ISO timestamp of upload

#### 2. `survey_data` - Individual Data Rows
- **Purpose**: Stores all individual compensation data rows
- **Key Fields**:
  - `id` (TEXT): Unique UUID for each row
  - `surveyId` (TEXT): Foreign key to surveys table
  - `specialty` (TEXT): Raw specialty name from source (e.g., "Allergy and Immunology")
  - `providerType` (TEXT): Raw provider type from source (e.g., "Staff Physician")
  - `region` (TEXT): Raw region name from source (e.g., "West")
  - `tcc` (REAL): Aggregated total cash compensation
  - `cf` (REAL): Aggregated conversion factor
  - `wrvu` (REAL): Aggregated work RVUs
  - `count` (INTEGER): Number of organizations/incumbents
  - `data` (TEXT): **JSON blob containing complete row data**

### Mapping Tables

#### 3. `specialty_mappings_v2` - Standardized Specialties
- **Purpose**: Maps raw specialty names to standardized names
- **Key Fields**:
  - `id` (INTEGER): Auto-increment primary key
  - `standardized_name` (TEXT): Standardized specialty name (e.g., "Allergy & Immunology")
  - `created_at` (DATETIME): Creation timestamp
  - `updated_at` (DATETIME): Last update timestamp

#### 4. `specialty_mapping_sources_v2` - Source Specialty Mappings
- **Purpose**: Links standardized specialties to their source variations
- **Key Fields**:
  - `id` (INTEGER): Auto-increment primary key
  - `mapping_id` (INTEGER): Foreign key to specialty_mappings_v2
  - `source_specialty` (TEXT): Raw specialty name from source
  - `source_survey` (TEXT): Survey provider name
  - `created_at` (DATETIME): Creation timestamp

#### 5. `column_mappings_v2` - Standardized Columns
- **Purpose**: Maps raw column names to standardized names
- **Key Fields**:
  - `id` (INTEGER): Auto-increment primary key
  - `standardized_name` (TEXT): Standardized column name
  - `created_at` (DATETIME): Creation timestamp
  - `updated_at` (DATETIME): Last update timestamp

#### 6. `column_mapping_sources_v2` - Source Column Mappings
- **Purpose**: Links standardized columns to their source variations
- **Key Fields**:
  - `id` (INTEGER): Auto-increment primary key
  - `mapping_id` (INTEGER): Foreign key to column_mappings_v2
  - `source_column` (TEXT): Raw column name from source
  - `source_survey` (TEXT): Survey provider name
  - `created_at` (DATETIME): Creation timestamp

## 📋 Data Structure Details

### JSON Data Column Structure
The `survey_data.data` column contains a JSON object with the following structure:

```json
{
  "specialty": "Allergy and Immunology",
  "provider_type": "Staff Physician",
  "geographic_region": "West",
  "n_orgs": 15,
  "n_incumbents": 45,
  "tcc_p25": 285000,
  "tcc_p50": 340366.29,
  "tcc_p75": 395000,
  "tcc_p90": 450000,
  "wrvu_p25": 4500,
  "wrvu_p50": 5200,
  "wrvu_p75": 6000,
  "wrvu_p90": 6800,
  "cf_p25": 65.50,
  "cf_p50": 68.25,
  "cf_p75": 71.00,
  "cf_p90": 73.75
}
```

### Key Data Fields Explained

#### Compensation Metrics
- **TCC (Total Cash Compensation)**: Base salary + bonuses + incentives
  - `tcc_p25`: 25th percentile
  - `tcc_p50`: 50th percentile (median)
  - `tcc_p75`: 75th percentile
  - `tcc_p90`: 90th percentile

#### Work RVUs (Relative Value Units)
- **wRVU**: Standardized measure of physician work
  - `wrvu_p25`: 25th percentile
  - `wrvu_p50`: 50th percentile (median)
  - `wrvu_p75`: 75th percentile
  - `wrvu_p90`: 90th percentile

#### Conversion Factor
- **CF**: Dollar amount per RVU
  - `cf_p25`: 25th percentile
  - `cf_p50`: 50th percentile (median)
  - `cf_p75`: 75th percentile
  - `cf_p90`: 90th percentile

#### Sample Sizes
- **n_orgs**: Number of organizations reporting
- **n_incumbents**: Number of individual physicians

## 🔄 Data Flow Process

### 1. Data Upload
1. CSV file uploaded via frontend
2. File processed and rows inserted into `survey_data` table
3. Each row stored as JSON in `data` column
4. Survey metadata stored in `surveys` table

### 2. Data Transformation
1. Frontend loads data via `BackendService.getSurveyData()`
2. JSON data parsed from `data` column
3. Column mappings applied to standardize field names
4. Specialty mappings applied to standardize specialty names
5. Transformed data returned to frontend

### 3. Regional Analytics Processing
1. All survey data loaded with sufficient limit (10,000 rows)
2. Specialty filtering applied using mapping relationships
3. Regional filtering applied using `geographicRegion` field
4. Data aggregated by region for each percentile
5. Results displayed in Regional Analytics tables

## 🎯 Current Data Volume

- **Total Rows**: 5,376 individual data points
- **Surveys**: 3 (SullivanCotter, MGMA, Gallagher)
- **Unique Specialties**: 309 different specialty names
- **Regions**: 4 (Midwest, Northeast, South, West)

## 🔍 Specialty Mapping Example

**Standardized Name**: "Allergy & Immunology"

**Source Variations**:
- "Allergy and Immunology" (SullivanCotter)
- "Allergy & Immunology" (Gallagher)
- "Allergy/Immunology" (MGMA)

## 🚨 Known Issues

1. **Survey Metadata**: `surveyProvider` and `surveyYear` fields are undefined
2. **Data Consistency**: Some specialties have multiple variations that need mapping
3. **Regional Data**: All regions present but filtering may not work correctly in frontend

## 📊 Regional Data Availability

**Confirmed Regions**:
- Midwest: ✅ Data available
- Northeast: ✅ Data available  
- South: ✅ Data available
- West: ✅ Data available

**Regional Filtering Logic**:
- National: All rows for selected specialty
- Regional: Rows where `geographicRegion` matches region name
