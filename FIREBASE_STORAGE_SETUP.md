# Firebase Storage Setup Guide

## 🎯 Quick Fix: Enable Firebase Storage

Your application is currently using **IndexedDB (local browser storage)** by default. To enable **Firebase cloud storage**, follow these steps:

### Step 1: Create `.env.local` File

Create a `.env.local` file in your project root (same directory as `package.json`):

```env
# Firebase Configuration
# Get these values from: https://console.firebase.google.com/project/provider-survey-aggregator/settings/general
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=provider-survey-aggregator.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=provider-survey-aggregator
REACT_APP_FIREBASE_STORAGE_BUCKET=provider-survey-aggregator.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# CRITICAL: Set this to enable Firebase storage
REACT_APP_STORAGE_MODE=firebase
```

### Step 2: Get Firebase Configuration Values

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **Provider Survey Aggregator**
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll to **"Your apps"** section
5. If you don't have a web app:
   - Click **Web icon** (`</>`)
   - Register app name: "Survey Aggregator Web"
   - Copy the config values
6. If you already have a web app:
   - Click on it to see the config values
   - Copy all the values to your `.env.local` file

### Step 3: Enable Firebase Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started** (if not already enabled)
3. Enable **Email/Password** provider
4. (Optional) Configure authorized domains

### Step 4: Sign In to Your Application

1. **Restart your development server** (required for environment variables to load)
2. Open your application
3. Sign in with your Firebase account (or create a new account)
4. You should now see "Firebase (Cloud)" in the storage status indicator

### Step 5: Verify Storage Mode

After restarting, check the upload screen:
- You should see a green alert showing "Storage Mode: Firebase (Cloud)"
- If you see "IndexedDB (Local Browser Storage)", check:
  - `.env.local` file exists and has correct values
  - `REACT_APP_STORAGE_MODE=firebase` is set
  - Development server was restarted
  - User is authenticated

---

## 🔍 Troubleshooting

### Problem: Still seeing "IndexedDB (Local Browser Storage)"

**Solution:**
1. Verify `.env.local` file exists in project root
2. Check `REACT_APP_STORAGE_MODE=firebase` is set (no quotes, no spaces)
3. **Restart your development server** (environment variables only load on startup)
4. Check browser console for Firebase initialization errors

### Problem: "Firebase not configured" error

**Solution:**
1. Verify all `REACT_APP_FIREBASE_*` variables are set in `.env.local`
2. Check for typos in variable names (must start with `REACT_APP_`)
3. Ensure no quotes around values in `.env.local`
4. Restart development server

### Problem: "User not authenticated" error

**Solution:**
1. Sign in to your application using Firebase Authentication
2. Check Firebase Console → Authentication → Users to see if your account exists
3. If account doesn't exist, create one using the sign-up flow

### Problem: Data not appearing in Firebase Console

**Solution:**
1. Verify you're signed in (check storage status indicator)
2. Check Firebase Console → Firestore Database
3. Navigate to: `users/{your-user-id}/surveys`
4. Data is user-scoped, so you'll only see your own data

---

## 📊 Storage Mode Comparison

| Feature | IndexedDB (Local) | Firebase (Cloud) |
|---------|------------------|------------------|
| **Storage Location** | Browser (local) | Cloud (Firebase) |
| **Data Persistence** | Cleared if browser data cleared | Permanent (cloud) |
| **Multi-Device Sync** | ❌ No | ✅ Yes |
| **Authentication** | ❌ Not required | ✅ Required |
| **Cost** | Free | Free tier available |
| **Offline Support** | ✅ Yes | ✅ Yes (with sync) |
| **Setup Complexity** | ✅ Simple | ⚠️ Requires config |

---

## 🚀 Production Deployment

When deploying to Vercel:

1. Add environment variables in Vercel dashboard:
   - Go to your project → Settings → Environment Variables
   - Add all `REACT_APP_FIREBASE_*` variables
   - Add `REACT_APP_STORAGE_MODE=firebase`

2. Redeploy your application

3. Verify storage mode in production (check storage status indicator)

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `.env.local` file created with all Firebase variables
- [ ] `REACT_APP_STORAGE_MODE=firebase` is set
- [ ] Development server restarted
- [ ] User signed in to application
- [ ] Storage status indicator shows "Firebase (Cloud)"
- [ ] Upload test file and verify it appears in Firebase Console
- [ ] Data visible in Firestore: `users/{user-id}/surveys`

---

## 📝 Important Notes

1. **Never commit `.env.local` to git** - it contains sensitive API keys
2. **Restart required** - Environment variables only load when server starts
3. **User-scoped data** - Each user only sees their own data in Firebase
4. **Authentication required** - Firebase storage requires user authentication
5. **Data migration** - Existing IndexedDB data won't automatically migrate to Firebase

---

## 🆘 Still Having Issues?

1. Check browser console for detailed error messages
2. Verify Firebase project is active in Firebase Console
3. Check Firestore Database is created (Firebase Console → Firestore Database)
4. Verify Security Rules are deployed (should be automatic)
5. Check network tab for Firebase API errors

For more help, see:
- [Firebase Setup Guide](./FIREBASE_SETUP_GUIDE.md)
- [Firebase CLI Setup](./FIREBASE_CLI_SETUP_COMPLETE.md)





