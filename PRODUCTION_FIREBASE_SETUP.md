# Production Firebase Setup Guide

## ⚠️ Important: Production vs Development

Your `.env.local` file **only works in development**. For production on Firebase Hosting, you need to set environment variables **before building**.

## 🎯 Current Situation

- ✅ **Development**: `.env.local` is set up and working
- ❌ **Production**: Environment variables are NOT set, so it defaults to IndexedDB

## 🚀 Solution: Set Environment Variables for Production Build

### Option 1: Build with Environment Variables (Recommended)

Create a build script that sets environment variables before building:

```bash
# Windows PowerShell
$env:REACT_APP_FIREBASE_API_KEY="your_api_key"
$env:REACT_APP_FIREBASE_AUTH_DOMAIN="provider-survey-aggregator.firebaseapp.com"
$env:REACT_APP_FIREBASE_PROJECT_ID="provider-survey-aggregator"
$env:REACT_APP_FIREBASE_STORAGE_BUCKET="provider-survey-aggregator.firebasestorage.app"
$env:REACT_APP_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
$env:REACT_APP_FIREBASE_APP_ID="your_app_id"
$env:REACT_APP_STORAGE_MODE="firebase"
npm run build
firebase deploy --only hosting
```

### Option 2: Create `.env.production` File

Create a `.env.production` file in your project root (this gets used automatically for production builds):

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=provider-survey-aggregator.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=provider-survey-aggregator
REACT_APP_FIREBASE_STORAGE_BUCKET=provider-survey-aggregator.firebasestorage.app
REACT_APP_FIREBASE_MESSAGAGE_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_STORAGE_MODE=firebase
```

Then build and deploy:
```bash
npm run build
firebase deploy --only hosting
```

### Option 3: Use Firebase Functions Config (Advanced)

If you're using Firebase Functions, you can store config there, but for static hosting, Option 1 or 2 is simpler.

## 📋 Step-by-Step: Deploy to Production with Firebase Storage

### Step 1: Get Your Firebase Config Values

Your `.env.local` file already has these. Copy them to create `.env.production`:

```bash
# Copy values from .env.local (don't copy the file, just the values)
# Or run this to see them (masked):
Get-Content .env.local | Select-String "REACT_APP_"
```

### Step 2: Create `.env.production` File

Create `.env.production` with the same values as `.env.local`:

```env
REACT_APP_FIREBASE_API_KEY=<copy from .env.local>
REACT_APP_FIREBASE_AUTH_DOMAIN=<copy from .env.local>
REACT_APP_FIREBASE_PROJECT_ID=provider-survey-aggregator
REACT_APP_FIREBASE_STORAGE_BUCKET=<copy from .env.local>
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<copy from .env.local>
REACT_APP_FIREBASE_APP_ID=<copy from .env.local>
REACT_APP_STORAGE_MODE=firebase
```

### Step 3: Build with Production Environment

```bash
npm run build
```

This will automatically use `.env.production` if it exists.

### Step 4: Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### Step 5: Verify Production Deployment

1. Visit: https://provider-survey-aggregator.firebaseapp.com/upload
2. Sign in to your app
3. Check the storage status indicator - it should show "Firebase (Cloud)"
4. Upload a test file
5. Verify in Firebase Console → Firestore → `users/{your-user-id}/surveys`

## 🔍 How to Verify It's Working

After deployment, check:

1. **Storage Status Indicator**: Should show "Firebase (Cloud)" in green
2. **Browser Console**: Should show Firebase initialization messages
3. **Firebase Console**: Data should appear in Firestore

## ⚠️ Security Note

**IMPORTANT**: `.env.production` will be committed to git if you're not careful. 

**Better approach**: Use environment variables in your build script or CI/CD pipeline instead of committing `.env.production`.

## 🛠️ Automated Build Script

Create `scripts/build-production.ps1`:

```powershell
# Build Production Script
# This script builds the app with Firebase environment variables

# Load environment variables from .env.local
$envFile = ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^REACT_APP_') {
            $key, $value = $_ -split '=', 2
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

Write-Host "Building for production with Firebase config..."
npm run build

Write-Host "Build complete. Deploy with: firebase deploy --only hosting"
```

Then use:
```bash
.\scripts\build-production.ps1
firebase deploy --only hosting
```

## 📝 Quick Reference

**Development (localhost)**:
- Uses `.env.local` ✅ (already set up)

**Production (Firebase Hosting)**:
- Needs `.env.production` OR environment variables set before build
- Currently: ❌ Not configured (defaults to IndexedDB)

**After Setup**:
- ✅ Production will use Firebase storage
- ✅ Users can upload and see data in Firebase Console





