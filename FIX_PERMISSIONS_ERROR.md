# Fix "Missing or insufficient permissions" Error

## Quick Diagnosis

If you're seeing "Missing or insufficient permissions" when uploading surveys, this is a **Firebase Firestore security rules** issue. Here's how to fix it:

## Solution Steps

### Step 1: Verify You're Signed In

1. Check the **top-right corner** of the app for the user menu
2. If you see "Sign In" or no user icon, **click it and sign in**
3. If you're already signed in, try **signing out and signing back in** to refresh your session

### Step 2: Deploy Firestore Security Rules

The security rules in `firestore.rules` must be deployed to Firebase for uploads to work.

#### Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

#### Login to Firebase

```bash
firebase login
```

#### Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### Step 3: Verify Rules Are Deployed

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **Provider Survey Aggregator**
3. Navigate to **Firestore Database** → **Rules** tab
4. You should see your security rules (from `firestore.rules` file)

### Step 4: Try Uploading Again

After deploying the rules, try uploading your survey again.

## What the Security Rules Do

Your `firestore.rules` file ensures:
- ✅ Only authenticated users can access data
- ✅ Users can only access their own data (user-scoped)
- ✅ No cross-user data access
- ✅ Complete data isolation and privacy

## Common Issues

### Issue: "User not authenticated"
**Solution**: Sign in using the user menu (top-right corner)

### Issue: "User ID mismatch"
**Solution**: This usually means security rules aren't deployed. Deploy them with `firebase deploy --only firestore:rules`

### Issue: Rules deployed but still getting errors
**Solution**: 
1. Sign out and sign back in to refresh your session
2. Check browser console (F12) for detailed error messages
3. Verify your Firebase project ID in `.env.local` matches the deployed project

## Diagnostic Information

When you see a permissions error, check the browser console (F12 → Console tab) for detailed diagnostic information including:
- Your user ID
- Authentication status
- Expected vs actual Firestore paths
- User ID mismatch detection

## Need Help?

If the issue persists after following these steps:
1. Check the browser console (F12) for detailed error messages
2. Verify your `.env.local` file has correct Firebase configuration
3. Ensure you're using the correct Firebase project
