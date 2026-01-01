# ⚡ Quick Firebase Setup - Get Your Surveys in the Cloud

## 🎯 3-Step Setup

### Step 1: Get Firebase Config (2 minutes)

1. Go to https://console.firebase.google.com/
2. Select your project (or create new)
3. Click ⚙️ **Settings** → **Project settings**
4. Scroll to **"Your apps"** → Click **Web icon** (`</>`)
5. Copy the config values

### Step 2: Create `.env.local` File (1 minute)

Create `.env.local` in project root:

```env
REACT_APP_FIREBASE_API_KEY=AIza...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
REACT_APP_FIREBASE_MEASUREMENT_ID=G-ABC123
REACT_APP_STORAGE_MODE=firebase
```

### Step 3: Restart & Migrate (2 minutes)

```bash
# Restart dev server
npm start
```

Then in browser console, run:

```javascript
// Quick migration script
(async () => {
  const { migrateSurveysToFirebase } = await import('./src/utils/migrateToFirebase');
  await migrateSurveysToFirebase((p) => console.log(`${p.current}/${p.total}: ${p.currentSurvey}`));
})();
```

## ✅ Done!

Your surveys are now in Firebase cloud storage! 🎉

- ✅ Accessible from any device
- ✅ Automatically backed up
- ✅ Better performance
- ✅ All new uploads go to cloud automatically

## 🔍 Verify

Check Firebase Console → Firestore Database → `users/{your-id}/surveys/`

See `MIGRATE_TO_FIREBASE.md` for detailed instructions.





