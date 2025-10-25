// Debug script to check survey data and provider types
// Copy and paste this into the browser console

(async () => {
  console.log('🔍 Debugging survey data and provider types...');
  
  try {
    const request = indexedDB.open('SurveyAggregatorDB', 1);
    
    const surveys = await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['surveys'], 'readonly');
        const store = transaction.objectStore('surveys');
        const getAllRequest = store.getAll();
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      };
    });
    
    console.log(`\n📊 Survey Analysis (${surveys.length} surveys):`);
    console.log('='.repeat(80));
    
    surveys.forEach((survey, index) => {
      console.log(`\nSurvey ${index + 1}:`);
      console.log(`  Name: "${survey.name}"`);
      console.log(`  Type: "${survey.type}"`);
      console.log(`  Provider Type: "${survey.providerType}"`);
      console.log(`  Has Provider Type: ${'providerType' in survey}`);
      console.log(`  Year: ${survey.year}`);
      console.log(`  Upload Date: ${survey.uploadDate}`);
      
      // Analyze the survey name for clues
      const name = survey.name.toLowerCase();
      const type = survey.type.toLowerCase();
      
      let expectedProviderType = 'UNKNOWN';
      if (name.includes('app') || type.includes('app')) {
        expectedProviderType = 'APP';
      } else if (name.includes('physician') || name.includes('mgma') || name.includes('gallagher') || name.includes('sullivan')) {
        expectedProviderType = 'PHYSICIAN';
      }
      
      console.log(`  Expected Provider Type: ${expectedProviderType}`);
      console.log(`  Match: ${survey.providerType === expectedProviderType ? '✅' : '❌'}`);
    });
    
    // Summary
    const withProviderType = surveys.filter(s => s.providerType);
    const withoutProviderType = surveys.filter(s => !s.providerType);
    const physicianSurveys = surveys.filter(s => s.providerType === 'PHYSICIAN');
    const appSurveys = surveys.filter(s => s.providerType === 'APP');
    
    console.log('\n📈 Summary:');
    console.log('='.repeat(80));
    console.log(`Total Surveys: ${surveys.length}`);
    console.log(`With Provider Type: ${withProviderType.length}`);
    console.log(`Without Provider Type: ${withoutProviderType.length}`);
    console.log(`Physician Surveys: ${physicianSurveys.length}`);
    console.log(`APP Surveys: ${appSurveys.length}`);
    
    if (withoutProviderType.length > 0) {
      console.log('\n❌ Surveys missing provider type:');
      withoutProviderType.forEach(s => {
        console.log(`  - "${s.name}" (${s.type})`);
      });
    }
    
    if (physicianSurveys.length > 0) {
      console.log('\n👨‍⚕️ Physician Surveys:');
      physicianSurveys.forEach(s => {
        console.log(`  - "${s.name}" (${s.type})`);
      });
    }
    
    if (appSurveys.length > 0) {
      console.log('\n👩‍⚕️ APP Surveys:');
      appSurveys.forEach(s => {
        console.log(`  - "${s.name}" (${s.type})`);
      });
    }
    
    // Check if we have any APP data at all
    if (appSurveys.length === 0) {
      console.log('\n⚠️  NO APP SURVEYS FOUND!');
      console.log('This explains why you only see Physician data when selecting APP\'s.');
      console.log('You need to upload some APP surveys first.');
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Error debugging survey provider types:', error);
  }
})();
