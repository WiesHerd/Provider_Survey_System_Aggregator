/**
 * Script to analyze IndexedDB data structure
 * Run this in the browser console to understand the data structure
 */

console.log('🔍 Starting IndexedDB data analysis...');

// Function to analyze survey data structure
async function analyzeSurveyData() {
  try {
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    console.log('🔍 DataService initialized');
    
    // Get all surveys
    const surveys = await dataService.getAllSurveys();
    console.log('🔍 Found surveys:', surveys);
    
    // Get specialty mappings
    const specialtyMappings = await dataService.getAllSpecialtyMappings();
    console.log('🔍 Found specialty mappings:', specialtyMappings);
    
    // Get column mappings
    const columnMappings = await dataService.getAllColumnMappings();
    console.log('🔍 Found column mappings:', columnMappings);
    
    // Analyze each survey's data structure
    for (const survey of surveys) {
      console.log(`\n🔍 Analyzing survey: ${survey.name} (${survey.type})`);
      
      try {
        // Get survey data with no filters to see all columns
        const surveyData = await dataService.getSurveyData(survey.id, {});
        console.log(`🔍 Survey ${survey.name} has ${surveyData.rows.length} rows`);
        
        if (surveyData.rows.length > 0) {
          const firstRow = surveyData.rows[0];
          console.log(`🔍 First row columns:`, Object.keys(firstRow));
          console.log(`🔍 First row sample data:`, firstRow);
          
          // Look for compensation-related columns
          const compensationColumns = Object.keys(firstRow).filter(col => 
            col.toLowerCase().includes('tcc') || 
            col.toLowerCase().includes('wrvu') || 
            col.toLowerCase().includes('cf') ||
            col.toLowerCase().includes('compensation') ||
            col.toLowerCase().includes('salary')
          );
          console.log(`🔍 Compensation-related columns:`, compensationColumns);
          
          // Look for organizational columns
          const orgColumns = Object.keys(firstRow).filter(col => 
            col.toLowerCase().includes('org') || 
            col.toLowerCase().includes('incumbent') ||
            col.toLowerCase().includes('count') ||
            col.toLowerCase().includes('n_')
          );
          console.log(`🔍 Organizational columns:`, orgColumns);
          
          // Look for specialty/region/provider type columns
          const metadataColumns = Object.keys(firstRow).filter(col => 
            col.toLowerCase().includes('specialty') || 
            col.toLowerCase().includes('region') ||
            col.toLowerCase().includes('provider') ||
            col.toLowerCase().includes('type')
          );
          console.log(`🔍 Metadata columns:`, metadataColumns);
          
          // Sample a few rows to see data patterns
          const sampleRows = surveyData.rows.slice(0, 3);
          console.log(`🔍 Sample rows:`, sampleRows);
        }
        
      } catch (error) {
        console.error(`🔍 Error analyzing survey ${survey.name}:`, error);
      }
    }
    
  } catch (error) {
    console.error('🔍 Error in analysis:', error);
  }
}

// Function to analyze specialty mappings
async function analyzeSpecialtyMappings() {
  try {
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    const mappings = await dataService.getAllSpecialtyMappings();
    
    console.log('\n🔍 Specialty Mappings Analysis:');
    mappings.forEach(mapping => {
      console.log(`🔍 Standardized: "${mapping.standardizedName}"`);
      console.log(`🔍 Source specialties:`, mapping.sourceSpecialties.map(s => s.specialty));
      console.log('---');
    });
    
  } catch (error) {
    console.error('🔍 Error analyzing specialty mappings:', error);
  }
}

// Function to analyze column mappings
async function analyzeColumnMappings() {
  try {
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    const mappings = await dataService.getAllColumnMappings();
    
    console.log('\n🔍 Column Mappings Analysis:');
    mappings.forEach(mapping => {
      console.log(`🔍 Standardized: "${mapping.standardizedName}"`);
      console.log(`🔍 Source columns:`, mapping.sourceColumns.map(s => s.column));
      console.log('---');
    });
    
  } catch (error) {
    console.error('🔍 Error analyzing column mappings:', error);
  }
}

// Run the analysis
console.log('🔍 Run these functions in the console:');
console.log('🔍 analyzeSurveyData() - Analyze survey data structure');
console.log('🔍 analyzeSpecialtyMappings() - Analyze specialty mappings');
console.log('🔍 analyzeColumnMappings() - Analyze column mappings');

// Export functions for console use
window.analyzeSurveyData = analyzeSurveyData;
window.analyzeSpecialtyMappings = analyzeSpecialtyMappings;
window.analyzeColumnMappings = analyzeColumnMappings;
