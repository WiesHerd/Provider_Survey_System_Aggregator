# Commit & Deploy Guide - Production Readiness Updates

## ✅ What Needs to Be Committed

### Critical Security Changes (MUST COMMIT)
These are important security improvements that should be committed:

1. **User Data Scoping** ✅
   - `src/services/IndexedDBService.ts` - User-scoped data storage
   - `src/services/UserScopedMigrationService.ts` - Migration service
   - `src/App.tsx` - Migration check on startup

2. **Input Sanitization** ✅
   - `src/components/DataPreview.tsx` - XSS protection
   - `src/features/regional/components/RegionalComparison.tsx` - XSS protection

### Documentation (OPTIONAL - But Recommended)
- `PRODUCTION_READINESS_AUDIT.md`
- `USER_DATA_SCOPING_IMPLEMENTATION.md`
- `INPUT_SANITIZATION_IMPLEMENTATION.md`
- `FIREBASE_INDEXEDDB_USER_SCOPING_ALIGNMENT.md`
- `PRODUCTION_READINESS_ACTION_PLAN.md`
- `PRODUCTION_ENV_SETUP.md`

### Other Changes (Review First)
- Other modified files (mapping components, upload components, etc.)
- Deleted files (GeminiMappingTest.tsx, GeminiMappingService.ts)

## 🚀 What Needs to Be Deployed

### 1. Code Changes → Build & Deploy App ✅

**Option A: Deploy to Firebase Hosting** (if using Firebase)
```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

**Option B: Deploy to Vercel** (if keeping Vercel)
```bash
# Build the app
npm run build

# Deploy to Vercel (if connected to GitHub, auto-deploys on push)
git push origin main
# OR manually:
vercel --prod
```

### 2. Firestore Security Rules → Deploy Rules ✅

**CRITICAL**: Deploy Firestore security rules to protect your data:

```bash
# Deploy only security rules (not hosting)
firebase deploy --only firestore:rules
```

**Why this is important:**
- Your `firestore.rules` file has user-scoped security rules
- These rules ensure users can only access their own data
- Without deploying rules, Firebase uses default (less secure) rules

## 📋 Step-by-Step: Commit & Deploy

### Step 1: Review Changes
```bash
git status
git diff src/services/IndexedDBService.ts
git diff src/components/DataPreview.tsx
```

### Step 2: Stage Critical Changes
```bash
# Stage security-critical files
git add src/services/IndexedDBService.ts
git add src/services/UserScopedMigrationService.ts
git add src/App.tsx
git add src/components/DataPreview.tsx
git add src/features/regional/components/RegionalComparison.tsx

# Stage documentation (optional)
git add PRODUCTION_READINESS_AUDIT.md
git add USER_DATA_SCOPING_IMPLEMENTATION.md
git add INPUT_SANITIZATION_IMPLEMENTATION.md
git add FIREBASE_INDEXEDDB_USER_SCOPING_ALIGNMENT.md

# Review other changes before staging
git status
```

### Step 3: Commit
```bash
git commit -m "feat: Add user data scoping and input sanitization for production

- Implement user-scoped data storage in IndexedDB
- Add automatic migration for existing data
- Add input sanitization to prevent XSS attacks
- Update DataPreview and RegionalComparison components
- Add production readiness documentation"
```

### Step 4: Push to GitHub
```bash
git push origin main
```

### Step 5: Deploy Firestore Rules (CRITICAL)
```bash
# Deploy security rules to Firebase
firebase deploy --only firestore:rules
```

### Step 6: Deploy App (Choose One)

**If using Firebase Hosting:**
```bash
npm run build
firebase deploy --only hosting
```

**If using Vercel:**
- Auto-deploys on push to main (if connected)
- OR manually: `vercel --prod`

## ⚠️ Important Notes

### What NOT to Commit
- `.env.local` - Contains sensitive API keys (already in .gitignore)
- `.env.production` - Contains production keys (should be in .gitignore)
- `build/` folder - Build output (already in .gitignore)
- `.firebase/hosting.YnVpbGQ.cache` - Firebase cache (can be committed, but not critical)

### Before Deploying

1. **Test Locally First**:
   ```bash
   npm run build
   npx serve -s build
   # Test the app in production build
   ```

2. **Verify Environment Variables**:
   - Check that Firebase env vars are set in production
   - Verify `REACT_APP_REQUIRE_AUTH=true` in production (if needed)

3. **Check Firestore Rules**:
   - Review `firestore.rules` to ensure they're correct
   - Deploy rules before deploying app

## 🎯 Quick Answer

**YES, you should commit and deploy:**

1. ✅ **Commit**: Security changes (user scoping, sanitization)
2. ✅ **Deploy Firestore Rules**: `firebase deploy --only firestore:rules`
3. ✅ **Deploy App**: Build and deploy to Firebase Hosting OR Vercel

**Priority:**
1. **High**: Deploy Firestore security rules (protects your data)
2. **High**: Commit and deploy code changes (security improvements)
3. **Medium**: Deploy documentation (helpful but not critical)

---

**Ready to commit?** I can help you stage and commit the changes!
