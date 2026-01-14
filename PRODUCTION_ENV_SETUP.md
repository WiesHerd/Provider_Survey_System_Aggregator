# Production Environment Variables Setup Guide

## Quick Verification Checklist

### Step 1: Verify Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to: **Settings** → **Environment Variables**
3. Verify the following variables are set:

#### Required Variables (if using Firebase)
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

#### Critical Production Variable
```
REACT_APP_REQUIRE_AUTH=true
```

#### Optional (Storage Mode)
```
REACT_APP_STORAGE_MODE=indexeddb  # or "firebase" or leave unset for hybrid
```

### Step 2: Verify Environment Variable Validation

The app already validates environment variables on startup. Check the browser console in production to see if validation passes.

### Step 3: Test Production Build Locally

```bash
# Set production environment variables
$env:NODE_ENV="production"
$env:REACT_APP_REQUIRE_AUTH="true"

# Build for production
npm run build:ci

# Serve locally to test
npx serve -s build
```

### Step 4: Verify Authentication Enforcement

1. Open production build in browser
2. Check that unauthenticated users are redirected to login
3. Verify `AuthGuard` is enforcing authentication

## Current Status

✅ **Environment Variable Validation**: Implemented in `src/shared/utils/envValidation.ts`  
✅ **Runtime Validation**: Runs on app startup in `App.tsx`  
✅ **AuthGuard**: Enforces authentication based on `REACT_APP_REQUIRE_AUTH`

## Next Steps After Verification

Once environment variables are verified:
1. ✅ Move to Input Sanitization Integration
2. ✅ Then tackle User Data Scoping
