/**
 * Clear All Surveys Script
 * Run this in browser console to completely clear all survey data
 */

async function clearAllSurveys() {
  try {
    console.log('🗑️ Starting to clear all surveys...');
    
    // Open IndexedDB
    const request = indexedDB.open('SurveyAggregatorDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      // Clear surveys table
      const transaction = db.transaction(['surveys'], 'readwrite');
      const surveysStore = transaction.objectStore('surveys');
      const clearRequest = surveysStore.clear();
      
      clearRequest.onsuccess = () => {
        console.log('✅ Cleared all surveys');
        
        // Clear survey data table
        const dataTransaction = db.transaction(['surveyData'], 'readwrite');
        const dataStore = dataTransaction.objectStore('surveyData');
        const clearDataRequest = dataStore.clear();
        
        clearDataRequest.onsuccess = () => {
          console.log('✅ Cleared all survey data');
          
          // Clear specialty mappings
          const mappingTransaction = db.transaction(['specialtyMappings'], 'readwrite');
          const mappingStore = mappingTransaction.objectStore('specialtyMappings');
          const clearMappingRequest = mappingStore.clear();
          
          clearMappingRequest.onsuccess = () => {
            console.log('✅ Cleared all specialty mappings');
            
            // Clear learned mappings
            const learnedTransaction = db.transaction(['learnedMappings'], 'readwrite');
            const learnedStore = learnedTransaction.objectStore('learnedMappings');
            const clearLearnedRequest = learnedStore.clear();
            
            clearLearnedRequest.onsuccess = () => {
              console.log('✅ Cleared all learned mappings');
              console.log('🎉 All data cleared successfully! You can now start fresh.');
              console.log('📝 Next: Upload SullivanCotter APP data first');
            };
            
            clearLearnedRequest.onerror = () => {
              console.error('❌ Error clearing learned mappings:', clearLearnedRequest.error);
            };
          };
          
          clearMappingRequest.onerror = () => {
            console.error('❌ Error clearing specialty mappings:', clearMappingRequest.error);
          };
        };
        
        clearDataRequest.onerror = () => {
          console.error('❌ Error clearing survey data:', clearDataRequest.error);
        };
      };
      
      clearRequest.onerror = () => {
        console.error('❌ Error clearing surveys:', clearRequest.error);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error clearing surveys:', error);
  }
}

// Run the function
clearAllSurveys();
