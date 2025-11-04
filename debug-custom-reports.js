/**
 * Debug script to check why custom reports shows "No Data Available"
 * Run this in the browser console on localhost:3000/custom-reports
 */

async function debugCustomReports() {
  try {
    console.log('🔍 Debugging Custom Reports - No Data Available Issue');
    console.log('================================================');
    
    // Check IndexedDB surveys
    const request = indexedDB.open('SurveyAggregatorDB', 7);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log('✅ Database opened successfully');
      console.log('📊 Object stores:', Array.from(db.objectStoreNames));
      
      // Check surveys
      if (db.objectStoreNames.contains('surveys')) {
        const transaction = db.transaction(['surveys'], 'readonly');
        const store = transaction.objectStore('surveys');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const surveys = getAllRequest.result;
          console.log(`📊 Found ${surveys.length} surveys:`);
          
          if (surveys.length === 0) {
            console.log('❌ NO SURVEYS FOUND - This is why you see "No Data Available"');
            console.log('💡 Solution: Upload some survey data first');
            return;
          }
          
          surveys.forEach((survey, index) => {
            console.log(`Survey ${index + 1}:`, {
              id: survey.id,
              name: survey.name || survey.surveyProvider,
              year: survey.surveyYear || survey.year,
              type: survey.type || survey.surveyProvider,
              providerType: survey.providerType,
              rowCount: survey.rowCount
            });
          });
          
          // Check survey data for each survey
          surveys.forEach(survey => {
            if (db.objectStoreNames.contains('surveyData')) {
              const dataTransaction = db.transaction(['surveyData'], 'readonly');
              const dataStore = dataTransaction.objectStore('surveyData');
              // Use getAll() and filter by surveyId instead of using non-existent index
              const dataRequest = dataStore.getAll();
              
              dataRequest.onsuccess = () => {
                const allData = dataRequest.result;
                // Filter data for this specific survey
                const surveyData = allData.filter(item => item.surveyId === survey.id);
                console.log(`📋 Survey "${survey.name || survey.surveyProvider}" has ${surveyData.length} data chunks`);
                
                if (surveyData.length > 0) {
                  // Get a sample of the data
                  const sampleData = surveyData[0].data || surveyData[0];
                  console.log('📋 Sample data row:', {
                    specialty: sampleData.specialty || sampleData.Specialty,
                    region: sampleData.region || sampleData.Region || sampleData.geographic_region,
                    providerType: sampleData.providerType || sampleData.ProviderType || sampleData['Provider Type'],
                    surveySource: sampleData.surveySource || sampleData.type,
                    year: sampleData.surveyYear || sampleData.year,
                    variable: sampleData.variable,
                    tcc_p50: sampleData.tcc_p50,
                    cf_p50: sampleData.cf_p50,
                    wrvu_p50: sampleData.wrvu_p50
                  });
                  
                  // Check if data matches current filters
                  console.log('🔍 Checking data against current filters...');
                  const hasPediatrics = surveyData.some(chunk => 
                    (chunk.data || []).some(row => 
                      (row.specialty || row.Specialty || '').toLowerCase().includes('pediatric')
                    )
                  );
                  console.log(`  - Has Pediatrics data: ${hasPediatrics}`);
                  
                  const hasNational = surveyData.some(chunk => 
                    (chunk.data || []).some(row => 
                      (row.region || row.Region || row.geographic_region || '').toLowerCase().includes('national')
                    )
                  );
                  console.log(`  - Has National region: ${hasNational}`);
                  
                  const hasMGMA = surveyData.some(chunk => 
                    (chunk.data || []).some(row => 
                      (row.surveySource || row.type || '').toLowerCase().includes('mgma')
                    )
                  );
                  console.log(`  - Has MGMA source: ${hasMGMA}`);
                  
                  const hasStaffPhysician = surveyData.some(chunk => 
                    (chunk.data || []).some(row => 
                      (row.providerType || row.ProviderType || row['Provider Type'] || '').toLowerCase().includes('staff')
                    )
                  );
                  console.log(`  - Has Staff Physician: ${hasStaffPhysician}`);
                  
                  const has2025 = surveyData.some(chunk => 
                    (chunk.data || []).some(row => 
                      String(row.surveyYear || row.year || '').includes('2025')
                    )
                  );
                  console.log(`  - Has 2025 data: ${has2025}`);
                }
              };
              
              dataRequest.onerror = () => {
                console.error(`❌ Error getting data for survey ${survey.name}:`, dataRequest.error);
              };
            }
          });
        };
        
        getAllRequest.onerror = () => {
          console.error('❌ Error getting surveys:', getAllRequest.error);
        };
      } else {
        console.log('❌ No surveys object store found');
      }
      
      // Check current year context
      console.log('\n🔍 Checking Year Context...');
      const yearConfigs = localStorage.getItem('year_configs');
      if (yearConfigs) {
        try {
          const parsed = JSON.parse(yearConfigs);
          console.log('📅 Year configs:', parsed);
        } catch (e) {
          console.log('❌ Could not parse year configs');
        }
      } else {
        console.log('❌ No year configs found');
      }
      
      // Check current filters in custom reports
      console.log('\n🔍 Checking Current Custom Reports Filters...');
      const customReports = localStorage.getItem('customReports');
      if (customReports) {
        try {
          const parsed = JSON.parse(customReports);
          console.log('📊 Saved custom reports:', parsed);
        } catch (e) {
          console.log('❌ Could not parse custom reports');
        }
      } else {
        console.log('❌ No custom reports config found');
      }
    };
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug function
debugCustomReports();

// Export for manual use
window.debugCustomReports = debugCustomReports;
