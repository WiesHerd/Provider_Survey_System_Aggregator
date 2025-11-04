/**
 * Test script to verify specialty dropdown fix in Regional Analytics
 * Run this in the browser console
 */

async function testSpecialtyDropdownFix() {
  try {
    console.log('🔍 Testing specialty dropdown fix in Regional Analytics...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.js');
    const dataService = getDataService();
    
    // Check specialty mappings
    const mappings = await dataService.getAllSpecialtyMappings();
    console.log('📊 Specialty mappings found:', mappings.length);
    
    if (mappings.length === 0) {
      console.log('❌ No specialty mappings found. This is the problem!');
      console.log('💡 You need to create specialty mappings first.');
      return;
    }
    
    // Check the structure of mappings
    console.log('🔍 First few mappings:');
    mappings.slice(0, 5).forEach((mapping, index) => {
      console.log(`Mapping ${index + 1}:`, {
        standardizedName: mapping.standardizedName,
        sourceSpecialtiesCount: mapping.sourceSpecialties?.length || 0,
        sourceSpecialties: mapping.sourceSpecialties?.slice(0, 3) || []
      });
    });
    
    // Check what specialties should be in the dropdown
    const expectedSpecialties = mappings.map(m => m.standardizedName).sort();
    console.log('📋 Expected specialties in dropdown:', expectedSpecialties.length);
    console.log('🔍 First 10 expected specialties:', expectedSpecialties.slice(0, 10));
    
    // Check for duplicates in expected specialties
    const uniqueExpectedSpecialties = [...new Set(expectedSpecialties)];
    if (expectedSpecialties.length !== uniqueExpectedSpecialties.length) {
      console.log('⚠️ Duplicate standardized names found in mappings!');
      console.log(`Total: ${expectedSpecialties.length}, Unique: ${uniqueExpectedSpecialties.length}`);
    }
    
    // Check survey data to see what raw specialties exist
    const surveys = await dataService.getAllSurveys();
    console.log('📊 Surveys found:', surveys.length);
    
    if (surveys.length > 0) {
      const allRawSpecialties = new Set();
      
      for (const survey of surveys) {
        const surveyData = await dataService.getSurveyData(survey.id, {}, { limit: 100 });
        surveyData.rows.forEach(row => {
          if (row.specialty) {
            allRawSpecialties.add(row.specialty);
          }
        });
      }
      
      console.log('🔍 Raw specialties from survey data:', allRawSpecialties.size);
      console.log('📋 First 10 raw specialties:', Array.from(allRawSpecialties).slice(0, 10));
      
      // Check if any raw specialties are showing up in the dropdown
      const rawSpecialtiesArray = Array.from(allRawSpecialties);
      const overlap = expectedSpecialties.filter(s => rawSpecialtiesArray.includes(s));
      if (overlap.length > 0) {
        console.log('⚠️ Raw specialties found in expected dropdown list:', overlap);
        console.log('💡 This suggests the mappings might contain raw specialty names instead of standardized ones.');
      }
    }
    
    console.log('\n✅ Specialty dropdown testing completed');
    console.log('🔍 Now navigate to Regional Analytics screen and check the console for debugging logs');
    console.log('💡 Look for logs starting with "🔍 Regional Analytics - Specialties for dropdown:"');
    
  } catch (error) {
    console.error('❌ Error testing specialty dropdown:', error);
  }
}

// Export for console use
if (typeof window !== 'undefined') {
  window.testSpecialtyDropdownFix = testSpecialtyDropdownFix;
  console.log('🔍 Run testSpecialtyDropdownFix() to test specialty dropdown fix');
} else {
  console.log('This script needs to be run in a browser environment');
}
