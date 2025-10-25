/**
 * DEBUG SCRIPT: Check All Surveys in Database
 * Run this in your browser console to see all surveys
 */

async function debugSurveys() {
  try {
    console.log('🔍 Checking all surveys in your database...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    // Get all surveys
    const allSurveys = await dataService.getAllSurveys();
    
    console.log(`📊 Total surveys found: ${allSurveys.length}`);
    console.log('='.repeat(80));
    
    if (allSurveys.length === 0) {
      console.log('❌ No surveys found in database');
      return;
    }
    
    // Show each survey with details
    allSurveys.forEach((survey, index) => {
      console.log(`\n${index + 1}. Survey Details:`);
      console.log(`   Name: ${survey.name || 'Unnamed'}`);
      console.log(`   Year: ${survey.year || survey.surveyYear || 'Unknown'}`);
      console.log(`   Type: ${survey.type || 'Unknown'}`);
      console.log(`   Provider Type: ${survey.providerType || 'PHYSICIAN'}`);
      console.log(`   Row Count: ${survey.rowCount || survey.row_count || 0}`);
      console.log(`   Upload Date: ${survey.uploadDate || 'Unknown'}`);
      console.log(`   ID: ${survey.id}`);
    });
    
    // Group by year
    const byYear = {};
    allSurveys.forEach(survey => {
      const year = survey.year || survey.surveyYear || 'Unknown';
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(survey);
    });
    
    console.log('\n📅 Surveys by Year:');
    console.log('='.repeat(40));
    Object.keys(byYear).sort().forEach(year => {
      console.log(`\n${year}: ${byYear[year].length} survey(s)`);
      byYear[year].forEach(survey => {
        console.log(`  ✓ ${survey.name} (${survey.type})`);
      });
    });
    
    // Check for SullivanCotter specifically
    const sullivanCotter = allSurveys.filter(s => 
      s.name && s.name.toLowerCase().includes('sullivan')
    );
    
    console.log('\n🔍 SullivanCotter Surveys:');
    console.log('='.repeat(40));
    if (sullivanCotter.length > 0) {
      sullivanCotter.forEach(survey => {
        console.log(`✓ Found: ${survey.name}`);
        console.log(`  Year: ${survey.year || survey.surveyYear}`);
        console.log(`  Type: ${survey.type}`);
        console.log(`  Rows: ${survey.rowCount || survey.row_count}`);
      });
    } else {
      console.log('❌ No SullivanCotter surveys found');
    }
    
  } catch (error) {
    console.error('❌ Error checking surveys:', error);
  }
}

// Export for console use
window.debugSurveys = debugSurveys;

console.log('🔍 Survey debug script loaded!');
console.log('💡 Run: debugSurveys() in your browser console');
