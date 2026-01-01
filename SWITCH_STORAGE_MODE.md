# How to Switch Between IndexedDB and Firebase Storage

## 🎯 Hybrid Storage Mode (Recommended)

The app now uses **Hybrid Storage Mode** by default, which automatically selects the best storage backend:

- **If Firebase is configured** → Uses Firebase (cloud storage)
- **If Firebase is not configured** → Uses IndexedDB (local browser storage)
- **If Firebase fails** → Automatically falls back to IndexedDB

This ensures the app **always works**, whether on Vercel (IndexedDB) or with Firebase cloud storage.

## 🔄 Quick Switch Guide

### Use Hybrid Mode (Recommended - Default)

**Don't set `REACT_APP_STORAGE_MODE`** - the app will automatically:
- Use Firebase if configured and available
- Use IndexedDB if Firebase is not configured
- Fallback to IndexedDB if Firebase fails

This is the recommended approach for maximum flexibility.

### Force IndexedDB Only

Edit `.env.local` or `.env.production`:
```env
REACT_APP_STORAGE_MODE=indexeddb
```

Then rebuild and deploy:
```bash
npm run build
# Deploy to Vercel or Firebase Hosting
```

**Use when:**
- Deploying to Vercel (no backend needed)
- Avoiding Firebase costs/quota
- Data doesn't need cloud sync
- Single-device usage

### Force Firebase Only

Edit `.env.local` or `.env.production`:
```env
REACT_APP_STORAGE_MODE=firebase
```

**Important:** You must also configure Firebase credentials (see `env.example`)

Then rebuild and deploy:
```bash
npm run build
# Deploy to Vercel or Firebase Hosting
```

**Use when:**
- Multi-device sync needed
- Cloud backup required
- Team collaboration
- After upgrading to Firebase Blaze plan

## ⚠️ Important Notes

1. **Must rebuild** after changing storage mode
2. **Must redeploy** for production changes to take effect
3. **Firebase requires authentication** - users must sign in
4. **Firebase requires Blaze plan** for production (to avoid quota limits)
5. **IndexedDB is local only** - data stays in browser, not synced to cloud
6. **Hybrid mode** - IndexedDB is always initialized for seamless fallback

## 🎯 When to Use Each Mode

### Hybrid Mode (Default - Recommended)
- ✅ **Best of both worlds** - automatic selection
- ✅ **Works on Vercel** - falls back to IndexedDB if Firebase unavailable
- ✅ **Seamless fallback** - if Firebase fails, uses IndexedDB automatically
- ✅ **No configuration needed** - just works

### IndexedDB Only
- ✅ Testing locally
- ✅ Avoiding Firebase costs/quota
- ✅ Data doesn't need cloud sync
- ✅ Single-device usage
- ✅ Vercel deployment (no backend)

### Firebase Only
- ✅ Production deployment with cloud sync
- ✅ Multi-device sync needed
- ✅ Cloud backup required
- ✅ Team collaboration
- ✅ After upgrading to Blaze plan

## 🔍 Verify Storage Mode

After deployment, check the upload screen:
- **Green alert "Firebase (Cloud)"** = Using Firebase
- **Blue alert "IndexedDB (Local)"** = Using IndexedDB

Check browser console for storage mode detection logs:
- `💾 Hybrid mode: Using Firebase` = Firebase detected and active
- `💾 Hybrid mode: Using IndexedDB` = IndexedDB active (Firebase not configured)

## 📚 More Information

See `HYBRID_STORAGE_GUIDE.md` for detailed documentation on the hybrid storage system.





