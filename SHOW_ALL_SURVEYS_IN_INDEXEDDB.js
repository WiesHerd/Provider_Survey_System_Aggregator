// Script to show ALL surveys in IndexedDB regardless of provider type
// Copy and paste this entire script into your browser console (F12)

(async function showAllSurveys() {
  console.log('🔍 Showing ALL surveys in IndexedDB (ignoring DATA VIEW filter)...\n');
  
  try {
    const request = indexedDB.open('SurveyAggregatorDB');
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = function() {
        const allSurveys = getAllRequest.result || [];
        console.log(`📊 Found ${allSurveys.length} total surveys in IndexedDB:\n`);
        
        if (allSurveys.length === 0) {
          console.log('❌ No surveys found in IndexedDB');
          return;
        }
        
        // Group by provider type
        const byProviderType = {
          PHYSICIAN: [],
          APP: [],
          CALL: [],
          OTHER: [],
          MISSING: []
        };
        
        allSurveys.forEach(survey => {
          const pt = (survey.providerType || '').toUpperCase().trim();
          const name = survey.name || survey.type || survey.id;
          
          if (!pt || pt === '') {
            byProviderType.MISSING.push({ survey, name, providerType: 'MISSING' });
          } else if (pt === 'PHYSICIAN' || pt === 'STAFF PHYSICIAN' || pt === 'STAFFPHYSICIAN' || pt === 'PHYS') {
            byProviderType.PHYSICIAN.push({ survey, name, providerType: survey.providerType });
          } else if (pt === 'APP') {
            byProviderType.APP.push({ survey, name, providerType: survey.providerType });
          } else if (pt === 'CALL' || pt === 'CALL PAY') {
            byProviderType.CALL.push({ survey, name, providerType: survey.providerType });
          } else {
            byProviderType.OTHER.push({ survey, name, providerType: survey.providerType });
          }
        });
        
        console.log('📋 Surveys by Provider Type:\n');
        
        Object.keys(byProviderType).forEach(type => {
          const surveys = byProviderType[type];
          if (surveys.length > 0) {
            console.log(`\n${type}: ${surveys.length} survey(s)`);
            surveys.forEach(({ name, providerType, survey }) => {
              console.log(`  ✅ ${name}`);
              console.log(`     Provider Type: "${providerType || 'MISSING'}"`);
              console.log(`     Data Category: ${survey.dataCategory || 'N/A'}`);
              console.log(`     Year: ${survey.year || survey.surveyYear || 'N/A'}`);
              console.log(`     Rows: ${survey.rowCount || 0}`);
              console.log(`     ID: ${survey.id}`);
            });
          }
        });
        
        console.log('\n\n📊 Summary:');
        console.log(`  Total surveys: ${allSurveys.length}`);
        console.log(`  PHYSICIAN: ${byProviderType.PHYSICIAN.length}`);
        console.log(`  APP: ${byProviderType.APP.length}`);
        console.log(`  CALL: ${byProviderType.CALL.length}`);
        console.log(`  OTHER: ${byProviderType.OTHER.length}`);
        console.log(`  MISSING providerType: ${byProviderType.MISSING.length}`);
        
        if (byProviderType.PHYSICIAN.length > 0) {
          console.log('\n✅ PHYSICIAN surveys ARE in IndexedDB!');
          console.log('   If they\'re not showing in DATA VIEW:');
          console.log('   1. Check if DATA VIEW is set to "APP" (switch to "Physician" or "Combined View")');
          console.log('   2. Check if providerType field is set correctly (see above)');
          console.log('   3. Run the fix script to correct any wrong providerType values');
        } else {
          console.log('\n❌ No PHYSICIAN surveys found in IndexedDB');
          console.log('   This means they were either:');
          console.log('   1. Never saved to IndexedDB (upload failed)');
          console.log('   2. Deleted');
          console.log('   3. Have wrong/missing providerType field');
        }
      };
      
      getAllRequest.onerror = function() {
        console.error('❌ Error getting surveys:', getAllRequest.error);
      };
    };
    
    request.onerror = function() {
      console.error('❌ Error opening IndexedDB:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
