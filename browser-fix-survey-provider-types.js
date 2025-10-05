// Copy and paste this into the browser console to fix survey provider types
// This script will run directly in the browser and fix the provider type issue

(async () => {
  console.log('🔧 Starting survey provider type fix...');
  
  try {
    const request = indexedDB.open('SurveyAggregatorDB', 1);
    
    const result = await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['surveys'], 'readwrite');
        const store = transaction.objectStore('surveys');
        const getAllRequest = store.getAll();
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
        getAllRequest.onsuccess = () => {
          const surveys = getAllRequest.result;
          console.log(`🔍 Found ${surveys.length} surveys to check`);
          
          let fixedCount = 0;
          let skippedCount = 0;
          
          const processSurvey = (index) => {
            if (index >= surveys.length) {
              console.log(`\n🎉 Survey provider type fix completed!`);
              console.log(`✅ Fixed: ${fixedCount} surveys`);
              console.log(`⏭️ Skipped: ${skippedCount} surveys`);
              resolve();
              return;
            }
            
            const survey = surveys[index];
            let needsUpdate = false;
            let newProviderType = survey.providerType;
            
            // Check if survey name indicates APP but providerType is not APP
            if (survey.name && survey.name.toLowerCase().includes('app') && survey.providerType !== 'APP') {
              newProviderType = 'APP';
              needsUpdate = true;
              console.log(`🔧 Fixing survey "${survey.name}": ${survey.providerType} → APP`);
            }
            
            // Check if survey name indicates Physician but providerType is not PHYSICIAN
            else if (survey.name && (
              survey.name.toLowerCase().includes('physician') || 
              survey.name.toLowerCase().includes('mgma') || 
              survey.name.toLowerCase().includes('gallagher')
            ) && survey.providerType !== 'PHYSICIAN') {
              newProviderType = 'PHYSICIAN';
              needsUpdate = true;
              console.log(`🔧 Fixing survey "${survey.name}": ${survey.providerType} → PHYSICIAN`);
            }
            
            // Check if survey has no provider type but name gives us a clue
            else if (!survey.providerType) {
              if (survey.name && survey.name.toLowerCase().includes('app')) {
                newProviderType = 'APP';
                needsUpdate = true;
                console.log(`🔧 Setting provider type for "${survey.name}": undefined → APP`);
              } else if (survey.name && (
                survey.name.toLowerCase().includes('physician') || 
                survey.name.toLowerCase().includes('mgma') || 
                survey.name.toLowerCase().includes('gallagher')
              )) {
                newProviderType = 'PHYSICIAN';
                needsUpdate = true;
                console.log(`🔧 Setting provider type for "${survey.name}": undefined → PHYSICIAN`);
              } else if (survey.name && survey.name.toLowerCase().includes('sullivan') && 
                       !survey.name.toLowerCase().includes('app')) {
                newProviderType = 'PHYSICIAN';
                needsUpdate = true;
                console.log(`🔧 Setting Sullivan survey provider type for "${survey.name}": undefined → PHYSICIAN`);
              } else {
                // Default to PHYSICIAN for surveys without clear indication
                newProviderType = 'PHYSICIAN';
                needsUpdate = true;
                console.log(`🔧 Setting default provider type for "${survey.name}": undefined → PHYSICIAN`);
              }
            }
            
            if (needsUpdate) {
              const updatedSurvey = { ...survey, providerType: newProviderType };
              const putRequest = store.put(updatedSurvey);
              
              putRequest.onsuccess = () => {
                fixedCount++;
                console.log(`✅ Fixed survey ${index + 1}/${surveys.length}: ${survey.name} → ${newProviderType}`);
                processSurvey(index + 1);
              };
              
              putRequest.onerror = () => {
                console.error(`❌ Failed to update survey ${survey.name}:`, putRequest.error);
                skippedCount++;
                processSurvey(index + 1);
              };
            } else {
              skippedCount++;
              console.log(`⏭️ Skipping survey ${index + 1}/${surveys.length}: ${survey.name} (already correct: ${survey.providerType})`);
              processSurvey(index + 1);
            }
          };
          
          processSurvey(0);
        };
      };
    });
    
    console.log('✅ Survey provider type fix completed successfully!');
    console.log('🔄 Please refresh the page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error fixing survey provider types:', error);
  }
})();
