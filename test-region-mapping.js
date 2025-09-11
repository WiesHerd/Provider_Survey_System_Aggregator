/**
 * Test script to verify region mapping in Regional Analytics
 * Run this in the browser console
 */

async function testRegionMapping() {
  try {
    console.log('🔍 Testing region mapping in Regional Analytics...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.js');
    const dataService = getDataService();
    
    // Check region mappings
    const regionMappings = await dataService.getRegionMappings();
    console.log('🌍 Region mappings found:', regionMappings.length);
    
    regionMappings.forEach(mapping => {
      console.log(`  - ${mapping.standardizedName}:`, mapping.sourceRegions.map(r => `${r.region} (${r.surveySource})`));
    });
    
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
      console.log('🔍 Sample rows with region data:');
      surveyData.rows.slice(0, 5).forEach((row, index) => {
        console.log(`Row ${index + 1}:`, {
          specialty: row.specialty,
          providerType: row.providerType,
          originalRegion: row.geographicRegion || row.geographic_region || row.region,
          variable: row.variable,
          p50: row.p50,
          tcc_p50: row.tcc_p50,
          cf_p50: row.cf_p50,
          wrvu_p50: row.wrvu_p50
        });
      });
      
      // Check unique regions in data
      const uniqueRegions = [...new Set(surveyData.rows.map(r => r.geographicRegion || r.geographic_region || r.region).filter(Boolean))];
      console.log('🌍 Unique regions in data:', uniqueRegions);
      
      // Check which regions are mapped
      const mappedRegions = new Set();
      regionMappings.forEach(mapping => {
        mapping.sourceRegions.forEach(region => {
          mappedRegions.add(region.region.toLowerCase());
        });
      });
      
      console.log('🗺️ Mapped region names:', Array.from(mappedRegions));
      
      const unmappedRegions = uniqueRegions.filter(region => !mappedRegions.has(region.toLowerCase()));
      if (unmappedRegions.length > 0) {
        console.log('⚠️ Unmapped regions:', unmappedRegions);
      } else {
        console.log('✅ All regions are mapped');
      }
    }
    
    console.log('✅ Region mapping test completed');
    console.log('🔍 Now navigate to Regional Analytics screen and test the filters');
    
  } catch (error) {
    console.error('❌ Error testing region mapping:', error);
  }
}

// Export for console use
if (typeof window !== 'undefined') {
  window.testRegionMapping = testRegionMapping;
  console.log('🔍 Run testRegionMapping() to test region mapping');
} else {
  console.log('This script needs to be run in a browser environment');
}
