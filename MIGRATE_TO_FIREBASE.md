# Migrate Surveys to Firebase Cloud Storage

## 🚀 Quick Migration Guide

### Step 1: Set Up Firebase (If Not Already Done)

1. Create `.env.local` file in project root:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
REACT_APP_STORAGE_MODE=firebase
```

2. Restart your development server:
```bash
npm start
```

### Step 2: Verify Firebase is Active

Open browser console and check for:
```
✅ Firebase initialized successfully
☁️ Firebase available - using cloud storage for better performance
```

### Step 3: Migrate Your Surveys

#### Option A: Using Browser Console (Easiest)

1. Open your app in the browser
2. Open Developer Console (F12)
3. Paste and run this code:

```javascript
// Import the migration function
import { migrateSurveysToFirebase, verifyMigration } from './src/utils/migrateToFirebase';

// Run migration
migrateSurveysToFirebase((progress) => {
  console.log(`Progress: ${progress.current}/${progress.total} - ${progress.currentSurvey}`);
  if (progress.status === 'complete') {
    console.log('✅ Migration complete!');
  }
}).then(result => {
  console.log('Migration Result:', result);
  
  // Verify migration
  verifyMigration().then(verification => {
    console.log('Verification:', verification);
  });
});
```

#### Option B: Using Migration Dialog Component

The migration dialog component is available at `src/components/FirebaseMigrationDialog.tsx`. You can add it to your Dashboard or Upload screen.

### Step 4: Verify Your Data in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database**
4. Check `users/{your-user-id}/surveys/` - your surveys should be there
5. Check `users/{your-user-id}/surveyData/` - your survey data should be there

## ✅ What Gets Migrated

- ✅ All surveys (metadata)
- ✅ All survey data (rows)
- ✅ Specialty mappings
- ✅ Column mappings
- ✅ Variable mappings
- ✅ Region mappings
- ✅ Provider type mappings

## 🔍 Verification

After migration, verify the data:

```javascript
import { verifyMigration } from './src/utils/migrateToFirebase';

verifyMigration().then(result => {
  console.log('IndexedDB surveys:', result.indexedDBCount);
  console.log('Firebase surveys:', result.firebaseCount);
  console.log('Match:', result.match ? '✅' : '❌');
});
```

## 🎯 After Migration

Once migrated:
- ✅ All new uploads will automatically go to Firebase
- ✅ Your data is now in the cloud (accessible from any device)
- ✅ Data is automatically backed up
- ✅ Better performance for large datasets

## 🚨 Troubleshooting

### "Firebase is not configured"
- Check that `.env.local` exists and has all required variables
- Restart the development server after creating `.env.local`
- Check browser console for Firebase initialization errors

### "No surveys found to migrate"
- Verify you have surveys in IndexedDB
- Check browser console for any errors
- Try refreshing the page

### Migration Fails
- Check browser console for detailed error messages
- Ensure you're authenticated (Firebase Auth required)
- Check Firestore security rules allow write access
- Verify Firebase project is active and billing is enabled (if required)

## 📝 Notes

- **IndexedDB data is NOT deleted** after migration - it remains as backup
- You can migrate multiple times safely (duplicates are skipped)
- Large datasets may take several minutes to migrate
- Progress is logged to console during migration





