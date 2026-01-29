/**
 * Fix script for survey showing wrong provider type
 * This fixes surveys that were saved as APP but should be PHYSICIAN
 * Run this in browser console on localhost:3000
 */

(async function fixSurveyProviderType() {
  console.log('🔧 Fixing Survey Provider Type Issue...\n');

  try {
    // Open IndexedDB
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('SurveyAggregatorDB', 7);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    console.log('✅ Connected to IndexedDB\n');

    // Get all surveys
    const surveys = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    console.log(`📊 Found ${surveys.length} total surveys\n`);

    // Find SullivanCotter surveys that might be misclassified
    const sullivanSurveys = surveys.filter(s => {
      const name = (s.name || s.type || '').toLowerCase();
      return name.includes('sullivancotter') || 
             name.includes('sullivan cotter');
    });

    console.log(`🔍 Found ${sullivanSurveys.length} SullivanCotter survey(s)\n`);

    if (sullivanSurveys.length === 0) {
      console.log('❌ No SullivanCotter surveys found.\n');
      return;
    }

    // Check each survey
    const fixes = [];
    
    for (const survey of sullivanSurveys) {
      console.log(`\n📋 Checking: ${survey.name || survey.id}`);
      console.log(`   Current providerType: ${survey.providerType || 'MISSING'}`);
      console.log(`   Current dataCategory: ${survey.dataCategory || 'MISSING'}`);
      console.log(`   Survey name: ${survey.name || 'N/A'}`);
      console.log(`   Survey type: ${survey.type || 'N/A'}`);

      // Check if name says "APP" but should be "Physician"
      const name = (survey.name || '').toLowerCase();
      const type = (survey.type || '').toLowerCase();
      const providerType = (survey.providerType || '').toUpperCase();
      
      const nameSaysAPP = name.includes(' - app') || name.includes(' app ') || name.endsWith(' app');
      const typeSaysAPP = type.includes(' - app') || type.includes(' app ') || type.endsWith(' app');
      const providerTypeIsAPP = providerType === 'APP';
      
      // Check if this should be PHYSICIAN based on user's description
      // If name/type says APP but user uploaded as Physician, fix it
      const shouldBePhysician = nameSaysAPP || typeSaysAPP || providerTypeIsAPP;
      
      if (shouldBePhysician) {
        console.log(`   ⚠️ ISSUE FOUND: Survey appears to be classified as APP`);
        console.log(`   🔧 Will fix: Set providerType to PHYSICIAN and update name/type`);
        
        fixes.push({
          survey,
          reason: 'Survey saved as APP but should be PHYSICIAN',
          changes: {
            providerType: 'PHYSICIAN',
            dataCategory: survey.dataCategory || 'COMPENSATION',
            name: survey.name?.replace(/ - APP /gi, ' Physician ').replace(/ APP$/gi, ' Physician') || survey.name,
            type: survey.type?.replace(/ - APP /gi, ' Physician ').replace(/ APP$/gi, ' Physician') || survey.type
          }
        });
      } else {
        console.log(`   ✅ Survey looks correct`);
      }
    }

    // Apply fixes
    if (fixes.length > 0) {
      console.log(`\n\n🔧 Found ${fixes.length} survey(s) to fix. Applying changes...\n`);

      const transaction = db.transaction(['surveys'], 'readwrite');
      const store = transaction.objectStore('surveys');

      for (const fix of fixes) {
        console.log(`\n🔧 Fixing: ${fix.survey.name || fix.survey.id}`);
        
        // Apply changes
        fix.survey.providerType = fix.changes.providerType;
        fix.survey.dataCategory = fix.changes.dataCategory;
        
        // Update name if it contains "APP"
        if (fix.changes.name !== fix.survey.name) {
          console.log(`   📝 Updating name: "${fix.survey.name}" → "${fix.changes.name}"`);
          fix.survey.name = fix.changes.name;
        }
        
        // Update type if it contains "APP"
        if (fix.changes.type !== fix.survey.type) {
          console.log(`   📝 Updating type: "${fix.survey.type}" → "${fix.changes.type}"`);
          fix.survey.type = fix.changes.type;
        }
        
        // Save
        await new Promise((resolve, reject) => {
          const request = store.put(fix.survey);
          request.onsuccess = () => {
            console.log(`   ✅ Survey fixed successfully!`);
            resolve();
          };
          request.onerror = () => {
            console.error(`   ❌ Failed to update:`, request.error);
            reject(request.error);
          };
        });
      }

      console.log(`\n✅ All fixes applied!\n`);
      console.log('📝 Next steps:');
      console.log('   1. Refresh the page');
      console.log('   2. Change DATA VIEW dropdown from "APP" to "Physician"');
      console.log('   3. Your survey should now appear in the Physician data view\n');
    } else {
      console.log(`\n✅ No fixes needed. All surveys are correctly configured.\n`);
      console.log('💡 If data still doesn\'t show:');
      console.log('   1. Make sure DATA VIEW dropdown is set to "Physician" (not "APP")');
      console.log('   2. Check browser console for any errors');
      console.log('   3. Try clearing provider type detection cache:\n');
      console.log('      localStorage.removeItem("providerTypeDetectionCache");');
      console.log('      location.reload();\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
})();
