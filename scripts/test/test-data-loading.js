/**
 * Test script to check data loading in Regional Analytics
 * Run this in the browser console
 */

async function testDataLoading() {
  try {
    console.log('🔍 Testing data loading...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.js');
    const dataService = getDataService();
    
    // Check surveys
    const surveys = await dataService.getAllSurveys();
    console.log('📊 Surveys found:', surveys.length);
    surveys.forEach(survey => {
      console.log('  -', survey.id, survey.name, survey.type);
    });
    
    if (surveys.length === 0) {
      console.log('❌ No surveys found. Need to upload data first.');
      return;
    }
    
    // Check specialty mappings
    const mappings = await dataService.getAllSpecialtyMappings();
    console.log('📋 Specialty mappings found:', mappings.length);
    mappings.forEach(mapping => {
      console.log('  -', mapping.standardizedName, 'has', mapping.sourceSpecialties?.length || 0, 'source specialties');
    });
    
    // Check survey data for first survey
    const firstSurvey = surveys[0];
    console.log('🔍 Checking data for survey:', firstSurvey.name);
    
    const surveyData = await dataService.getSurveyData(firstSurvey.id, {}, { limit: 10 });
    console.log('📋 Survey data rows:', surveyData.rows.length);
    
    if (surveyData.rows.length > 0) {
      const sampleRow = surveyData.rows[0];
      console.log('🔍 Sample row structure:');
      console.log('  - Specialty:', sampleRow.specialty);
      console.log('  - Provider Type:', sampleRow.providerType);
      console.log('  - Region:', sampleRow.region);
      console.log('  - TCC P50:', sampleRow.tcc_p50);
      console.log('  - CF P50:', sampleRow.cf_p50);
      console.log('  - wRVU P50:', sampleRow.wrvu_p50);
      console.log('  - All fields:', Object.keys(sampleRow));
    }
    
    console.log('✅ Data loading test completed');
    
  } catch (error) {
    console.error('❌ Error testing data loading:', error);
  }
}

// Export for console use
if (typeof window !== 'undefined') {
  window.testDataLoading = testDataLoading;
  console.log('🔍 Run testDataLoading() to test data loading');
} else {
  console.log('This script needs to be run in a browser environment');
}
