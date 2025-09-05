/**
 * Test script for analytics data functionality
 * Run this in the browser console to test the new analytics system
 */

console.log('🧪 Starting analytics data testing...');

// Test function to verify analytics data service
async function testAnalyticsDataService() {
  try {
    console.log('🧪 Testing AnalyticsDataService...');
    
    // Import the analytics data service
    const { analyticsDataService } = await import('./src/features/analytics/services/analyticsDataService.ts');
    
    console.log('🧪 AnalyticsDataService imported successfully');
    
    // Test getting analytics data with no filters
    console.log('🧪 Testing getAnalyticsData() with no filters...');
    const data = await analyticsDataService.getAnalyticsData({});
    
    console.log('🧪 Analytics data retrieved:', data.length, 'records');
    
    if (data.length > 0) {
      console.log('🧪 Sample record structure:', data[0]);
      
      // Verify the data structure
      const sampleRecord = data[0];
      console.log('🧪 Data structure validation:');
      console.log('🧪 - Has standardizedName:', !!sampleRecord.standardizedName);
      console.log('🧪 - Has surveySource:', !!sampleRecord.surveySource);
      console.log('🧪 - Has n_orgs:', typeof sampleRecord.n_orgs === 'number');
      console.log('🧪 - Has n_incumbents:', typeof sampleRecord.n_incumbents === 'number');
      console.log('🧪 - Has TCC metrics:', !!sampleRecord.tcc_p50);
      console.log('🧪 - Has wRVU metrics:', !!sampleRecord.wrvu_p50);
      console.log('🧪 - Has CF metrics:', !!sampleRecord.cf_p50);
      
      // Test filtering
      console.log('🧪 Testing filtering...');
      const filteredData = await analyticsDataService.getAnalyticsData({
        specialty: sampleRecord.surveySpecialty
      });
      
      console.log('🧪 Filtered data count:', filteredData.length);
      console.log('🧪 All filtered records have same specialty:', 
        filteredData.every(r => r.surveySpecialty === sampleRecord.surveySpecialty)
      );
    }
    
    console.log('🧪 AnalyticsDataService test completed successfully!');
    
  } catch (error) {
    console.error('🧪 Error testing AnalyticsDataService:', error);
  }
}

// Test function to verify useAnalyticsData hook
async function testUseAnalyticsDataHook() {
  try {
    console.log('🧪 Testing useAnalyticsData hook...');
    
    // Import the hook
    const { useAnalyticsData } = await import('./src/features/analytics/hooks/useAnalyticsData.ts');
    
    console.log('🧪 useAnalyticsData hook imported successfully');
    console.log('🧪 Note: This hook can only be tested in a React component context');
    
  } catch (error) {
    console.error('🧪 Error testing useAnalyticsData hook:', error);
  }
}

// Test function to verify data normalization
async function testDataNormalization() {
  try {
    console.log('🧪 Testing data normalization...');
    
    // Import the service
    const { analyticsDataService } = await import('./src/features/analytics/services/analyticsDataService.ts');
    
    // Test with specific filters to see normalization in action
    console.log('🧪 Testing specialty normalization...');
    const specialtyData = await analyticsDataService.getAnalyticsData({
      specialty: 'Cardiology'
    });
    
    console.log('🧪 Cardiology data found:', specialtyData.length, 'records');
    
    if (specialtyData.length > 0) {
      console.log('🧪 Sample cardiology record:', specialtyData[0]);
      
      // Check if data is properly normalized
      const uniqueSpecialties = new Set(specialtyData.map(r => r.surveySpecialty));
      console.log('🧪 Unique specialties in cardiology data:', Array.from(uniqueSpecialties));
      
      const uniqueSources = new Set(specialtyData.map(r => r.surveySource));
      console.log('🧪 Survey sources in cardiology data:', Array.from(uniqueSources));
    }
    
  } catch (error) {
    console.error('🧪 Error testing data normalization:', error);
  }
}

// Test function to verify data stacking
async function testDataStacking() {
  try {
    console.log('🧪 Testing data stacking...');
    
    // Import the service
    const { analyticsDataService } = await import('./src/features/analytics/services/analyticsDataService.ts');
    
    // Get data from multiple sources
    const allData = await analyticsDataService.getAnalyticsData({});
    
    console.log('🧪 Total records:', allData.length);
    
    // Group by survey source to see stacking
    const bySource = allData.reduce((acc, record) => {
      if (!acc[record.surveySource]) {
        acc[record.surveySource] = [];
      }
      acc[record.surveySource].push(record);
      return acc;
    }, {});
    
    console.log('🧪 Records by survey source:');
    Object.entries(bySource).forEach(([source, records]) => {
      console.log(`🧪 - ${source}: ${records.length} records`);
    });
    
    // Check if n_orgs and n_incumbents are properly maintained
    console.log('🧪 Checking n_orgs and n_incumbents preservation...');
    const hasValidCounts = allData.every(record => 
      typeof record.n_orgs === 'number' && 
      typeof record.n_incumbents === 'number' &&
      record.n_orgs >= 0 && 
      record.n_incumbents >= 0
    );
    
    console.log('🧪 All records have valid n_orgs/n_incumbents:', hasValidCounts);
    
  } catch (error) {
    console.error('🧪 Error testing data stacking:', error);
  }
}

// Run all tests
console.log('🧪 Run these test functions in the console:');
console.log('🧪 testAnalyticsDataService() - Test the core data service');
console.log('🧪 testUseAnalyticsDataHook() - Test the React hook');
console.log('🧪 testDataNormalization() - Test data normalization');
console.log('🧪 testDataStacking() - Test data stacking functionality');

// Export functions for console use
window.testAnalyticsDataService = testAnalyticsDataService;
window.testUseAnalyticsDataHook = testUseAnalyticsDataHook;
window.testDataNormalization = testDataNormalization;
window.testDataStacking = testDataStacking;
