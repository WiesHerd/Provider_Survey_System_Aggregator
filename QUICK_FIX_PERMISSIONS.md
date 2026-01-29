# Quick Fix: Firebase Permission Error

## The Problem
You're seeing: **"Missing or insufficient permissions"** when uploading surveys.

## The Solution (3 Steps)

### Step 1: Sign In ✅
1. Look at the **top-right corner** of the app
2. Click the **user menu** (your email or "Sign In")
3. If you're already signed in, **sign out and sign back in** to refresh your session

### Step 2: Deploy Security Rules ✅
Open your terminal and run:

```bash
# Make sure you're in the project root directory
cd "c:\Users\wherd\Python Projects\Provider_Survey_System_Aggregator-main"

# Deploy the security rules
firebase deploy --only firestore:rules
```

**If you don't have Firebase CLI installed:**
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### Step 3: Verify It Worked ✅
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **Provider Survey Aggregator**
3. Go to **Firestore Database** → **Rules** tab
4. You should see your security rules (from `firestore.rules` file)

### Step 4: Try Uploading Again
After deploying rules, refresh the page and try uploading your survey again.

## Why This Happens

Your `firestore.rules` file has security rules that require:
- ✅ User must be authenticated (`request.auth != null`)
- ✅ User can only access their own data (`request.auth.uid == userId`)

**These rules must be deployed to Firebase** for uploads to work. The rules file in your code is just the source - it needs to be deployed to Firebase to be active.

## Still Not Working?

1. **Check browser console (F12)** - Look for detailed error messages
2. **Verify you're signed in** - Check top-right menu shows your email
3. **Check Firebase Console** - Verify rules are deployed (Step 3 above)
4. **Sign out and sign back in** - This refreshes your auth token

## Diagnostic Commands

To check if rules are deployed:
```bash
firebase firestore:rules:get
```

This will show you the currently deployed rules. Compare them to your `firestore.rules` file.
