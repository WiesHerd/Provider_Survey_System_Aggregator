// Script to check existing surveys and their provider types
// Run this in the browser console to debug the issue

async function checkExistingSurveys() {
  console.log('🔍 Checking existing surveys and their provider types...');
  
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
        console.log(`📊 Found ${surveys.length} surveys in database:`);
        
        surveys.forEach((survey, index) => {
          console.log(`Survey ${index + 1}:`, {
            id: survey.id,
            name: survey.name,
            type: survey.type,
            providerType: survey.providerType,
            uploadDate: survey.uploadDate,
            rowCount: survey.rowCount,
            hasProviderType: !!survey.providerType
          });
        });
        
        // Check for surveys with missing provider types
        const surveysWithoutProviderType = surveys.filter(survey => !survey.providerType);
        const surveysWithProviderType = surveys.filter(survey => survey.providerType);
        
        console.log(`\n📈 Summary:`);
        console.log(`- Surveys with provider type: ${surveysWithProviderType.length}`);
        console.log(`- Surveys without provider type: ${surveysWithoutProviderType.length}`);
        
        if (surveysWithoutProviderType.length > 0) {
          console.warn('⚠️ Found surveys without provider type:');
          surveysWithoutProviderType.forEach(survey => {
            console.warn(`- ${survey.name}: providerType = "${survey.providerType}" (undefined)`);
          });
        }
        
        if (surveysWithProviderType.length > 0) {
          console.log('✅ Surveys with provider type:');
          surveysWithProviderType.forEach(survey => {
            console.log(`- ${survey.name}: providerType = "${survey.providerType}"`);
          });
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
checkExistingSurveys();
