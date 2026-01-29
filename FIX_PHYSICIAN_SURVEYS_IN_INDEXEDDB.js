// Script to fix physician surveys in IndexedDB
// Copy and paste this entire script into your browser console (F12)

(async function fixPhysicianSurveys() {
  console.log('🔧 Fixing physician surveys in IndexedDB...\n');
  
  try {
    const request = indexedDB.open('SurveyAggregatorDB');
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(['surveys'], 'readwrite');
      const store = transaction.objectStore('surveys');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = function() {
        const surveys = getAllRequest.result || [];
        console.log(`📊 Found ${surveys.length} surveys to check\n`);
        
        let fixedCount = 0;
        const updates = [];
        
        surveys.forEach(survey => {
          const currentProviderType = survey.providerType || '';
          const normalized = currentProviderType.toUpperCase().trim();
          const surveyName = survey.name || survey.type || survey.id;
          
          // Check if this should be PHYSICIAN
          const shouldBePhysician = 
            normalized === 'STAFF PHYSICIAN' ||
            normalized === 'STAFFPHYSICIAN' ||
            normalized === 'PHYS' ||
            (surveyName && (
              surveyName.toLowerCase().includes('physician') ||
              (surveyName.toLowerCase().includes('mgma') && !surveyName.toLowerCase().includes('app')) ||
              (surveyName.toLowerCase().includes('gallagher') && !surveyName.toLowerCase().includes('app')) ||
              (surveyName.toLowerCase().includes('sullivancotter') && !surveyName.toLowerCase().includes('app')) ||
              (surveyName.toLowerCase().includes('sullivan cotter') && !surveyName.toLowerCase().includes('app'))
            ) && normalized !== 'APP');
          
          if (shouldBePhysician && normalized !== 'PHYSICIAN') {
            console.log(`🔧 Fixing: "${surveyName}"`);
            console.log(`   Current: "${currentProviderType}" → New: "PHYSICIAN"`);
            
            survey.providerType = 'PHYSICIAN';
            updates.push(store.put(survey));
            fixedCount++;
          } else if (!currentProviderType && surveyName && 
                     (surveyName.toLowerCase().includes('physician') ||
                      surveyName.toLowerCase().includes('mgma') ||
                      surveyName.toLowerCase().includes('gallagher'))) {
            console.log(`🔧 Setting missing providerType: "${surveyName}" → "PHYSICIAN"`);
            survey.providerType = 'PHYSICIAN';
            updates.push(store.put(survey));
            fixedCount++;
          }
        });
        
        if (fixedCount === 0) {
          console.log('✅ No surveys needed fixing - all provider types are correct');
          console.log('\n📋 Current surveys:');
          surveys.forEach(s => {
            console.log(`  - ${s.name || s.type}: providerType = "${s.providerType || 'MISSING'}"`);
          });
        } else {
          console.log(`\n✅ Fixed ${fixedCount} survey(s)`);
          console.log('🔄 Refreshing page to update DATA VIEW...');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
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
