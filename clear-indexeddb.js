/**
 * Script to clear IndexedDB data
 * Run this in browser console or use with a browser automation tool
 */

async function clearIndexedDB() {
  try {
    console.log('🗑️ Clearing IndexedDB data...');
    
    // Open the database
    const request = indexedDB.open('SurveyAggregatorDB', 4);
    
    request.onsuccess = () => {
      const db = request.result;
      console.log('✅ Database opened successfully');
      
      // Clear survey data
      const dataTransaction = db.transaction(['surveyData'], 'readwrite');
      const dataStore = dataTransaction.objectStore('surveyData');
      const dataClearRequest = dataStore.clear();
      
      dataClearRequest.onsuccess = () => {
        console.log('✅ Cleared survey data');
        
        // Clear surveys
        const surveyTransaction = db.transaction(['surveys'], 'readwrite');
        const surveyStore = surveyTransaction.objectStore('surveys');
        const surveyClearRequest = surveyStore.clear();
        
        surveyClearRequest.onsuccess = () => {
          console.log('✅ Cleared surveys');
          
          // Clear specialty mappings
          const mappingTransaction = db.transaction(['specialtyMappings'], 'readwrite');
          const mappingStore = mappingTransaction.objectStore('specialtyMappings');
          const mappingClearRequest = mappingStore.clear();
          
          mappingClearRequest.onsuccess = () => {
            console.log('✅ Cleared specialty mappings');
            
            // Clear specialty mapping sources
            const sourceTransaction = db.transaction(['specialtyMappingSources'], 'readwrite');
            const sourceStore = sourceTransaction.objectStore('specialtyMappingSources');
            const sourceClearRequest = sourceStore.clear();
            
            sourceClearRequest.onsuccess = () => {
              console.log('✅ Cleared specialty mapping sources');
              console.log('🎯 IndexedDB cleared successfully!');
            };
            
            sourceClearRequest.onerror = () => {
              console.error('❌ Error clearing specialty mapping sources:', sourceClearRequest.error);
            };
          };
          
          mappingClearRequest.onerror = () => {
            console.error('❌ Error clearing specialty mappings:', mappingClearRequest.error);
          };
        };
        
        surveyClearRequest.onerror = () => {
          console.error('❌ Error clearing surveys:', surveyClearRequest.error);
        };
      };
      
      dataClearRequest.onerror = () => {
        console.error('❌ Error clearing survey data:', dataClearRequest.error);
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
if (typeof window !== 'undefined') {
  window.clearIndexedDB = clearIndexedDB;
  console.log('🔍 Run clearIndexedDB() to clear IndexedDB data');
} else {
  console.log('This script needs to be run in a browser environment');
}
