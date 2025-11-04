/**
 * Simple script to check IndexedDB contents
 * Run this in browser console
 */

async function checkIndexedDB() {
  try {
    console.log('🔍 Checking IndexedDB contents...');
    
    // Open the database
    const request = indexedDB.open('SurveyAggregatorDB', 4);
    
    request.onsuccess = () => {
      const db = request.result;
      console.log('✅ Database opened successfully');
      
      // Check surveys
      const surveyTransaction = db.transaction(['surveys'], 'readonly');
      const surveyStore = surveyTransaction.objectStore('surveys');
      const surveyRequest = surveyStore.getAll();
      
      surveyRequest.onsuccess = () => {
        const surveys = surveyRequest.result;
        console.log(`📊 Found ${surveys.length} surveys:`, surveys);
        
        // Check survey data for each survey
        surveys.forEach(survey => {
          const dataTransaction = db.transaction(['surveyData'], 'readonly');
          const dataStore = dataTransaction.objectStore('surveyData');
          const dataIndex = dataStore.index('surveyId');
          const dataRequest = dataIndex.getAll(IDBKeyRange.only(survey.id));
          
          dataRequest.onsuccess = () => {
            const surveyData = dataRequest.result;
            console.log(`📋 Survey "${survey.name}" has ${surveyData.length} data rows`);
            if (surveyData.length > 0) {
              console.log('📋 Sample data row:', surveyData[0]);
            }
          };
          
          dataRequest.onerror = () => {
            console.error(`❌ Error getting data for survey ${survey.name}:`, dataRequest.error);
          };
        });
      };
      
      surveyRequest.onerror = () => {
        console.error('❌ Error getting surveys:', surveyRequest.error);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Export for console use
window.checkIndexedDB = checkIndexedDB;

console.log('🔍 Run checkIndexedDB() to inspect IndexedDB contents');
