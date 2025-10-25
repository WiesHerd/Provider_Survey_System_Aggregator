/**
 * DEBUG SCRIPT: Check All Surveys (All Years)
 * This will show you all surveys in your database regardless of year
 */

async function checkAllSurveys() {
  try {
    console.log('🔍 Checking ALL surveys in database...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    // Get all surveys
    const allSurveys = await dataService.getAllSurveys();
    
    console.log(`📊 Found ${allSurveys.length} total surveys:`);
    console.log('='.repeat(60));
    
    allSurveys.forEach((survey, index) => {
      console.log(`${index + 1}. ${survey.name || 'Unnamed'}`);
      console.log(`   Year: ${survey.year || survey.surveyYear || 'Unknown'}`);
      console.log(`   Type: ${survey.type || 'Unknown'}`);
      console.log(`   Provider Type: ${survey.providerType || 'PHYSICIAN'}`);
      console.log(`   Rows: ${survey.rowCount || survey.row_count || 0}`);
      console.log(`   ID: ${survey.id}`);
      console.log('   ' + '-'.repeat(40));
    });
    
    // Group by year
    const byYear = {};
    allSurveys.forEach(survey => {
      const year = survey.year || survey.surveyYear || 'Unknown';
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(survey);
    });
    
    console.log('\n📅 Surveys by Year:');
    Object.keys(byYear).sort().forEach(year => {
      console.log(`\n${year}: ${byYear[year].length} surveys`);
      byYear[year].forEach(survey => {
        console.log(`  - ${survey.name} (${survey.type})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error checking surveys:', error);
  }
}

// Export for console use
window.checkAllSurveys = checkAllSurveys;

console.log('🔍 Survey checker script loaded!');
console.log('💡 Run: checkAllSurveys() in browser console to see all surveys');
