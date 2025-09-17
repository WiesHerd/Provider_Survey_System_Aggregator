/**
 * Check Data State Script
 * Run this in browser console to see what data exists and what the provider context is showing
 */

async function checkDataState() {
  try {
    console.log('🔍 Checking current data state...');
    
    // Check IndexedDB surveys
    const request = indexedDB.open('SurveyAggregatorDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const surveys = getAllRequest.result;
        console.log('📊 Current surveys in IndexedDB:', surveys.length);
        
        if (surveys.length === 0) {
          console.log('❌ No surveys found - Data View should show "No data available"');
        } else {
          console.log('✅ Surveys found:');
          surveys.forEach(survey => {
            console.log(`  - ${survey.name}: providerType = "${survey.providerType}"`);
          });
        }
        
        // Check localStorage for provider context
        const savedState = localStorage.getItem('provider-context-state');
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            console.log('🔧 Saved provider context state:', parsedState);
          } catch (error) {
            console.log('❌ Could not parse saved provider context state');
          }
        } else {
          console.log('🔧 No saved provider context state found');
        }
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error opening IndexedDB:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error checking data state:', error);
  }
}

// Run the function
checkDataState();
