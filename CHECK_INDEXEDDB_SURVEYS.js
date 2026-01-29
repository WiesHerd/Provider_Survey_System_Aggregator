// Simple script to check IndexedDB surveys from browser console
// Copy and paste this entire script into your browser console (F12)

(async function checkIndexedDBSurveys() {
  console.log('🔍 Checking IndexedDB for surveys...\n');
  
  try {
    // Open IndexedDB
    const request = indexedDB.open('SurveyAggregatorDB');
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      console.log('✅ IndexedDB opened successfully\n');
      
      // Get all surveys
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = function() {
        const surveys = getAllRequest.result || [];
        console.log(`📊 Found ${surveys.length} surveys in IndexedDB:\n`);
        
        if (surveys.length === 0) {
          console.log('❌ No surveys found in IndexedDB');
          console.log('   This means surveys were never saved, or IndexedDB was cleared.');
          return;
        }
        
        // Group by provider type
        const byProviderType = {};
        surveys.forEach(survey => {
          const pt = survey.providerType || 'UNKNOWN';
          if (!byProviderType[pt]) {
            byProviderType[pt] = [];
          }
          byProviderType[pt].push(survey);
        });
        
        console.log('📋 Surveys by Provider Type:');
        Object.keys(byProviderType).forEach(pt => {
          console.log(`\n  ${pt}: ${byProviderType[pt].length} survey(s)`);
          byProviderType[pt].forEach(s => {
            console.log(`    - ${s.name || s.type || s.id}`);
            console.log(`      Year: ${s.year || s.surveyYear || 'N/A'}`);
            console.log(`      Provider Type: ${s.providerType || 'MISSING!'}`);
            console.log(`      Data Category: ${s.dataCategory || 'N/A'}`);
            console.log(`      Rows: ${s.rowCount || 0}`);
          });
        });
        
        console.log('\n\n🔍 Summary:');
        console.log(`  Total surveys: ${surveys.length}`);
        console.log(`  Provider types found: ${Object.keys(byProviderType).join(', ')}`);
        
        const hasPhysician = surveys.some(s => {
          const pt = (s.providerType || '').toUpperCase();
          return pt === 'PHYSICIAN' || pt === 'STAFF PHYSICIAN' || pt === 'STAFFPHYSICIAN';
        });
        const hasAPP = surveys.some(s => (s.providerType || '').toUpperCase() === 'APP');
        
        console.log(`  Has PHYSICIAN surveys: ${hasPhysician ? '✅ YES' : '❌ NO'}`);
        console.log(`  Has APP surveys: ${hasAPP ? '✅ YES' : '❌ NO'}`);
        
        if (!hasPhysician && surveys.length > 0) {
          console.log('\n⚠️ WARNING: No PHYSICIAN surveys found!');
          console.log('   This is why "Physician" is not showing in DATA VIEW dropdown.');
          console.log('   Possible causes:');
          console.log('   1. Surveys were saved with wrong providerType (check above)');
          console.log('   2. Surveys were never saved to IndexedDB');
          console.log('   3. ProviderType field is missing or incorrect');
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
