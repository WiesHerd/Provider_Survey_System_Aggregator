# 🎯 Specialty Mapping Persistence Guide

## Overview
The system has a **3-layer mapping persistence architecture** that automatically applies your mappings to future survey uploads:

1. **Initial Mappings** (Seed Data) - Pre-defined common mappings
2. **Learned Mappings** (User-Created) - Mappings you create that get saved
3. **Auto-Mapping Results** (New Engine) - Results from the deterministic engine

## 🚀 How It Works

### When You Upload a New Survey:
1. **System checks existing mappings** in IndexedDB
2. **Automatically applies learned mappings** to matching specialty names
3. **Shows remaining unmapped specialties** for manual mapping
4. **New mappings you create are saved** for future uploads

### The Learning Process:
- ✅ **Create a mapping** → Saved to IndexedDB
- ✅ **Upload new survey** → Existing mappings automatically applied
- ✅ **Only new specialties** appear in unmapped list
- ✅ **System gets smarter** with each mapping you create

## 🛠️ Methods to Create Initial Mappings

### Method 1: Add to Seed Data (Recommended)
**Best for**: Common mappings that should be available to all users

1. **Edit** `src/data/initialSpecialtyMappings.ts`
2. **Add your mappings** following the existing pattern
3. **Restart the app** to load new mappings

```typescript
{
  id: '14',
  standardizedName: 'Your Specialty',
  sourceSpecialties: [
    {
      id: '14a',
      specialty: 'MGMA Name',
      originalName: 'MGMA Name',
      surveySource: 'MGMA',
      frequency: 1,
      mappingId: '14'
    },
    {
      id: '14b',
      specialty: 'SullivanCotter Name',
      originalName: 'SullivanCotter Name',
      surveySource: 'SullivanCotter',
      frequency: 1,
      mappingId: '14'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}
```

### Method 2: Use the Bulk Creator Script
**Best for**: Creating many mappings at once

```bash
# Run the script
npx ts-node scripts/create-initial-mappings.ts

# Copy the generated code to your mappings file
```

### Method 3: Create Through UI (Coming Soon)
**Best for**: Interactive mapping creation

The `BulkMappingCreator` component will be integrated into the specialty mapping screen.

### Method 4: Manual Creation Through UI
**Best for**: One-off mappings

1. **Go to Specialty Mapping screen**
2. **Create mappings** using the existing UI
3. **Mappings are automatically saved** to IndexedDB
4. **Future uploads will use these mappings**

## 📊 What Gets Saved

### In IndexedDB:
- **`specialtyMappings`** - Your created mappings
- **`learnedSpecialtyMappings`** - Auto-learned mappings
- **`specialtyMappingSources`** - Source specialty details

### Mapping Structure:
```typescript
{
  id: string;                    // Unique identifier
  standardizedName: string;      // Your chosen name
  sourceSpecialties: [           // All variations
    {
      specialty: string;         // Original survey name
      surveySource: string;      // Which survey (MGMA, etc.)
      frequency: number;         // How often it appears
    }
  ],
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔄 How Future Uploads Work

### Automatic Application:
1. **New survey uploaded** → System scans specialty names
2. **Checks existing mappings** → Finds matches
3. **Auto-applies mappings** → No manual work needed
4. **Shows only new specialties** → In unmapped list

### Example Workflow:
```
Upload 1: Create mapping "Cardiology" → "Cardiovascular Disease"
Upload 2: Survey has "Cardiovascular Disease" → Automatically mapped to "Cardiology"
Upload 3: Survey has "Heart Disease" → Appears in unmapped (new variation)
```

## 🎯 Best Practices

### 1. Start with Common Specialties
- Create mappings for the most frequent specialties first
- Focus on variations you see across multiple surveys

### 2. Use Descriptive Standardized Names
- `"Cardiology"` not `"Card"`
- `"Emergency Medicine"` not `"ER"`
- `"Obstetrics and Gynecology"` not `"OB/GYN"`

### 3. Include All Variations
- Add all the different ways each specialty appears
- Include abbreviations, full names, and variations

### 4. Test Your Mappings
- Upload a test survey after creating mappings
- Verify that your mappings are automatically applied
- Adjust as needed

## 🚨 Important Notes

### Persistence:
- ✅ **Mappings persist** across browser sessions
- ✅ **Survive app updates** (stored in IndexedDB)
- ✅ **Work across surveys** (not survey-specific)

### Limitations:
- ⚠️ **Browser-specific** (mappings don't sync across devices)
- ⚠️ **No cloud backup** (local storage only)
- ⚠️ **Manual management** (no automatic cleanup)

### Performance:
- ✅ **Fast lookup** (IndexedDB is optimized)
- ✅ **Cached results** (mappings are cached for speed)
- ✅ **Minimal impact** (only loads when needed)

## 🔧 Troubleshooting

### Mappings Not Applied:
1. **Check IndexedDB** - Open DevTools → Application → IndexedDB
2. **Verify mapping structure** - Ensure all required fields are present
3. **Check specialty names** - Exact match required (case-sensitive)

### Performance Issues:
1. **Clear old mappings** - Use "Clear All" if needed
2. **Check mapping count** - Too many mappings can slow things down
3. **Restart app** - Sometimes helps with caching issues

### Data Loss:
1. **Export mappings** - Consider backing up important mappings
2. **Document changes** - Keep track of what you've mapped
3. **Test regularly** - Verify mappings work as expected

## 🎉 Success Indicators

You'll know the system is working when:
- ✅ **New surveys upload faster** (fewer unmapped specialties)
- ✅ **Consistent naming** across all your surveys
- ✅ **Less manual mapping** required over time
- ✅ **Mappings appear in "Mapped Specialties" tab**

## 📈 Next Steps

1. **Create your first mappings** using Method 1 or 4
2. **Upload a test survey** to verify they work
3. **Add more mappings** as you encounter new specialties
4. **Enjoy the time savings** as the system gets smarter!

---

**Remember**: Every mapping you create makes future uploads faster and more consistent! 🚀
