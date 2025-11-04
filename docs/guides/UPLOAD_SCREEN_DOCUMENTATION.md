# Upload Screen Documentation

## 🚨 CRITICAL: DO NOT MODIFY WITHOUT READING THIS DOCUMENT

This document defines the **working state** of the upload screen as of the latest fix. Any changes to the upload functionality must be tested against this baseline.

---

## 📋 Current Working State

### Database Schema (SQLite)
```sql
-- surveys table structure
CREATE TABLE surveys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER,
  type TEXT,
  uploadDate TEXT,
  rowCount INTEGER,
  specialtyCount INTEGER,
  dataPoints INTEGER,
  colorAccent TEXT,
  metadata TEXT
);
```

### Backend API Endpoints

#### 1. GET `/api/surveys` - Get All Surveys
**Response Format:**
```json
{
  "surveys": [
    {
      "id": "uuid-string",
      "name": "filename.csv",
      "year": 2024,
      "type": "MGMA",
      "uploadDate": "2025-08-17T03:41:35.284Z",
      "rowCount": 1792,
      "specialtyCount": 112,
      "dataPoints": 1792
    }
  ]
}
```

#### 2. POST `/api/upload` - Upload Survey
**Request:**
- `file`: CSV file
- `name`: Survey name
- `year`: Survey year
- `type`: Survey type

**Response:**
```json
{
  "success": true,
  "surveyId": "uuid-string",
  "rowCount": 1792
}
```

#### 3. GET `/api/survey/:id/data` - Get Survey Data
**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1792,
    "pages": 18
  }
}
```

---

## 🔧 Frontend Components

### BackendService.ts - CRITICAL MAPPING
```typescript
// CORRECT column mapping (DO NOT CHANGE)
return surveys.map((survey: any) => ({
  id: survey.id,
  name: survey.name || survey.filename,        // Database: 'name'
  year: survey.year?.toString(),              // Database: 'year'
  type: survey.type || 'Unknown',             // Database: 'type'
  uploadDate: new Date(survey.uploadDate),    // Database: 'uploadDate'
  rowCount: survey.rowCount || 0,             // Database: 'rowCount'
  specialtyCount: 0,
  dataPoints: survey.rowCount || 0,
  colorAccent: '#6366F1',
  metadata: { ... }
}));
```

### SurveyUpload.tsx - Data Processing
```typescript
// CORRECT data transformation (DO NOT CHANGE)
const processedSurveys = surveys.map((survey: any) => ({
  id: survey.id,
  fileName: survey.name || '',                // BackendService: 'name'
  surveyType: survey.type || '',              // BackendService: 'type'
  surveyYear: survey.year?.toString() || '',  // BackendService: 'year'
  uploadDate: new Date(survey.uploadDate || new Date()),
  fileContent: '',
  rows: [],
  stats: {
    totalRows: survey.rowCount ?? survey.row_count ?? 0,
    uniqueSpecialties: survey.specialtyCount ?? survey.specialty_count ?? 0,
    totalDataPoints: survey.dataPoints ?? survey.data_points ?? 0
  },
  columnMappings: {}
}));
```

---

## 🎯 Survey Pills Display Logic

### Working Pill Format
```typescript
// Survey pills show: "{surveyType} • {surveyYear}"
// Example: "MGMA • 2024", "SullivanCotter • 2024"

const surveyType = survey.surveyType;  // From processedSurveys
const surveyYear = survey.surveyYear;  // From processedSurveys

// Display in pill:
<span className="font-medium">{surveyType}</span>
<span className="text-xs">{surveyYear}</span>
```

### Data Flow
1. **Database** → `BackendService.getAllSurveys()` → **Frontend**
2. **Frontend** → `SurveyUpload.loadSurveys()` → **Processed Data**
3. **Processed Data** → **Survey Pills Display**

---

## 🚫 Common Breaking Changes to AVOID

### ❌ DON'T CHANGE THESE:
1. **Database column names** - Keep `type`, `year`, `name`, `uploadDate`
2. **BackendService mapping** - Keep the exact field mappings above
3. **SurveyUpload processing** - Keep the exact transformation above
4. **API response formats** - Keep the exact JSON structures above

### ❌ DON'T ADD:
1. **New required fields** without database migration
2. **Validation logic** that breaks existing data
3. **Data transformation** that changes working formats

---

## 🧪 Testing Checklist

Before making ANY changes to upload functionality:

### Database Test
```bash
# Check survey data integrity
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('survey_data.db');
db.all('SELECT id, name, type, year, uploadDate FROM surveys LIMIT 5', (err, rows) => {
  if (err) console.error(err);
  else console.log('Survey Data:', JSON.stringify(rows, null, 2));
  db.close();
});
"
```

### API Test
```bash
# Test surveys endpoint
curl http://localhost:3001/api/surveys
```

### Frontend Test
1. Upload a new survey
2. Verify survey pills display correctly (no "NaN")
3. Verify survey data loads in preview
4. Verify filters work correctly

---

## 🔄 Migration Requirements

If database schema changes are needed:

1. **Create migration script**
2. **Test on backup data first**
3. **Update BackendService mapping**
4. **Update SurveyUpload processing**
5. **Test all functionality**

---

## 📞 Emergency Rollback

If upload breaks:

1. **Revert BackendService.ts** to this documented version
2. **Revert SurveyUpload.tsx** to this documented version
3. **Check database schema** matches documented version
4. **Test upload flow** completely

---

## 🎯 Success Criteria

Upload screen is working correctly when:
- ✅ Survey pills show proper format: "MGMA • 2024"
- ✅ No "NaN" values in display
- ✅ Survey data loads in preview
- ✅ Filters work correctly
- ✅ Upload process completes without errors

---

**Last Updated:** August 17, 2025
**Status:** WORKING - DO NOT MODIFY WITHOUT TESTING
