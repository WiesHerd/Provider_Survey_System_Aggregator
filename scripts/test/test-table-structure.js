/**
 * Test script to check the actual table structure
 * Run this in the browser console on the analytics page
 */

console.log('🔍 Testing table structure...');

// Function to check what columns are actually in the table
function checkTableStructure() {
  try {
    console.log('🔍 Checking table structure...');
    
    // Look for the table
    const table = document.querySelector('table');
    if (!table) {
      console.log('❌ No table found on the page');
      return;
    }
    
    console.log('✅ Table found:', table);
    
    // Check table headers
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
    console.log('🔍 Table headers found:', headers);
    
    // Check if the new organizational columns are present
    const expectedColumns = [
      'TCC # Orgs',
      'TCC # Incumbents', 
      'wRVU # Orgs',
      'wRVU # Incumbents',
      'CF # Orgs',
      'CF # Incumbents'
    ];
    
    console.log('🔍 Expected organizational columns:', expectedColumns);
    
    const missingColumns = expectedColumns.filter(col => !headers.some(h => h?.includes(col)));
    const presentColumns = expectedColumns.filter(col => headers.some(h => h?.includes(col)));
    
    console.log('✅ Present organizational columns:', presentColumns);
    console.log('❌ Missing organizational columns:', missingColumns);
    
    if (missingColumns.length > 0) {
      console.log('⚠️  WARNING: Some organizational columns are missing!');
      console.log('⚠️  This means the table columns are not being updated correctly.');
    } else {
      console.log('✅ All organizational columns are present!');
    }
    
    // Check table data
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    console.log(`🔍 Table has ${rows.length} data rows`);
    
    if (rows.length > 0) {
      const firstRow = rows[0];
      const cells = Array.from(firstRow.querySelectorAll('td'));
      console.log(`🔍 First row has ${cells.length} cells`);
      
      // Check if the organizational data cells have values
      const orgColumns = headers.map((header, index) => ({ header, index }))
        .filter(({ header }) => header?.includes('# Orgs') || header?.includes('# Incumbents'));
      
      console.log('🔍 Organizational data columns:', orgColumns);
      
      orgColumns.forEach(({ header, index }) => {
        if (cells[index]) {
          const value = cells[index].textContent?.trim();
          console.log(`🔍 ${header}: "${value}"`);
        }
      });
    }
    
  } catch (error) {
    console.error('🔍 Error checking table structure:', error);
  }
}

// Function to check the data being passed to the table
async function checkTableData() {
  try {
    console.log('🔍 Checking table data...');
    
    // Try to access the analytics service
    const { analyticsDataService } = await import('./src/features/analytics/services/analyticsDataService.ts');
    
    // Get data with no filters
    const data = await analyticsDataService.getAnalyticsData({});
    console.log('🔍 Analytics service returned data:', data);
    
    if (data.length > 0) {
      const firstRecord = data[0];
      console.log('🔍 First record structure:', firstRecord);
      
      // Check if the new organizational fields exist
      const hasTccOrgs = firstRecord.hasOwnProperty('tcc_n_orgs');
      const hasTccIncumbents = firstRecord.hasOwnProperty('tcc_n_incumbents');
      const hasWrvuOrgs = firstRecord.hasOwnProperty('wrvu_n_orgs');
      const hasWrvuIncumbents = firstRecord.hasOwnProperty('wrvu_n_incumbents');
      const hasCfOrgs = firstRecord.hasOwnProperty('cf_n_orgs');
      const hasCfIncumbents = firstRecord.hasOwnProperty('cf_n_incumbents');
      
      console.log('🔍 Data has organizational fields:');
      console.log('  - tcc_n_orgs:', hasTccOrgs);
      console.log('  - tcc_n_incumbents:', hasTccIncumbents);
      console.log('  - wrvu_n_orgs:', hasWrvuOrgs);
      console.log('  - wrvu_n_incumbents:', hasWrvuIncumbents);
      console.log('  - cf_n_orgs:', hasCfOrgs);
      console.log('  - cf_n_incumbents:', hasCfIncumbents);
      
      // Check actual values
      console.log('🔍 Organizational field values:');
      console.log('  - tcc_n_orgs:', firstRecord.tcc_n_orgs);
      console.log('  - tcc_n_incumbents:', firstRecord.tcc_n_incumbents);
      console.log('  - wrvu_n_orgs:', firstRecord.wrvu_n_orgs);
      console.log('  - wrvu_n_incumbents:', firstRecord.wrvu_n_incumbents);
      console.log('  - cf_n_orgs:', firstRecord.cf_n_orgs);
      console.log('  - cf_n_incumbents:', firstRecord.cf_n_incumbents);
      
      // Check all available keys
      console.log('🔍 All available keys:', Object.keys(firstRecord));
    }
    
  } catch (error) {
    console.error('🔍 Error checking table data:', error);
  }
}

// Function to check if the table component is using the right data
function checkTableComponent() {
  try {
    console.log('🔍 Checking table component...');
    
    // Look for React components in the DOM
    const reactRoot = document.querySelector('#root');
    if (reactRoot) {
      console.log('✅ React root found');
      
      // Try to find the AnalyticsTable component
      const tableContainer = document.querySelector('[class*="table"]') || 
                            document.querySelector('[class*="analytics"]') ||
                            document.querySelector('table')?.closest('div');
      
      if (tableContainer) {
        console.log('✅ Table container found:', tableContainer);
        console.log('🔍 Table container classes:', tableContainer.className);
        console.log('🔍 Table container HTML:', tableContainer.innerHTML.substring(0, 500) + '...');
      }
    }
    
  } catch (error) {
    console.error('🔍 Error checking table component:', error);
  }
}

// Run all tests
console.log('🔍 Run these test functions in the console:');
console.log('🔍 checkTableStructure() - Check what columns are actually rendered');
console.log('🔍 checkTableData() - Check what data the service is returning');
console.log('🔍 checkTableComponent() - Check the table component structure');

// Export functions for console use
window.checkTableStructure = checkTableStructure;
window.checkTableData = checkTableData;
window.checkTableComponent = checkTableComponent;
