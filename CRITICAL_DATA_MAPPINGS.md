# 🚨 CRITICAL DATA MAPPINGS - DO NOT CHANGE

## Database → BackendService → Frontend Flow

### Database Columns (SQLite)
```
surveys table:
- id (TEXT)
- name (TEXT) 
- year (INTEGER)
- type (TEXT)
- uploadDate (TEXT)
- rowCount (INTEGER)
- specialtyCount (INTEGER)
- dataPoints (INTEGER)
```

### BackendService.getAllSurveys() Mapping
```typescript
// ✅ CORRECT - DO NOT CHANGE
return surveys.map((survey: any) => ({
  id: survey.id,                                    // Database: id
  name: survey.name || survey.filename,            // Database: name
  year: survey.year?.toString(),                   // Database: year
  type: survey.type || 'Unknown',                  // Database: type
  uploadDate: new Date(survey.uploadDate),         // Database: uploadDate
  rowCount: survey.rowCount || 0,                  // Database: rowCount
  // ... rest of fields
}));
```

### SurveyUpload.tsx Processing
```typescript
// ✅ CORRECT - DO NOT CHANGE
const processedSurveys = surveys.map((survey: any) => ({
  id: survey.id,                                    // BackendService: id
  fileName: survey.name || '',                     // BackendService: name
  surveyType: survey.type || '',                   // BackendService: type
  surveyYear: survey.year?.toString() || '',       // BackendService: year
  uploadDate: new Date(survey.uploadDate || new Date()), // BackendService: uploadDate
  // ... rest of fields
}));
```

### Survey Pills Display
```typescript
// ✅ CORRECT - DO NOT CHANGE
<span className="font-medium">{survey.surveyType}</span>   // From processedSurveys
<span className="text-xs">{survey.surveyYear}</span>       // From processedSurveys
```

## 🚫 NEVER CHANGE THESE MAPPINGS

1. **Database column names** - Keep `type`, `year`, `name`, `uploadDate`
2. **BackendService field access** - Keep `survey.type`, `survey.year`, etc.
3. **SurveyUpload field mapping** - Keep `surveyType`, `surveyYear` from BackendService
4. **Display field names** - Keep `survey.surveyType`, `survey.surveyYear`

## 🔧 If You Must Change Something

1. **Test database query first**
2. **Update BackendService mapping**
3. **Update SurveyUpload processing** 
4. **Test survey pills display**
5. **Verify no "NaN" values**

---

**Last Updated:** August 17, 2025
**Status:** WORKING - DO NOT MODIFY
