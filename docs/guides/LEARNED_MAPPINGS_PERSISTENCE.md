# 🎯 Learned Mappings Persistence - Enterprise Strategy

## Overview

**Learned mappings are CRITICAL for year-over-year consistency** in compensation benchmarking. This document explains how learned mappings are stored and why they're guaranteed to persist.

## ✅ Current Implementation

### **Storage Strategy: IndexedDB Only**

**All learned mappings are ALWAYS stored in IndexedDB**, regardless of the app's storage mode configuration.

**Why IndexedDB?**
- ✅ **Browser-based persistence** - Survives browser restarts, app updates
- ✅ **No quota limits** - Unlike Firebase free tier
- ✅ **No external dependencies** - Works offline, no API calls
- ✅ **Fast and reliable** - Instant lookups, no network latency
- ✅ **Private and secure** - Data stays in user's browser

### **Code Implementation**

All learned mapping operations in `DataService.ts` **bypass the hybrid storage mode** and go directly to IndexedDB:

```typescript
// ALWAYS uses IndexedDB - never tries Firebase
async saveLearnedMapping(...) {
  return await this.indexedDB.saveLearnedMapping(...);
}

async getLearnedMappings(...) {
  return await this.indexedDB.getLearnedMappings(...);
}
```

## 📊 What Gets Stored

### **IndexedDB Object Stores**

The following object stores are created in IndexedDB:

- `learnedSpecialtyMappings` - Specialty name mappings
- `learnedColumnMappings` - Column name mappings  
- `learnedVariableMappings` - Variable name mappings
- `learnedRegionMappings` - Region name mappings
- `learnedProviderTypeMappings` - Provider type mappings

### **Data Structure**

Each learned mapping is stored with:

```typescript
{
  id: number,                    // Auto-increment ID
  original: string,              // Original name (lowercase, normalized)
  corrected: string,             // Standardized name
  providerType: string,          // 'PHYSICIAN', 'APP', 'ALL', etc.
  surveySource: string,          // 'MGMA', 'SullivanCotter', 'Custom', etc.
  createdAt: Date,               // When mapping was created
  updatedAt: Date                // When mapping was last updated
}
```

## 🔄 How Persistence Works

### **Year 1: Create Mappings**
1. User uploads survey data
2. User creates specialty mappings through UI
3. **System saves to IndexedDB** (browser storage)
4. Mappings persist in browser's IndexedDB

### **Year 2: Auto-Apply Mappings**
1. User uploads new survey
2. **System reads from IndexedDB** (instant, no API calls)
3. **Automatically applies learned mappings** to matching specialties
4. Only new specialties appear in unmapped list
5. User creates mappings for new specialties
6. **New mappings saved to IndexedDB** for Year 3

### **Year 3+**
- Same process repeats
- System gets smarter each year
- Fewer unmapped specialties over time

## 🛡️ Persistence Guarantees

### **What Persists**
- ✅ All learned mappings (specialty, column, variable, region, providerType)
- ✅ Provider type associations
- ✅ Survey source associations
- ✅ Creation and update timestamps

### **What Doesn't Persist**
- ❌ Survey data (stored separately, can be re-uploaded)
- ❌ Analytics results (recalculated from survey data)
- ❌ UI preferences (stored separately)

### **Persistence Duration**
- **IndexedDB data persists until:**
  - User clears browser data
  - User explicitly deletes the database
  - Browser storage quota is exceeded (rare, typically 50% of disk space)

## 🔧 Verification

### **Check Learned Mappings in Browser**

1. **Open Browser DevTools** (F12)
2. **Go to Application tab** (Chrome) or **Storage tab** (Firefox)
3. **Expand IndexedDB** → `SurveyAggregatorDB`
4. **Check object stores:**
   - `learnedSpecialtyMappings`
   - `learnedColumnMappings`
   - `learnedVariableMappings`
   - `learnedRegionMappings`
   - `learnedProviderTypeMappings`
5. **View stored mappings** - You should see all your learned mappings

### **Test Persistence**

1. **Create a mapping** in the UI
2. **Check IndexedDB** - Mapping should appear immediately
3. **Refresh the page** - Mapping should still be there
4. **Close and reopen browser** - Mapping should still be there
5. **Upload new survey** - Mapping should auto-apply

## 🚨 Important Notes

### **Browser-Specific Storage**
- Learned mappings are **stored per browser**
- Different browsers = different storage
- Same browser, different device = different storage
- **No cloud sync** (by design - ensures privacy and reliability)

### **Backup Strategy**
If you need to backup learned mappings:

1. **Export from IndexedDB** (using DevTools)
2. **Save as JSON file**
3. **Restore by importing** (if needed)

### **Migration from Firebase**
If you previously used Firebase for learned mappings:

1. **Current system automatically uses IndexedDB** (no migration needed)
2. **Old Firebase mappings are not migrated** (by design - IndexedDB is source of truth)
3. **Create new mappings** - They'll be saved to IndexedDB

## 📈 Best Practices

### **1. Create Mappings Early**
- Create mappings as soon as you encounter new specialties
- Don't wait until end of year
- System gets smarter with each mapping

### **2. Use Descriptive Names**
- `"Cardiology"` not `"Card"`
- `"Emergency Medicine"` not `"ER"`
- Makes mappings more reliable

### **3. Verify Mappings**
- Check "Learned Mappings" tab regularly
- Verify mappings are being saved
- Test with new survey upload

### **4. Don't Clear Browser Data**
- Avoid clearing IndexedDB unless necessary
- Learned mappings are stored there
- Clearing will require recreating mappings

## 🎯 Summary

**Learned mappings are GUARANTEED to persist** because:

1. ✅ **Always stored in IndexedDB** (never Firebase)
2. ✅ **Browser-based persistence** (survives restarts, updates)
3. ✅ **No quota limits** (unlike Firebase free tier)
4. ✅ **No external dependencies** (works offline)
5. ✅ **Automatic application** (no manual work needed)

**Your mappings will be there next year, and the year after, and forever** (until you clear browser data).

---

**Last Updated:** 2024
**Storage Mode:** IndexedDB Only (forced)
**Persistence:** Browser-based, permanent
