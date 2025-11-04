# 🧠 Learned Mappings - How It Works

## The Issue You Experienced

When you manually mapped specialties (deleted from mapped specialties, then selected and mapped them), **nothing appeared in the "Learned Mappings" tab**. This was a bug in the system.

## What I Fixed

I updated the mapping creation functions to **automatically save learned mappings** when you create any mapping through the UI.

### Before (Broken):
- ✅ Created mappings appeared in "Mapped Specialties" tab
- ❌ **Nothing appeared in "Learned Mappings" tab**
- ❌ Mappings weren't saved for future use

### After (Fixed):
- ✅ Created mappings appear in "Mapped Specialties" tab
- ✅ **Mappings also appear in "Learned Mappings" tab**
- ✅ Mappings are saved for future survey uploads

## How It Works Now

### When You Create a Mapping:

1. **Select specialties** in the unmapped list
2. **Click "Map Specialties"** button
3. **System creates two things**:
   - **Complex mapping** → Goes to "Mapped Specialties" tab
   - **Simple learned mapping** → Goes to "Learned Mappings" tab

### The Two Types of Mappings:

#### **Mapped Specialties Tab** (Complex):
- Full mapping objects with metadata
- Shows source specialties, survey sources, creation dates
- Used for detailed mapping management

#### **Learned Mappings Tab** (Simple):
- Simple key-value pairs: `"Original Name" → "Standardized Name"`
- Used for automatic application to future uploads
- Shows what the system has "learned" from your mappings

## What You'll See Now

### After Creating a Mapping:

1. **Go to "Mapped Specialties" tab** → See your detailed mappings
2. **Go to "Learned Mappings" tab** → See the simple learned mappings
3. **Upload a new survey** → Learned mappings are automatically applied

### Example:

If you map:
- `"Cardiology - Cardiac Imaging"` → `"Cardiology"`

You'll see:
- **Mapped Specialties**: Full mapping with metadata
- **Learned Mappings**: `"cardiology - cardiac imaging" → "Cardiology"`

## Why This Matters

### For Future Uploads:
- ✅ **Automatic application** - Learned mappings are applied automatically
- ✅ **Time savings** - No need to re-map the same specialties
- ✅ **Consistency** - Same specialty names across all surveys

### For System Learning:
- ✅ **Gets smarter** - Each mapping teaches the system
- ✅ **Builds knowledge** - Accumulates mapping decisions over time
- ✅ **Reduces manual work** - More mappings = less manual work

## Testing the Fix

1. **Create a new mapping** (select specialties and map them)
2. **Check "Learned Mappings" tab** - You should now see entries
3. **Upload a new survey** - Learned mappings should be automatically applied

## The Fix Details

I modified two functions in `src/features/mapping/hooks/useMappingData.ts`:

### `createMapping()` function:
```typescript
// Also save as a learned mapping for future use
await dataService.saveLearnedMapping('specialty', specialty.name, specialty.name);

// Refresh learned mappings to show the new ones
const learnedData = await dataService.getLearnedMappings('specialty');
setLearnedMappings(learnedData);
```

### `createGroupedMapping()` function:
```typescript
// Also save learned mappings for each specialty in the group
for (const specialty of selectedSpecialties) {
  await dataService.saveLearnedMapping('specialty', specialty.name, standardizedName);
}

// Refresh learned mappings to show the new ones
const learnedData = await dataService.getLearnedMappings('specialty');
setLearnedMappings(learnedData);
```

## Result

Now when you create mappings through the UI, they will:
- ✅ Appear in "Mapped Specialties" tab (as before)
- ✅ **Appear in "Learned Mappings" tab (NEW!)**
- ✅ Be automatically applied to future survey uploads
- ✅ Make the system smarter over time

The "Learned Mappings" tab will no longer be empty after you create mappings! 🎉
