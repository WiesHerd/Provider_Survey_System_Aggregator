// Script to fix survey provider types in IndexedDB
// Run this in the browser console to fix the issue

async function fixSurveyProviderTypes() {
  console.log('🔧 Fixing survey provider types...');
  
  try {
    // Open IndexedDB
    const request = indexedDB.open('SurveyAggregatorDB', 1);
    
    request.onsuccess = async (event) => {
      const db = event.target.result;
      
      // Get all surveys
      const transaction = db.transaction(['surveys'], 'readwrite');
      const store = transaction.objectStore('surveys');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const surveys = getAllRequest.result;
        console.log(`📊 Found ${surveys.length} surveys to check`);
        
        let fixedCount = 0;
        
        surveys.forEach((survey, index) => {
          let needsUpdate = false;
          let newProviderType = survey.providerType;
          
          // Check if survey name indicates APP but providerType is not APP
          if (survey.name && survey.name.toLowerCase().includes('app') && survey.providerType !== 'APP') {
            newProviderType = 'APP';
            needsUpdate = true;
            console.log(`🔧 Fixing survey "${survey.name}": ${survey.providerType} → APP`);
          }
          
          // Check if survey name indicates Physician but providerType is not PHYSICIAN
          else if (survey.name && survey.name.toLowerCase().includes('physician') && survey.providerType !== 'PHYSICIAN') {
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
            } else if (survey.name && survey.name.toLowerCase().includes('physician')) {
              newProviderType = 'PHYSICIAN';
              needsUpdate = true;
              console.log(`🔧 Setting provider type for "${survey.name}": undefined → PHYSICIAN`);
            } else {
              // Default to PHYSICIAN for surveys without clear indication
              newProviderType = 'PHYSICIAN';
              needsUpdate = true;
              console.log(`🔧 Setting default provider type for "${survey.name}": undefined → PHYSICIAN`);
            }
          }
          
          if (needsUpdate) {
            // Update the survey
            const updatedSurvey = {
              ...survey,
              providerType: newProviderType,
              updatedAt: new Date()
            };
            
            const putRequest = store.put(updatedSurvey);
            putRequest.onsuccess = () => {
              fixedCount++;
              console.log(`✅ Updated survey "${survey.name}" to provider type: ${newProviderType}`);
            };
            putRequest.onerror = () => {
              console.error(`❌ Error updating survey "${survey.name}":`, putRequest.error);
            };
          }
        });
        
        transaction.oncomplete = () => {
          console.log(`🎉 Fixed ${fixedCount} surveys`);
          console.log('🔄 Please refresh the page to see the changes');
        };
        
        transaction.onerror = () => {
          console.error('❌ Transaction error:', transaction.error);
        };
      };
      
      getAllRequest.onerror = () => {
        console.error('❌ Error getting surveys:', getAllRequest.error);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixSurveyProviderTypes();
