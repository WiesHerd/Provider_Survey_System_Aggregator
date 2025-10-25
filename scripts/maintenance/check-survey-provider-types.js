// Check survey provider types in IndexedDB
const checkSurveyProviderTypes = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SurveyAggregatorDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const getAllRequest = store.getAll();
      
      getAllRequest.onerror = () => reject(getAllRequest.error);
      getAllRequest.onsuccess = () => {
        const surveys = getAllRequest.result;
        console.log('🔍 Survey Provider Type Analysis:');
        console.log('Total surveys:', surveys.length);
        
        surveys.forEach((survey, index) => {
          console.log(`Survey ${index + 1}:`, {
            id: survey.id,
            name: survey.name,
            type: survey.type,
            providerType: survey.providerType,
            hasProviderType: 'providerType' in survey,
            year: survey.year,
            uploadDate: survey.uploadDate
          });
        });
        
        // Check if any surveys are missing providerType
        const missingProviderType = surveys.filter(s => !s.providerType);
        console.log('\n🔍 Surveys missing providerType:', missingProviderType.length);
        missingProviderType.forEach(survey => {
          console.log('Missing providerType:', survey.name, survey.type);
        });
        
        resolve(surveys);
      };
    };
  });
};

// Run the check
checkSurveyProviderTypes()
  .then(surveys => {
    console.log('\n✅ Survey provider type check completed');
    console.log('Found', surveys.length, 'surveys');
  })
  .catch(error => {
    console.error('❌ Error checking survey provider types:', error);
  });
