/**
 * Debug script to check specialty dropdown data in Regional Analytics
 * Run this in the browser console
 */

async function debugSpecialtyDropdown() {
  try {
    console.log('🔍 Debugging specialty dropdown in Regional Analytics...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.js');
    const dataService = getDataService();
    
    // Check specialty mappings
    const mappings = await dataService.getAllSpecialtyMappings();
    console.log('📊 Specialty mappings found:', mappings.length);
    
    if (mappings.length === 0) {
      console.log('❌ No specialty mappings found. This is the problem!');
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
    
    // Check what specialties would be in the dropdown
    const specialties = mappings.map(m => m.standardizedName).sort();
    console.log('📋 Specialties that should be in dropdown:', specialties.length);
    console.log('🔍 First 10 specialties:', specialties.slice(0, 10));
    
    // Check for duplicates
    const uniqueSpecialties = [...new Set(specialties)];
    if (specialties.length !== uniqueSpecialties.length) {
      console.log('⚠️ Duplicate specialties found!');
      console.log(`Total: ${specialties.length}, Unique: ${uniqueSpecialties.length}`);
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
      const overlap = specialties.filter(s => rawSpecialtiesArray.includes(s));
      if (overlap.length > 0) {
        console.log('⚠️ Raw specialties found in dropdown:', overlap);
      }
    }
    
    console.log('\n✅ Specialty dropdown debugging completed');
    console.log('🔍 If you see raw specialties in the dropdown, there might be an issue with the mappings loading');
    
  } catch (error) {
    console.error('❌ Error debugging specialty dropdown:', error);
  }
}

// Export for console use
if (typeof window !== 'undefined') {
  window.debugSpecialtyDropdown = debugSpecialtyDropdown;
  console.log('🔍 Run debugSpecialtyDropdown() to debug specialty dropdown');
} else {
  console.log('This script needs to be run in a browser environment');
}
