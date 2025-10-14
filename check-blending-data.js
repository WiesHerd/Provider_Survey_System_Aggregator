/**
 * Script to check what data is available in the blending system
 * Run this in the browser console to see what years are available
 */

async function checkBlendingData() {
  try {
    console.log('🔍 Checking blending data...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.js');
    const dataService = getDataService();
    
    // Get all surveys
    const surveys = await dataService.getAllSurveys();
    console.log('📊 Total surveys:', surveys.length);
    
    surveys.forEach((survey, index) => {
      console.log(`Survey ${index + 1}:`, {
        name: survey.name,
        year: survey.year,
        type: survey.type,
        providerType: survey.providerType
      });
    });
    
    // Check if we have any 2024 data
    const surveys2024 = surveys.filter(s => s.year === '2024' || s.year === 2024);
    console.log('📅 Surveys with 2024 data:', surveys2024.length);
    
    if (surveys2024.length === 0) {
      console.log('⚠️ No 2024 data found. You may need to populate sample data.');
      console.log('💡 Try running the populate-sample-data.js script in the browser console.');
    } else {
      console.log('✅ Found 2024 data:', surveys2024);
    }
    
    // Check unique years
    const uniqueYears = [...new Set(surveys.map(s => s.year))];
    console.log('📆 Unique years in system:', uniqueYears);
    
  } catch (error) {
    console.error('❌ Error checking blending data:', error);
  }
}

// Make it available globally
window.checkBlendingData = checkBlendingData;

console.log('🔍 Blending data checker loaded. Run checkBlendingData() in the console.');





