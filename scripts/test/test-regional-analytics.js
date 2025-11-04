/**
 * Test script to verify Regional Analytics data loading
 * Run this in the browser console
 */

async function testRegionalAnalytics() {
  try {
    console.log('🔍 Testing Regional Analytics data loading...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.js');
    const dataService = getDataService();
    
    // Check surveys
    const surveys = await dataService.getAllSurveys();
    console.log('📊 Surveys found:', surveys.length);
    
    if (surveys.length === 0) {
      console.log('❌ No surveys found. Please upload some data first.');
      return;
    }
    
    // Check survey data for first survey
    const firstSurvey = surveys[0];
    console.log('🔍 Checking data for survey:', firstSurvey.name);
    
    const surveyData = await dataService.getSurveyData(firstSurvey.id, {}, { limit: 20 });
    console.log('📋 Survey data rows:', surveyData.rows.length);
    
    if (surveyData.rows.length > 0) {
      console.log('🔍 Sample rows structure:');
      surveyData.rows.slice(0, 3).forEach((row, index) => {
        console.log(`Row ${index + 1}:`, {
          specialty: row.specialty,
          providerType: row.providerType,
          region: row.region,
          variable: row.variable,
          p25: row.p25,
          p50: row.p50,
          p75: row.p75,
          p90: row.p90,
          // Check if direct percentile fields exist
          tcc_p50: row.tcc_p50,
          cf_p50: row.cf_p50,
          wrvu_p50: row.wrvu_p50,
          allFields: Object.keys(row).slice(0, 15)
        });
      });
      
      // Check for variable-based data
      const variableRows = surveyData.rows.filter(r => r.variable);
      console.log(`📊 Rows with variable field: ${variableRows.length} out of ${surveyData.rows.length}`);
      
      if (variableRows.length > 0) {
        console.log('🔍 Variable-based data sample:');
        variableRows.slice(0, 3).forEach((row, index) => {
          console.log(`Variable Row ${index + 1}:`, {
            variable: row.variable,
            p25: row.p25,
            p50: row.p50,
            p75: row.p75,
            p90: row.p90
          });
        });
      }
      
      // Check for direct percentile data
      const directPercentileRows = surveyData.rows.filter(r => r.tcc_p50 || r.cf_p50 || r.wrvu_p50);
      console.log(`📊 Rows with direct percentile data: ${directPercentileRows.length} out of ${surveyData.rows.length}`);
    }
    
    // Check specialty mappings
    const mappings = await dataService.getAllSpecialtyMappings();
    console.log('📋 Specialty mappings found:', mappings.length);
    mappings.forEach(mapping => {
      console.log('  -', mapping.standardizedName, 'has', mapping.sourceSpecialties?.length || 0, 'source specialties');
    });
    
    console.log('✅ Regional Analytics test completed');
    console.log('🔍 Now navigate to Regional Analytics screen and test the filters');
    
  } catch (error) {
    console.error('❌ Error testing Regional Analytics:', error);
  }
}

// Export for console use
if (typeof window !== 'undefined') {
  window.testRegionalAnalytics = testRegionalAnalytics;
  console.log('🔍 Run testRegionalAnalytics() to test Regional Analytics data loading');
} else {
  console.log('This script needs to be run in a browser environment');
}
