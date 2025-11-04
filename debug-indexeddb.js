// Debug script to check IndexedDB data
console.log('🔍 Starting IndexedDB debug check...');

const checkIndexedDB = async () => {
  try {
    // Open the database
    const request = indexedDB.open('SurveyAggregatorDB', 7);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log('✅ Database opened successfully');
      console.log('📊 Object stores:', Array.from(db.objectStoreNames));
      
      // Check surveys
      if (db.objectStoreNames.contains('surveys')) {
        const transaction = db.transaction(['surveys'], 'readonly');
        const store = transaction.objectStore('surveys');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const surveys = getAllRequest.result;
          console.log('📊 Surveys found:', surveys.length);
          surveys.forEach((survey, index) => {
            console.log(`Survey ${index + 1}:`, {
              id: survey.id,
              name: survey.name,
              type: survey.type,
              year: survey.year,
              rowCount: survey.rowCount,
              providerType: survey.providerType
            });
          });
        };
        
        getAllRequest.onerror = () => {
          console.error('❌ Failed to get surveys:', getAllRequest.error);
        };
      } else {
        console.log('❌ No surveys object store found');
      }
      
      // Check survey data
      if (db.objectStoreNames.contains('surveyData')) {
        const transaction = db.transaction(['surveyData'], 'readonly');
        const store = transaction.objectStore('surveyData');
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
          console.log('📊 Survey data rows:', countRequest.result);
        };
        
        countRequest.onerror = () => {
          console.error('❌ Failed to count survey data:', countRequest.error);
        };
      } else {
        console.log('❌ No surveyData object store found');
      }
    };
    
    request.onerror = () => {
      console.error('❌ Failed to open database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error checking IndexedDB:', error);
  }
};

// Run the check
checkIndexedDB();
