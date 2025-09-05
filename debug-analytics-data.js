/**
 * Debug script to investigate analytics data issues
 * Run this in the browser console to see what's actually in the data
 */

console.log('🔍 Starting analytics data debugging...');

// Function to examine the actual survey data structure
async function debugSurveyData() {
  try {
    console.log('🔍 Debugging survey data structure...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    // Get all surveys
    const surveys = await dataService.getAllSurveys();
    console.log('🔍 Found surveys:', surveys);
    
    // Look for Sullivan Cotter survey specifically
    const sullivanCotterSurvey = surveys.find(s => 
      s.type === 'SullivanCotter' || 
      s.name.toLowerCase().includes('sullivan') ||
      s.name.toLowerCase().includes('cotter')
    );
    
    if (sullivanCotterSurvey) {
      console.log('🔍 Found Sullivan Cotter survey:', sullivanCotterSurvey);
      
      // Get raw survey data with no filters
      const surveyData = await dataService.getSurveyData(sullivanCotterSurvey.id, {});
      console.log(`🔍 Sullivan Cotter raw data: ${surveyData.rows.length} rows`);
      
      if (surveyData.rows.length > 0) {
        // Look for Pediatrics General data
        const pediatricsRows = surveyData.rows.filter(row => {
          const specialty = row.specialty || row.surveySpecialty || row.normalizedSpecialty || '';
          return specialty.toLowerCase().includes('pediatric') || 
                 specialty.toLowerCase().includes('pediatrics') ||
                 specialty.toLowerCase().includes('general');
        });
        
        console.log(`🔍 Found ${pediatricsRows.length} pediatrics-related rows`);
        
        if (pediatricsRows.length > 0) {
          console.log('🔍 Sample pediatrics row:', pediatricsRows[0]);
          console.log('🔍 All pediatrics rows:', pediatricsRows);
          
          // Check what columns exist
          const firstRow = pediatricsRows[0];
          console.log('🔍 Available columns:', Object.keys(firstRow));
          
          // Look for organizational columns
          const orgColumns = Object.keys(firstRow).filter(col => 
            col.toLowerCase().includes('org') || 
            col.toLowerCase().includes('incumbent') ||
            col.toLowerCase().includes('count') ||
            col.toLowerCase().includes('n_')
          );
          console.log('🔍 Organizational columns found:', orgColumns);
          
          // Look for compensation columns
          const compColumns = Object.keys(firstRow).filter(col => 
            col.toLowerCase().includes('tcc') || 
            col.toLowerCase().includes('wrvu') || 
            col.toLowerCase().includes('cf') ||
            col.toLowerCase().includes('compensation')
          );
          console.log('🔍 Compensation columns found:', compColumns);
          
          // Check actual values
          pediatricsRows.forEach((row, index) => {
            console.log(`🔍 Row ${index + 1}:`, {
              specialty: row.specialty || row.surveySpecialty || row.normalizedSpecialty,
              providerType: row.provider_type || row.providerType,
              region: row.geographic_region || row.region || row.geographicRegion,
              // Check for organizational data
              n_orgs: row.n_orgs,
              n_incumbents: row.n_incumbents,
              // Check for compensation data
              tcc_p50: row.tcc_p50,
              wrvu_p50: row.wrvu_p50,
              cf_p50: row.cf_p50,
              // Check raw data
              rawData: row
            });
          });
        }
      }
    } else {
      console.log('🔍 No Sullivan Cotter survey found');
    }
    
  } catch (error) {
    console.error('🔍 Error debugging survey data:', error);
  }
}

// Function to test the analytics data service directly
async function debugAnalyticsService() {
  try {
    console.log('🔍 Testing analytics data service directly...');
    
    // Import the analytics service
    const { analyticsDataService } = await import('./src/features/analytics/services/analyticsDataService.ts');
    
    // Test with Pediatrics General filter
    console.log('🔍 Testing with Pediatrics General filter...');
    const pediatricsData = await analyticsDataService.getAnalyticsData({
      specialty: 'Pediatrics General'
    });
    
    console.log('🔍 Pediatrics General analytics data:', pediatricsData);
    
    if (pediatricsData.length > 0) {
      console.log('🔍 Sample record:', pediatricsData[0]);
      console.log('🔍 n_orgs value:', pediatricsData[0].n_orgs);
      console.log('🔍 n_incumbents value:', pediatricsData[0].n_incumbents);
      console.log('🔍 TCC P50 value:', pediatricsData[0].tcc_p50);
      console.log('🔍 Raw data:', pediatricsData[0].rawData);
    }
    
    // Test with no filters to see all data
    console.log('🔍 Testing with no filters...');
    const allData = await analyticsDataService.getAnalyticsData({});
    console.log('🔍 All analytics data:', allData.length, 'records');
    
    if (allData.length > 0) {
      console.log('🔍 First record:', allData[0]);
    }
    
  } catch (error) {
    console.error('🔍 Error debugging analytics service:', error);
  }
}

// Function to examine specialty mappings
async function debugSpecialtyMappings() {
  try {
    console.log('🔍 Debugging specialty mappings...');
    
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    const mappings = await dataService.getAllSpecialtyMappings();
    console.log('🔍 All specialty mappings:', mappings);
    
    // Look for pediatrics mapping
    const pediatricsMapping = mappings.find(m => 
      m.standardizedName.toLowerCase().includes('pediatric') ||
      m.standardizedName.toLowerCase().includes('pediatrics')
    );
    
    if (pediatricsMapping) {
      console.log('🔍 Pediatrics mapping found:', pediatricsMapping);
      console.log('🔍 Source specialties:', pediatricsMapping.sourceSpecialties);
    } else {
      console.log('🔍 No pediatrics mapping found');
    }
    
  } catch (error) {
    console.error('🔍 Error debugging specialty mappings:', error);
  }
}

// Function to examine column mappings
async function debugColumnMappings() {
  try {
    console.log('🔍 Debugging column mappings...');
    
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    const mappings = await dataService.getAllColumnMappings();
    console.log('🔍 All column mappings:', mappings);
    
    // Look for organizational column mappings
    const orgMappings = mappings.filter(m => 
      m.standardizedName.toLowerCase().includes('org') ||
      m.standardizedName.toLowerCase().includes('incumbent')
    );
    
    console.log('🔍 Organizational column mappings:', orgMappings);
    
  } catch (error) {
    console.error('🔍 Error debugging column mappings:', error);
  }
}

// Run all debug functions
console.log('🔍 Run these debug functions in the console:');
console.log('🔍 debugSurveyData() - Examine raw survey data structure');
console.log('🔍 debugAnalyticsService() - Test analytics service directly');
console.log('🔍 debugSpecialtyMappings() - Check specialty mappings');
console.log('🔍 debugColumnMappings() - Check column mappings');

// Export functions for console use
window.debugSurveyData = debugSurveyData;
window.debugAnalyticsService = debugAnalyticsService;
window.debugSpecialtyMappings = debugSpecialtyMappings;
window.debugColumnMappings = debugColumnMappings;
