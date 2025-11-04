/**
 * Test script to check organizational data loading
 * Run this in the browser console to verify the fix
 */

console.log('🧪 Testing organizational data loading...');

// Function to test if organizational data is being loaded
async function testOrganizationalData() {
  try {
    console.log('🧪 Testing organizational data loading...');
    
    // Get the data service
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    // Get all surveys
    const surveys = await dataService.getAllSurveys();
    console.log('🧪 Found surveys:', surveys);
    
    // Look for Sullivan Cotter survey
    const sullivanCotterSurvey = surveys.find(s => 
      s.type === 'SullivanCotter' || 
      s.name.toLowerCase().includes('sullivan') ||
      s.name.toLowerCase().includes('cotter')
    );
    
    if (sullivanCotterSurvey) {
      console.log('🧪 Testing Sullivan Cotter survey:', sullivanCotterSurvey.name);
      
      // Get survey data with no filters
      const surveyData = await dataService.getSurveyData(sullivanCotterSurvey.id, {});
      console.log(`🧪 Survey data rows: ${surveyData.rows.length}`);
      
      if (surveyData.rows.length > 0) {
        // Check first few rows for organizational data
        const sampleRows = surveyData.rows.slice(0, 3);
        
        sampleRows.forEach((row, index) => {
          console.log(`🧪 Row ${index + 1}:`, {
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
            // Check raw data structure
            availableColumns: Object.keys(row)
          });
        });
        
        // Look for pediatrics data specifically
        const pediatricsRows = surveyData.rows.filter(row => {
          const specialty = row.specialty || row.surveySpecialty || row.normalizedSpecialty || '';
          return specialty.toLowerCase().includes('pediatric') || 
                 specialty.toLowerCase().includes('pediatrics') ||
                 specialty.toLowerCase().includes('general');
        });
        
        console.log(`🧪 Found ${pediatricsRows.length} pediatrics rows`);
        
        if (pediatricsRows.length > 0) {
          console.log('🧪 Pediatrics organizational data:');
          pediatricsRows.forEach((row, index) => {
            console.log(`🧪 Pediatrics Row ${index + 1}:`, {
              specialty: row.specialty || row.surveySpecialty || row.normalizedSpecialty,
              n_orgs: row.n_orgs,
              n_incumbents: row.n_incumbents,
              tcc_p50: row.tcc_p50,
              wrvu_p50: row.wrvu_p50,
              cf_p50: row.cf_p50
            });
          });
        }
      }
    }
    
  } catch (error) {
    console.error('🧪 Error testing organizational data:', error);
  }
}

// Function to test the analytics service
async function testAnalyticsService() {
  try {
    console.log('🧪 Testing analytics service...');
    
    // Import the analytics service
    const { analyticsDataService } = await import('./src/features/analytics/services/analyticsDataService.ts');
    
    // Test with no filters
    const allData = await analyticsDataService.getAnalyticsData({});
    console.log('🧪 All analytics data:', allData.length, 'records');
    
    if (allData.length > 0) {
      console.log('🧪 Sample analytics record:', allData[0]);
      console.log('🧪 n_orgs value:', allData[0].n_orgs);
      console.log('🧪 n_incumbents value:', allData[0].n_incumbents);
    }
    
    // Test with pediatrics filter
    const pediatricsData = await analyticsDataService.getAnalyticsData({
      specialty: 'Pediatrics General'
    });
    
    console.log('🧪 Pediatrics General analytics data:', pediatricsData.length, 'records');
    
    if (pediatricsData.length > 0) {
      console.log('🧪 Pediatrics analytics record:', pediatricsData[0]);
      console.log('🧪 Pediatrics n_orgs:', pediatricsData[0].n_orgs);
      console.log('🧪 Pediatrics n_incumbents:', pediatricsData[0].n_incumbents);
    }
    
  } catch (error) {
    console.error('🧪 Error testing analytics service:', error);
  }
}

// Function to check if data needs to be re-uploaded
async function checkDataIntegrity() {
  try {
    console.log('🧪 Checking data integrity...');
    
    const { getDataService } = await import('./src/services/DataService.ts');
    const dataService = getDataService();
    
    const surveys = await dataService.getAllSurveys();
    
    for (const survey of surveys) {
      console.log(`🧪 Checking survey: ${survey.name}`);
      
      const surveyData = await dataService.getSurveyData(survey.id, {});
      
      if (surveyData.rows.length > 0) {
        const firstRow = surveyData.rows[0];
        
        // Check if organizational data exists
        const hasOrgData = firstRow.n_orgs !== undefined || firstRow.n_incumbents !== undefined;
        const hasCompData = firstRow.tcc_p50 !== undefined || firstRow.wrvu_p50 !== undefined || firstRow.cf_p50 !== undefined;
        
        console.log(`🧪 Survey ${survey.name}:`, {
          hasOrganizationalData: hasOrgData,
          hasCompensationData: hasCompData,
          n_orgs: firstRow.n_orgs,
          n_incumbents: firstRow.n_incumbents,
          tcc_p50: firstRow.tcc_p50,
          wrvu_p50: firstRow.wrvu_p50,
          cf_p50: firstRow.cf_p50
        });
        
        if (hasCompData && !hasOrgData) {
          console.log(`⚠️  WARNING: Survey ${survey.name} has compensation data but NO organizational data!`);
          console.log(`⚠️  This survey needs to be re-uploaded to fix the organizational data.`);
        }
      }
    }
    
  } catch (error) {
    console.error('🧪 Error checking data integrity:', error);
  }
}

// Run all tests
console.log('🧪 Run these test functions in the console:');
console.log('🧪 testOrganizationalData() - Check if organizational data is loaded');
console.log('🧪 testAnalyticsService() - Test the analytics service');
console.log('🧪 checkDataIntegrity() - Check if data needs to be re-uploaded');

// Export functions for console use
window.testOrganizationalData = testOrganizationalData;
window.testAnalyticsService = testAnalyticsService;
window.checkDataIntegrity = checkDataIntegrity;
