/**
 * Test script to verify CF data fix in Regional Analytics
 * Run this in the browser console
 */

async function testCFFix() {
  try {
    console.log('🔍 Testing CF data fix in Regional Analytics...');
    
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
    
    // Check survey data for all surveys
    for (const survey of surveys) {
      console.log(`\n🔍 Checking data for survey: ${survey.name} (${survey.type})`);
      
      const surveyData = await dataService.getSurveyData(survey.id, {}, { limit: 100 });
      console.log(`📋 Survey data rows: ${surveyData.rows.length}`);
      
      if (surveyData.rows.length > 0) {
        // Check for variable-based data
        const variableRows = surveyData.rows.filter(r => r.variable);
        console.log(`📊 Rows with variable field: ${variableRows.length} out of ${surveyData.rows.length}`);
        
        if (variableRows.length > 0) {
          // Check for CF-related variables
          const cfVariables = variableRows.filter(r => {
            const variable = String(r.variable).toLowerCase();
            return variable.includes('cf') || 
                   variable.includes('conversion') || 
                   variable.includes('tcc') && variable.includes('rvu') ||
                   variable.includes('compensation') && variable.includes('rvu');
          });
          
          console.log(`💰 CF-related variables found: ${cfVariables.length}`);
          if (cfVariables.length > 0) {
            console.log('🔍 CF variables:');
            cfVariables.slice(0, 5).forEach((row, index) => {
              console.log(`CF Row ${index + 1}:`, {
                variable: row.variable,
                p25: row.p25,
                p50: row.p50,
                p75: row.p75,
                p90: row.p90,
                specialty: row.specialty,
                region: row.region || row.geographic_region
              });
            });
          }
        }
        
        // Check for direct CF columns
        const directCFRows = surveyData.rows.filter(r => 
          r.cf_p25 !== undefined || r.cf_p50 !== undefined || 
          r.cf_p75 !== undefined || r.cf_p90 !== undefined
        );
        console.log(`📊 Rows with direct CF columns: ${directCFRows.length} out of ${surveyData.rows.length}`);
        
        if (directCFRows.length > 0) {
          console.log('🔍 Direct CF data sample:');
          directCFRows.slice(0, 3).forEach((row, index) => {
            console.log(`Direct CF Row ${index + 1}:`, {
              cf_p25: row.cf_p25,
              cf_p50: row.cf_p50,
              cf_p75: row.cf_p75,
              cf_p90: row.cf_p90,
              specialty: row.specialty,
              region: row.region || row.geographic_region
            });
          });
        }
        
        // Check all column names to see what's available
        if (surveyData.rows.length > 0) {
          const allColumns = Object.keys(surveyData.rows[0]);
          const cfColumns = allColumns.filter(col => 
            col.toLowerCase().includes('cf') || 
            col.toLowerCase().includes('conversion') ||
            (col.toLowerCase().includes('tcc') && col.toLowerCase().includes('rvu'))
          );
          console.log(`📋 All columns: ${allColumns.length}`);
          console.log(`💰 CF-related columns: ${cfColumns.length}`, cfColumns);
          
          // Show first few column names
          console.log(`📋 First 20 columns:`, allColumns.slice(0, 20));
        }
      }
    }
    
    console.log('\n✅ CF data testing completed');
    console.log('🔍 Now navigate to Regional Analytics screen and check the console for CF mapping logs');
    
  } catch (error) {
    console.error('❌ Error testing CF data:', error);
  }
}

// Export for console use
if (typeof window !== 'undefined') {
  window.testCFFix = testCFFix;
  console.log('🔍 Run testCFFix() to test CF data fix');
} else {
  console.log('This script needs to be run in a browser environment');
}
