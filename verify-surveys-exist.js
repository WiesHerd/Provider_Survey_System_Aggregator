// Verify surveys exist in database
console.log('🔍 Verifying surveys in database...');

const verifyScript = `
// Check if surveys actually exist in the database
async function verifySurveys() {
  try {
    console.log('🔍 Step 1: Accessing IndexedDB directly...');
    
    // Open IndexedDB directly
    const request = indexedDB.open('SurveyAggregatorDB', 1);
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      console.log('✅ IndexedDB opened successfully');
      
      // Check surveys table
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const surveyRequest = store.getAll();
      
      surveyRequest.onsuccess = function() {
        const surveys = surveyRequest.result;
        console.log('📊 Surveys found in IndexedDB:', surveys.length);
        
        if (surveys.length === 0) {
          console.log('❌ No surveys in IndexedDB - they were never uploaded or were cleared');
        } else {
          console.log('✅ Surveys exist in IndexedDB:');
          surveys.forEach((survey, index) => {
            console.log(\`  \${index + 1}. \${survey.name} (ID: \${survey.id})\`);
          });
        }
      };
      
      surveyRequest.onerror = function() {
        console.error('❌ Error reading surveys from IndexedDB');
      };
    };
    
    request.onerror = function() {
      console.error('❌ Error opening IndexedDB');
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifySurveys();
`;

console.log('Copy and paste this into your browser console:');
console.log(verifyScript);
