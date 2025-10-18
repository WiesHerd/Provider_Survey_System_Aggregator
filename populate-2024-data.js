/**
 * Script to populate 2024 survey data for testing
 * Run this in the browser console to add 2024 data
 */

async function populate2024Data() {
  try {
    console.log('🚀 Starting to populate 2024 data...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.js');
    const dataService = getDataService();
    
    // Check if 2024 data already exists
    const existingSurveys = await dataService.getAllSurveys();
    const has2024Data = existingSurveys.some(s => s.year === '2024' || s.year === 2024);
    
    if (has2024Data) {
      console.log('✅ 2024 data already exists, skipping population.');
      return;
    }
    
    // Create 2024 MGMA survey
    const mgma2024Survey = {
      name: "MGMA Physician Compensation 2024",
      year: "2024",
      type: "MGMA",
      providerType: "PHYSICIAN"
    };
    
    console.log('📊 Creating MGMA 2024 survey...');
    const mgmaSurvey = await dataService.createSurvey(mgma2024Survey);
    console.log('✅ MGMA 2024 survey created:', mgmaSurvey.id);
    
    // Sample 2024 data
    const sample2024Data = [
      {
        specialty: "Family Medicine",
        provider_type: "Staff Physician",
        geographic_region: "National",
        n_orgs: 150,
        n_incumbents: 1200,
        tcc_p25: 250000,
        tcc_p50: 280000,
        tcc_p75: 320000,
        tcc_p90: 380000,
        wrvu_p25: 4500,
        wrvu_p50: 5200,
        wrvu_p75: 6000,
        wrvu_p90: 7200,
        cf_p25: 45,
        cf_p50: 52,
        cf_p75: 58,
        cf_p90: 65
      },
      {
        specialty: "Internal Medicine",
        provider_type: "Staff Physician", 
        geographic_region: "National",
        n_orgs: 180,
        n_incumbents: 1500,
        tcc_p25: 260000,
        tcc_p50: 290000,
        tcc_p75: 330000,
        tcc_p90: 390000,
        wrvu_p25: 4600,
        wrvu_p50: 5300,
        wrvu_p75: 6100,
        wrvu_p90: 7300,
        cf_p25: 46,
        cf_p50: 53,
        cf_p75: 59,
        cf_p90: 66
      }
    ];
    
    // Save the data
    console.log('💾 Saving 2024 survey data...');
    await dataService.saveSurveyData(mgmaSurvey.id, sample2024Data);
    console.log('✅ 2024 data saved successfully!');
    
    // Verify the data was saved
    const surveys = await dataService.getAllSurveys();
    const surveys2024 = surveys.filter(s => s.year === '2024' || s.year === 2024);
    console.log('📅 2024 surveys after population:', surveys2024.length);
    
    console.log('🎉 2024 data population complete! Refresh the blending screen to see the new data.');
    
  } catch (error) {
    console.error('❌ Error populating 2024 data:', error);
  }
}

// Make it available globally
window.populate2024Data = populate2024Data;

console.log('🔍 2024 data populator loaded. Run populate2024Data() in the console.');








