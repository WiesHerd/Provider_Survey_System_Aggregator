/**
 * Fix script for Physician survey data not showing in data view
 * Run this in browser console to diagnose and fix common issues
 */

(async function fixPhysicianSurvey() {
  console.log('🔧 Starting Physician Survey Diagnostic and Fix...\n');

  try {
    // Step 1: Open IndexedDB
    const dbName = 'SurveyAggregatorDB';
    const dbVersion = 7;
    
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        console.warn('⚠️ Database upgrade needed');
      };
    });

    console.log('✅ Connected to IndexedDB\n');

    // Step 2: Get all surveys
    const surveys = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    console.log(`📊 Found ${surveys.length} total surveys\n`);

    // Step 3: Find SullivanCotter surveys
    const sullivanSurveys = surveys.filter(s => {
      const name = (s.name || s.type || '').toLowerCase();
      return name.includes('sullivancotter') || 
             name.includes('sullivan cotter') || 
             name.includes('sullivan-cotter');
    });

    console.log(`🔍 Found ${sullivanSurveys.length} SullivanCotter survey(s)\n`);

    if (sullivanSurveys.length === 0) {
      console.log('❌ No SullivanCotter surveys found. Make sure you uploaded the survey.\n');
      return;
    }

    // Step 4: Check each survey and identify issues
    const issues = [];
    const fixes = [];

    for (const survey of sullivanSurveys) {
      console.log(`\n📋 Checking survey: ${survey.name || survey.id}`);
      console.log(`   ID: ${survey.id}`);
      console.log(`   Provider Type: ${survey.providerType || 'MISSING'}`);
      console.log(`   Data Category: ${survey.dataCategory || 'MISSING'}`);
      console.log(`   Type: ${survey.type || 'MISSING'}`);
      console.log(`   Year: ${survey.year || survey.surveyYear || 'MISSING'}`);

      const problems = [];
      const fixActions = [];

      // Check 1: Provider Type
      const providerType = (survey.providerType || '').toUpperCase().trim();
      if (!providerType || (providerType !== 'PHYSICIAN' && providerType !== 'STAFF PHYSICIAN' && providerType !== 'STAFFPHYSICIAN')) {
        problems.push(`Provider Type is "${survey.providerType || 'MISSING'}" but should be "PHYSICIAN"`);
        fixActions.push(() => {
          survey.providerType = 'PHYSICIAN';
          console.log(`   ✅ Will fix: Set providerType to "PHYSICIAN"`);
        });
      }

      // Check 2: Data Category
      const dataCategory = survey.dataCategory;
      if (!dataCategory || (dataCategory !== 'COMPENSATION' && dataCategory !== 'CUSTOM')) {
        problems.push(`Data Category is "${dataCategory || 'MISSING'}" but should be "COMPENSATION"`);
        fixActions.push(() => {
          survey.dataCategory = 'COMPENSATION';
          console.log(`   ✅ Will fix: Set dataCategory to "COMPENSATION"`);
        });
      }

      // Check 3: Effective Provider Type (for Physician view)
      let effectiveProviderType;
      if (dataCategory === 'CALL_PAY') {
        effectiveProviderType = 'CALL';
      } else if (dataCategory === 'MOONLIGHTING') {
        effectiveProviderType = survey.providerType || 'PHYSICIAN';
      } else if (dataCategory === 'CUSTOM') {
        effectiveProviderType = survey.providerType || 'CUSTOM';
      } else {
        effectiveProviderType = survey.providerType || 'PHYSICIAN';
      }

      const shouldShowInPhysicianView = 
        effectiveProviderType === 'PHYSICIAN' && 
        dataCategory !== 'CALL_PAY' && 
        dataCategory !== 'MOONLIGHTING' &&
        (dataCategory === 'COMPENSATION' || !dataCategory);

      if (!shouldShowInPhysicianView) {
        problems.push(`Survey will NOT show in Physician view (effectiveProviderType: ${effectiveProviderType}, dataCategory: ${dataCategory})`);
      } else {
        console.log(`   ✅ Survey should show in Physician view`);
      }

      if (problems.length > 0) {
        console.log(`\n   ⚠️ Issues found:`);
        problems.forEach(p => console.log(`      - ${p}`));
        issues.push({ survey, problems, fixActions });
      } else {
        console.log(`   ✅ No issues found - survey should be visible`);
      }
    }

    // Step 5: Apply fixes if any
    if (issues.length > 0) {
      console.log(`\n\n🔧 Found ${issues.length} survey(s) with issues. Applying fixes...\n`);

      const transaction = db.transaction(['surveys'], 'readwrite');
      const store = transaction.objectStore('surveys');

      for (const { survey, fixActions } of issues) {
        console.log(`\n🔧 Fixing survey: ${survey.name || survey.id}`);
        
        // Apply all fix actions
        fixActions.forEach(action => action());
        
        // Save updated survey
        await new Promise((resolve, reject) => {
          const request = store.put(survey);
          request.onsuccess = () => {
            console.log(`   ✅ Survey updated successfully`);
            resolve();
          };
          request.onerror = () => {
            console.error(`   ❌ Failed to update survey:`, request.error);
            reject(request.error);
          };
        });
      }

      console.log(`\n✅ All fixes applied! Please refresh the page to see changes.\n`);
    } else {
      console.log(`\n✅ No issues found. All surveys are correctly configured.\n`);
    }

    // Step 6: Check storage mode
    console.log('\n📦 Storage Configuration:');
    const storageMode = localStorage.getItem('storageMode') || 'not set';
    console.log(`   Local storage mode: ${storageMode}`);
    
    // Check if we can determine Firebase availability
    try {
      // This will only work if the app is loaded
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log(`   ⚠️ Running on localhost - checking Firebase config...`);
        // Firebase check would require app context
      }
    } catch (e) {
      console.log(`   ℹ️ Could not check Firebase (this is normal in console)`);
    }

    console.log('\n✅ Diagnostic complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Refresh the page');
    console.log('   2. Check if Physician data appears in data view');
    console.log('   3. If still not showing, check browser console for errors');
    console.log('   4. Verify Firebase sync if using cloud storage\n');

  } catch (error) {
    console.error('❌ Error running diagnostic:', error);
    console.error('Stack:', error.stack);
  }
})();
