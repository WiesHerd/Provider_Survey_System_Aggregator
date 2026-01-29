# Hybrid Mode Guide - Offline-First Storage with Optional Cloud Sync

## 🎯 Overview

Your app now runs in **Hybrid Mode** by default, which provides:
- ✅ **Offline-first storage** using IndexedDB (browser-based, always available)
- ✅ **Works without authentication** - Upload surveys and analyze data immediately
- ✅ **Optional Firebase cloud sync** - Sign in to enable cloud backup and sync
- ✅ **No quota issues** - IndexedDB has much higher storage limits than Firebase free tier

---

## 🚀 What Changed

### Before (Firebase-Only Mode)
```
❌ Required Firebase authentication to use the app
❌ "No provider data available" when not signed in
❌ Firebase quota limits could block uploads
❌ App unusable when Firebase had issues
```

### After (Hybrid Mode - Default)
```
✅ App works immediately without authentication
✅ Data stored locally in IndexedDB (browser storage)
✅ Sign in optional - enables Firebase cloud sync
✅ No quota issues - IndexedDB has higher limits
✅ Fast, reliable, offline-capable
```

---

## 📁 Storage Modes Explained

### 1. Hybrid Mode (Default - Recommended)
**Configuration:** Remove or comment out `REACT_APP_STORAGE_MODE` in `.env.local`

```env
# .env.local
# REACT_APP_STORAGE_MODE=firebase  # <-- COMMENTED OUT for hybrid mode
```

**How it works:**
- Primary storage: **IndexedDB** (local browser storage)
- Firebase: **Optional** for cloud sync when authenticated
- No authentication required to use the app
- Sign in anytime to enable cloud backup

**Use cases:**
- ✅ Development and testing
- ✅ Single-user workflows
- ✅ Offline-first requirements
- ✅ Avoiding Firebase quota limits

---

### 2. Firebase-Only Mode (Explicit)
**Configuration:** Set `REACT_APP_STORAGE_MODE=firebase` in `.env.local`

```env
# .env.local
REACT_APP_STORAGE_MODE=firebase  # <-- EXPLICIT Firebase mode
```

**How it works:**
- Primary storage: **Firebase Firestore** (cloud storage)
- Authentication: **Required** before using the app
- All data stored in cloud with user isolation
- Requires stable internet connection

**Use cases:**
- ✅ Multi-user teams with shared data
- ✅ Production deployments
- ✅ When cloud backup is mandatory
- ✅ User-scoped data isolation required

---

## 🔄 How to Sync Data Between IndexedDB and Firebase

### Scenario 1: Pull Data from Firebase (Cloud → Local)

When you sign in, you can pull your cloud data to local storage:

1. **Sign in** to Firebase (if not already signed in)
2. Go to **System Settings** (⚙️ icon in top navigation)
3. Click **"Sync from Cloud"** button
4. Wait for sync to complete
5. Your local IndexedDB now has all cloud data

```
Cloud (Firebase) → Local (IndexedDB)
```

This is useful when:
- Switching devices or browsers
- Recovering data from cloud backup
- Refreshing local data with latest cloud version

---

### Scenario 2: Push Data to Firebase (Local → Cloud)

Currently, uploads in hybrid mode save to IndexedDB by default. To push to Firebase:

**Option A: Switch to Firebase Mode**
1. Update `.env.local`: `REACT_APP_STORAGE_MODE=firebase`
2. Restart app (`npm start`)
3. Sign in
4. Upload surveys (will save to Firebase directly)

**Option B: Manual Export/Import** (Recommended for backups)
1. System Settings → **"Export All Data"**
2. Save JSON file (your backup)
3. Switch to Firebase mode (Option A)
4. Import data (future feature)

---

## 🛠 System Settings Features

### Storage Mode Indicator
Shows current storage mode and Firebase sync availability:

```
✅ Offline-First (IndexedDB)
☁️ Firebase configured - Sign in to enable cloud sync
```

When signed in:
```
✅ Offline-First (IndexedDB) + Cloud Sync Available
Last synced: [timestamp]
```

### Sync from Cloud Button
**Only visible when:**
- Firebase is configured (`.env.local` has Firebase credentials)
- User is signed in

**What it does:**
- Pulls all surveys, mappings, and data from Firebase
- Overwrites local IndexedDB with cloud data
- Shows progress bar during sync
- Updates "Last synced" timestamp

### Export All Data
**Always available** - works in both modes

**What it does:**
- Exports all surveys and mappings as JSON
- Creates backup file: `benchpoint-data-YYYY-MM-DD.json`
- Useful for:
  - Manual backups
  - Migrating between devices
  - Data recovery

### Clear All Data
**Always available** - works in both modes

**What it does:**
- Deletes all data from **IndexedDB only**
- Does NOT delete Firebase cloud data
- Shows confirmation before deleting
- Creates export before clearing (recommended)

---

## 🔐 Authentication in Hybrid Mode

### No Authentication Required
By default, the app works without signing in:
- Upload surveys
- Create mappings
- Run analytics
- Export data

All data stored locally in browser (IndexedDB).

### Optional Authentication
Sign in to enable:
- ✅ Cloud backup to Firebase
- ✅ Sync data across devices
- ✅ Share data with team (future feature)
- ✅ Audit logs (Firebase-only feature)

### How to Sign In
1. Navigate to any page in the app
2. Click user icon in top-right (if available)
3. Or, set `REACT_APP_STORAGE_MODE=firebase` to force login screen
4. Sign in with email/password or Google

---

## 📊 Data Storage Comparison

| Feature | IndexedDB (Hybrid Mode) | Firebase (Cloud Mode) |
|---------|------------------------|----------------------|
| **Storage Limit** | ~100 MB - 1 GB+ (browser-dependent) | 1 GB free tier (pay-as-you-go) |
| **Speed** | Very Fast (local) | Moderate (network dependent) |
| **Offline Access** | ✅ Full | ❌ Limited |
| **Authentication** | ❌ Not required | ✅ Required |
| **Multi-Device Sync** | ❌ Manual | ✅ Automatic |
| **Data Backup** | Manual export | ✅ Automatic cloud backup |
| **Quota Errors** | ❌ Rare | ⚠️ Possible on free tier |
| **User Isolation** | ❌ Single browser | ✅ Per-user isolation |

---

## 🚨 Important Notes

### 1. Browser Storage Limits
- IndexedDB stores data **per browser, per device**
- Clearing browser data deletes IndexedDB
- **Always export backups** before clearing browser cache

### 2. Learned Mappings
- **Always stored in IndexedDB** (even in Firebase mode)
- Persist across years and survey uploads
- Not affected by Firebase quota issues
- Export backups to preserve learned mappings

### 3. Firebase Quota Management
If you hit Firebase quota limits:
1. Switch to hybrid mode (remove `REACT_APP_STORAGE_MODE`)
2. Restart app
3. Continue working with IndexedDB (no quota limits)
4. Upgrade Firebase plan for production use

### 4. Data Migration
To migrate from Firebase-only to Hybrid mode:
1. **While in Firebase mode**, export all data (System Settings)
2. Switch to hybrid mode (comment out `REACT_APP_STORAGE_MODE`)
3. Restart app
4. **While signed in**, use "Sync from Cloud" to pull Firebase data
5. Verify data in local IndexedDB
6. Export backup for safety

---

## 🎓 Best Practices

### Development & Testing
```env
# .env.local - Development setup
# REACT_APP_STORAGE_MODE=firebase  # <-- COMMENTED OUT
# Use hybrid mode for fast iteration
```

### Production Deployment
```env
# .env.local - Production setup
REACT_APP_STORAGE_MODE=firebase  # <-- EXPLICIT Firebase mode
# Require authentication and cloud storage
```

### Backup Strategy
1. **Daily exports** in hybrid mode (System Settings → Export All Data)
2. **Weekly sync** to Firebase (if signed in)
3. Store exported JSON files in safe location
4. Test restore process periodically

---

## 🐛 Troubleshooting

### "No provider data available" Error
**Cause:** App was in Firebase mode, but user is not authenticated

**Solution:**
1. Check `.env.local` - Is `REACT_APP_STORAGE_MODE=firebase` set?
2. If yes, **remove or comment out** that line
3. Restart app (`npm start`)
4. App will use IndexedDB (hybrid mode) and load local data

### Sync Button Not Showing
**Cause:** Firebase not configured or user not signed in

**Solution:**
1. Check `.env.local` has Firebase credentials
2. Sign in to Firebase
3. Sync button should appear in System Settings

### Data Not Persisting
**Cause:** Browser clearing IndexedDB automatically

**Solution:**
1. Check browser storage settings
2. Disable "Clear data on exit" for this site
3. Use Firefox/Chrome with persistent storage
4. Enable Firebase sync for cloud backup

### Firebase Quota Exceeded
**Cause:** Free tier limits reached

**Solution:**
1. Switch to hybrid mode (remove `REACT_APP_STORAGE_MODE`)
2. Continue with IndexedDB (no quota limits)
3. Upgrade Firebase plan to pay-as-you-go
4. Or, use hybrid mode permanently

---

## 📞 Getting Help

### Quick Checklist
- [ ] `.env.local` configured correctly
- [ ] Firebase credentials present (if using cloud sync)
- [ ] Browser allows IndexedDB storage
- [ ] Regular data exports for backup
- [ ] Understand current storage mode (check System Settings)

### Storage Mode Detection
The app shows current storage mode in:
1. Upload screen (Storage Status Indicator)
2. System Settings (Storage Mode Info)
3. Console logs (search for "Storage mode")

---

## 🎉 Summary

**Your app now defaults to Hybrid Mode:**
- ✅ Works immediately without authentication
- ✅ Data stored locally in IndexedDB (fast, reliable)
- ✅ Optional Firebase cloud sync when signed in
- ✅ No quota issues with IndexedDB
- ✅ Best of both worlds - offline-first with cloud backup option

**Next Steps:**
1. Restart your app (`npm start`)
2. App will use IndexedDB by default
3. Upload surveys and verify data loads
4. Sign in to enable Firebase sync (optional)
5. Check System Settings to see storage mode indicator

Your app is now ready to use! 🚀
