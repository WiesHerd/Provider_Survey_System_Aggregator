# Firebase Setup Guide for Survey Aggregator

## 🎯 Overview

This guide will help you set up Firebase for your Survey Aggregator application, enabling cloud-based data storage with user authentication and data isolation.

## 📋 Prerequisites

1. Firebase project created (you already have "Provider Survey Aggregator")
2. Firebase CLI installed: `npm install -g firebase-tools`
3. Node.js and npm installed

---

## 🚀 Step-by-Step Setup

### Step 1: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **Provider Survey Aggregator**
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll down to **Your apps** section
5. Click **Web** icon (`</>`) to add a web app
6. Register app name (e.g., "Survey Aggregator Web")
7. Copy the Firebase configuration object

### Step 2: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=provider-survey-aggregator.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=provider-survey-aggregator
REACT_APP_FIREBASE_STORAGE_BUCKET=provider-survey-aggregator.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Storage Mode (set to 'firebase' to use Firestore)
REACT_APP_STORAGE_MODE=firebase

# Optional: Measurement ID for Analytics
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**⚠️ Important**: Never commit `.env.local` to git (it's already in `.gitignore`)

### Step 3: Enable Firebase Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** provider
4. (Optional) Configure authorized domains

### Step 4: Initialize Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Choose **Start in production mode** (we'll deploy security rules)
4. Select a location (choose closest to your users)
5. Click **Enable**

### Step 5: Deploy Firestore Security Rules

1. **Login to Firebase CLI**:
   ```bash
   firebase login
   ```

2. **Initialize Firebase in your project**:
   ```bash
   firebase init firestore
   ```
   - Select your project: **Provider Survey Aggregator**
   - Use existing `firestore.rules` file: **Yes**
   - Use existing `firestore.indexes.json` file: **No** (or Yes if you have one)

3. **Deploy Security Rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

   This will deploy the security rules from `firestore.rules` that ensure:
   - Users can only access their own data
   - All data is scoped to user ID
   - No cross-user data access

### Step 6: Configure Firebase Hosting (Optional)

If you want to deploy to Firebase Hosting instead of Vercel:

1. **Initialize Firebase Hosting**:
   ```bash
   firebase init hosting
   ```
   - Select your project
   - Public directory: `build`
   - Configure as single-page app: **Yes**
   - Set up automatic builds: **No** (or Yes if using GitHub Actions)

2. **Build and Deploy**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## 🔧 Configuration Options

### Storage Mode

Set `REACT_APP_STORAGE_MODE` in `.env.local`:

- `firebase` - Use Firestore (cloud storage, requires authentication)
- `indexeddb` - Use IndexedDB (local storage, no authentication required)

**Default**: If Firebase is available, it will auto-detect and use Firestore. Otherwise, falls back to IndexedDB.

### Authentication Requirements

The app will:
- **Require authentication** if `REACT_APP_STORAGE_MODE=firebase`
- **Allow anonymous access** if `REACT_APP_STORAGE_MODE=indexeddb`

---

## 📦 Migration from IndexedDB to Firestore

If you have existing data in IndexedDB and want to migrate to Firestore:

1. **Ensure you're authenticated** in the app
2. **Use the Migration Service**:

```typescript
import { FirebaseMigrationService } from './services/FirebaseMigrationService';

const migrationService = new FirebaseMigrationService((progress) => {
  console.log(`Migration: ${progress.percentage}% - ${progress.currentStep}`);
});

// Migrate all data
await migrationService.migrateAll();

// Verify migration
const verification = await migrationService.verifyMigration();
console.log('Migration verified:', verification.success);
```

Or create a migration component/page in your app.

---

## 🔒 Security Rules

The Firestore security rules are already configured in `firestore.rules`. They ensure:

- ✅ Users can only access their own data (`users/{userId}/...`)
- ✅ All operations require authentication
- ✅ No cross-user data access
- ✅ System data is read-only

**Important**: Always deploy security rules before going to production!

---

## 🧪 Testing

1. **Test Authentication**:
   - Start the app: `npm start`
   - Navigate to `/auth-test` (if available)
   - Try signing up and signing in

2. **Test Data Storage**:
   - Upload a survey
   - Verify data appears in Firestore Console
   - Check that data is scoped to your user ID

3. **Test Data Isolation**:
   - Create a second test account
   - Verify you can't see the first account's data

---

## 🚨 Troubleshooting

### "Firebase is not available"
- Check that all environment variables are set in `.env.local`
- Restart the development server after adding environment variables
- Verify Firebase project ID matches

### "User not authenticated"
- Ensure Firebase Authentication is enabled
- Check that Email/Password provider is enabled
- Verify user is signed in before accessing data

### "Permission denied" errors
- Deploy Firestore security rules: `firebase deploy --only firestore:rules`
- Check that user is authenticated
- Verify security rules match your data structure

### Migration fails
- Ensure you're authenticated before migrating
- Check browser console for specific errors
- Verify IndexedDB has data to migrate

---

## 📝 Next Steps

1. ✅ Set up environment variables
2. ✅ Enable Firebase Authentication
3. ✅ Deploy Firestore Security Rules
4. ✅ Test authentication flow
5. ✅ Migrate existing data (if needed)
6. ✅ Deploy to production

---

## 🔗 Useful Commands

```bash
# Login to Firebase
firebase login

# Initialize Firestore
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy hosting (if using Firebase Hosting)
firebase deploy --only hosting

# View Firebase project info
firebase projects:list

# Use specific project
firebase use provider-survey-aggregator
```

---

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

---

**Your Firebase Project**: `provider-survey-aggregator`
**Project ID**: `provider-survey-aggregator`

Good luck! 🚀







