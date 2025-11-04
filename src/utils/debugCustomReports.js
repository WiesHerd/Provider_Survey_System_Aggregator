/**
 * Debug utility for Custom Reports
 * Run this in the browser console to check data availability
 */

console.log('🔍 Debugging Custom Reports data...');

// Check if we can access the data service
async function debugCustomReports() {
  try {
    // Import the data service
    const { getDataService } = await import('./src/services/DataService.js');
    const dataService = getDataService();
    
    console.log('✅ Data service loaded');
    
    // Check surveys
    const surveys = await dataService.getAllSurveys();
    console.log('📊 Surveys found:', surveys.length);
    console.log('📋 Sample surveys:', surveys.slice(0, 3));
    
    // Check specialty mappings
    const mappings = await dataService.getAllSpecialtyMappings();
    console.log('🗺️ Specialty mappings found:', mappings.length);
    console.log('📋 Sample mappings:', mappings.slice(0, 3));
    
    // Check survey data
    if (surveys.length > 0) {
      const firstSurvey = surveys[0];
      console.log('🔍 Checking data for first survey:', firstSurvey.id);
      
      const surveyData = await dataService.getSurveyData(firstSurvey.id);
      console.log('📊 Survey data rows:', surveyData.rows ? surveyData.rows.length : 0);
      
      if (surveyData.rows && surveyData.rows.length > 0) {
        console.log('📋 Sample rows:', surveyData.rows.slice(0, 3).map(row => ({
          specialty: row.specialty,
          normalizedSpecialty: row.normalizedSpecialty,
          tcc_p50: row.tcc_p50,
          region: row.geographicRegion || row.region,
          surveySource: row.surveySource
        })));
        
        // Check for TCC data
        const rowsWithTCC = surveyData.rows.filter(row => row.tcc_p50 && row.tcc_p50 > 0);
        console.log('💰 Rows with TCC data:', rowsWithTCC.length);
        
        // Check specialties
        const specialties = [...new Set(surveyData.rows.map(row => row.specialty).filter(Boolean))];
        console.log('🏥 Available specialties:', specialties);
        
        // Check regions
        const regions = [...new Set(surveyData.rows.map(row => row.geographicRegion || row.region).filter(Boolean))];
        console.log('🌍 Available regions:', regions);
      }
    }
    
    // Check localStorage for any saved data
    const customReports = localStorage.getItem('customReports');
    console.log('💾 Saved custom reports:', customReports ? JSON.parse(customReports).length : 0);
    
  } catch (error) {
    console.error('❌ Error debugging Custom Reports:', error);
  }
}

// Run the debug function
debugCustomReports();

console.log('💡 To run this again, call: debugCustomReports()');
