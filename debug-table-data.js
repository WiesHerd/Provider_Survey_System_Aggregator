/**
 * Debug script to check what data is being passed to AnalyticsTable
 * Run this in the browser console to see the actual data structure
 */

console.log('🔍 Debugging AnalyticsTable data...');

// Function to check the current analytics data
async function debugAnalyticsTableData() {
  try {
    console.log('🔍 Checking analytics data structure...');
    
    // Import the analytics service
    const { analyticsDataService } = await import('./src/features/analytics/services/analyticsDataService.ts');
    
    // Get data with no filters
    const data = await analyticsDataService.getAnalyticsData({});
    console.log('🔍 Raw analytics data:', data);
    
    if (data.length > 0) {
      const firstRecord = data[0];
      console.log('🔍 First record structure:', firstRecord);
      
      // Check if the new organizational fields exist
      console.log('🔍 TCC organizational fields:');
      console.log('  - tcc_n_orgs:', firstRecord.tcc_n_orgs);
      console.log('  - tcc_n_incumbents:', firstRecord.tcc_n_incumbents);
      
      console.log('🔍 wRVU organizational fields:');
      console.log('  - wrvu_n_orgs:', firstRecord.wrvu_n_orgs);
      console.log('  - wrvu_n_incumbents:', firstRecord.wrvu_n_incumbents);
      
      console.log('🔍 CF organizational fields:');
      console.log('  - cf_n_orgs:', firstRecord.cf_n_orgs);
      console.log('  - cf_n_incumbents:', firstRecord.cf_n_incumbents);
      
      console.log('🔍 Legacy fields:');
      console.log('  - n_orgs:', firstRecord.n_orgs);
      console.log('  - n_incumbents:', firstRecord.n_incumbents);
      
      // Check all available keys
      console.log('🔍 All available keys:', Object.keys(firstRecord));
      
      // Check if the data has the expected structure
      const hasNewFields = firstRecord.hasOwnProperty('tcc_n_orgs') && 
                          firstRecord.hasOwnProperty('wrvu_n_orgs') && 
                          firstRecord.hasOwnProperty('cf_n_orgs');
      
      console.log('🔍 Has new organizational fields:', hasNewFields);
      
      if (!hasNewFields) {
        console.log('⚠️  WARNING: New organizational fields are missing from the data!');
        console.log('⚠️  This means the AnalyticsDataService is not returning the expected structure.');
      }
    }
    
  } catch (error) {
    console.error('🔍 Error debugging analytics table data:', error);
  }
}

// Function to check the useAnalyticsData hook
async function debugUseAnalyticsData() {
  try {
    console.log('🔍 Checking useAnalyticsData hook...');
    
    // Get the hook from the current component
    const analyticsComponent = document.querySelector('[data-testid="survey-analytics"]') || 
                              document.querySelector('.analytics-container') ||
                              document.querySelector('h4');
    
    if (analyticsComponent) {
      console.log('🔍 Found analytics component:', analyticsComponent);
      
      // Try to access the hook data through React DevTools or console
      console.log('🔍 To inspect the hook data:');
      console.log('🔍 1. Open React DevTools');
      console.log('🔍 2. Find the SurveyAnalytics component');
      console.log('🔍 3. Check the useAnalyticsData hook state');
    } else {
      console.log('🔍 Analytics component not found');
    }
    
  } catch (error) {
    console.error('🔍 Error debugging useAnalyticsData hook:', error);
  }
}

// Function to check if the table is receiving the right data
function debugTableData() {
  try {
    console.log('🔍 Checking table data...');
    
    // Look for the table in the DOM
    const table = document.querySelector('table');
    if (table) {
      console.log('🔍 Found table:', table);
      
      // Check table headers
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
      console.log('🔍 Table headers:', headers);
      
      // Check if new organizational columns are present
      const hasTccOrgs = headers.some(h => h?.includes('TCC # Orgs'));
      const hasWrvuOrgs = headers.some(h => h?.includes('wRVU # Orgs'));
      const hasCfOrgs = headers.some(h => h?.includes('CF # Orgs'));
      
      console.log('🔍 New organizational columns present:');
      console.log('  - TCC # Orgs:', hasTccOrgs);
      console.log('  - wRVU # Orgs:', hasWrvuOrgs);
      console.log('  - CF # Orgs:', hasCfOrgs);
      
      if (!hasTccOrgs || !hasWrvuOrgs || !hasCfOrgs) {
        console.log('⚠️  WARNING: New organizational columns are missing from the table!');
        console.log('⚠️  This means the table columns are not being updated correctly.');
      }
    } else {
      console.log('🔍 Table not found in DOM');
    }
    
  } catch (error) {
    console.error('🔍 Error debugging table data:', error);
  }
}

// Run all debug functions
console.log('🔍 Run these debug functions in the console:');
console.log('🔍 debugAnalyticsTableData() - Check the raw analytics data');
console.log('🔍 debugUseAnalyticsData() - Check the hook data');
console.log('🔍 debugTableData() - Check the table DOM');

// Export functions for console use
window.debugAnalyticsTableData = debugAnalyticsTableData;
window.debugUseAnalyticsData = debugUseAnalyticsData;
window.debugTableData = debugTableData;
