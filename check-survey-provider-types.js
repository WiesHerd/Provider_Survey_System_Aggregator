// Script to check survey provider types in IndexedDB
// Run this in the browser console to debug the issue

async function checkSurveyProviderTypes() {
  console.log('🔍 Checking survey provider types...');
  
  try {
    // Open IndexedDB
    const request = indexedDB.open('SurveyAggregatorDB', 1);
    
    request.onsuccess = async (event) => {
      const db = event.target.result;
      
      // Get all surveys
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const surveys = getAllRequest.result;
        console.log(`📊 Found ${surveys.length} surveys:`);
        
        surveys.forEach((survey, index) => {
          console.log(`Survey ${index + 1}:`, {
            id: survey.id,
            name: survey.name,
            type: survey.type,
            providerType: survey.providerType,
            uploadDate: survey.uploadDate,
            rowCount: survey.rowCount
          });
        });
        
        // Check for surveys with missing or incorrect provider types
        const problematicSurveys = surveys.filter(survey => 
          !survey.providerType || 
          (survey.name && survey.name.toLowerCase().includes('app') && survey.providerType !== 'APP') ||
          (survey.name && survey.name.toLowerCase().includes('physician') && survey.providerType !== 'PHYSICIAN')
        );
        
        if (problematicSurveys.length > 0) {
          console.warn('⚠️ Found surveys with potentially incorrect provider types:');
          problematicSurveys.forEach(survey => {
            console.warn(`- ${survey.name}: providerType = "${survey.providerType}"`);
          });
        } else {
          console.log('✅ All surveys have correct provider types');
        }
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

// Run the check
checkSurveyProviderTypes();
