# Diagnostic Guide: Physician Data Not Showing in Data View

## Issue Summary
You uploaded a SullivanCotter survey with Physician provider type, but it's not appearing in the Physician data view. The data appears to be in IndexedDB but not visible.

## Diagnostic Steps

### Step 1: Check What's Actually in IndexedDB

Run this in your browser console (on localhost:3000):

```javascript
// Copy and paste the contents of check-physician-survey-data.js into console
```

Or manually check:

```javascript
// Open IndexedDB
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('SurveyAggregatorDB', 7);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// Get all surveys
const surveys = await new Promise((resolve, reject) => {
  const transaction = db.transaction(['surveys'], 'readonly');
  const store = transaction.objectStore('surveys');
  const request = store.getAll();
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// Find SullivanCotter surveys
const sullivanSurveys = surveys.filter(s => {
  const name = (s.name || '').toLowerCase();
  return name.includes('sullivancotter') || name.includes('sullivan cotter');
});

console.log('SullivanCotter Surveys:', sullivanSurveys.map(s => ({
  id: s.id,
  name: s.name,
  providerType: s.providerType,
  dataCategory: s.dataCategory,
  type: s.type,
  year: s.year
})));
```

### Step 2: Check Provider Type Detection

The system uses `getEffectiveProviderType()` to determine if a survey should show in the Physician view. A survey must have:

1. `effectiveProviderType === 'PHYSICIAN'`
2. `dataCategory !== 'CALL_PAY'` (not Call Pay)
3. `dataCategory !== 'MOONLIGHTING'` (not Moonlighting)
4. `isCompensationSurvey(survey) === true`

Check if your survey meets these criteria:

```javascript
// After getting surveys from Step 1
const yourSurvey = sullivanSurveys.find(s => /* your survey */);

// Check effective provider type
const dataCategory = yourSurvey.dataCategory;
let effectiveProviderType;

if (dataCategory === 'CALL_PAY') {
  effectiveProviderType = 'CALL';
} else if (dataCategory === 'MOONLIGHTING') {
  effectiveProviderType = yourSurvey.providerType || 'PHYSICIAN';
} else if (dataCategory === 'CUSTOM') {
  effectiveProviderType = yourSurvey.providerType || 'CUSTOM';
} else {
  // For COMPENSATION or legacy surveys
  effectiveProviderType = yourSurvey.providerType || 'PHYSICIAN';
}

console.log('Effective Provider Type:', effectiveProviderType);
console.log('Should show in Physician view:', 
  effectiveProviderType === 'PHYSICIAN' && 
  dataCategory !== 'CALL_PAY' && 
  dataCategory !== 'MOONLIGHTING' &&
  (dataCategory === 'COMPENSATION' || !dataCategory)
);
```

### Step 3: Check Storage Mode (Firebase vs IndexedDB)

The system might be configured to use Firebase, but data is only in IndexedDB:

```javascript
// Check storage mode
const storageMode = localStorage.getItem('storageMode');
console.log('Storage Mode:', storageMode);

// Check if Firebase is configured
import('./src/config/firebase.ts').then(module => {
  const isAvailable = module.isFirebaseAvailable?.();
  console.log('Firebase Available:', isAvailable);
});
```

### Step 4: Check Data View Filtering

The data view uses `ProviderTypeSelector` which calls `ProviderTypeDetectionService`. Check what provider types are detected:

```javascript
// In browser console, after app loads
import('./src/services/ProviderTypeDetectionService.ts').then(async (module) => {
  const service = new module.ProviderTypeDetectionService();
  const result = await service.detectAvailableProviderTypes();
  console.log('Detected Provider Types:', result);
});
```

## Common Issues and Fixes

### Issue 1: Survey Stored with Wrong Provider Type

**Symptom**: Survey exists but `providerType` is not 'PHYSICIAN'

**Fix**: Update the survey record:

```javascript
// Get the survey ID from Step 1
const surveyId = 'your-survey-id';

// Update provider type
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('SurveyAggregatorDB', 7);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const transaction = db.transaction(['surveys'], 'readwrite');
const store = transaction.objectStore('surveys');
const request = store.get(surveyId);

request.onsuccess = () => {
  const survey = request.result;
  survey.providerType = 'PHYSICIAN';
  survey.dataCategory = 'COMPENSATION'; // Ensure it's compensation data
  
  const updateRequest = store.put(survey);
  updateRequest.onsuccess = () => {
    console.log('✅ Survey updated! Refresh the page.');
  };
};
```

### Issue 2: Data Category Missing or Wrong

**Symptom**: Survey has correct `providerType` but wrong `dataCategory`

**Fix**: Set `dataCategory` to 'COMPENSATION':

```javascript
// Same as Issue 1, but set:
survey.dataCategory = 'COMPENSATION';
```

### Issue 3: Data Only in IndexedDB, Not Firebase

**Symptom**: Storage mode is Firebase but data is only in IndexedDB

**Fix Options**:

1. **Switch to IndexedDB mode** (if you want local-only storage):
   - Set `REACT_APP_STORAGE_MODE=indexeddb` in `.env`
   - Or add `?storageMode=indexeddb` to URL

2. **Migrate data to Firebase**:
   - Use the migration utility (if available)
   - Or re-upload the survey when Firebase is configured

### Issue 4: Provider Type Detection Cache

**Symptom**: Detection service cached old results

**Fix**: Clear cache and refresh:

```javascript
// Clear provider type detection cache
localStorage.removeItem('providerTypeDetectionCache');
// Refresh page
location.reload();
```

## Next Steps

1. Run the diagnostic script (`check-physician-survey-data.js`) in browser console
2. Check the console output to identify the specific issue
3. Apply the appropriate fix from above
4. Refresh the page and check if data appears

## Firebase Sync Issue

If data is not uploading to Firebase:

1. **Check Firebase Configuration**:
   - Verify `.env` has Firebase config variables
   - Check browser console for Firebase errors
   - Verify user is authenticated

2. **Check Storage Mode**:
   - System defaults to Firebase if available
   - Check `getCurrentStorageMode()` result
   - Verify uploads are going to correct storage

3. **Check Upload Queue**:
   - Uploads might be queued
   - Check `UploadQueueService` status
   - Look for error messages in console

4. **Manual Sync** (if needed):
   - Use migration utility to sync IndexedDB → Firebase
   - Or re-upload when Firebase is properly configured
