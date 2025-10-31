// Simple diagnostic script for Custom Reports
// Copy and paste this into your browser console at localhost:3000/custom-reports

async function simpleDebug() {
  console.log('🔍 Simple Custom Reports Debug');
  console.log('==============================');
  
  try {
    const request = indexedDB.open('SurveyAggregatorDB', 7);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log('✅ Database opened successfully');
      
      // Check surveys
      const surveyTransaction = db.transaction(['surveys'], 'readonly');
      const surveyStore = surveyTransaction.objectStore('surveys');
      const surveyRequest = surveyStore.getAll();
      
      surveyRequest.onsuccess = () => {
        const surveys = surveyRequest.result;
        console.log(`📊 Found ${surveys.length} surveys:`);
        
        if (surveys.length === 0) {
          console.log('❌ NO SURVEYS FOUND - Upload data first!');
          return;
        }
        
        surveys.forEach((survey, index) => {
          console.log(`Survey ${index + 1}:`, {
            name: survey.name || survey.surveyProvider,
            year: survey.surveyYear || survey.year,
            type: survey.type || survey.surveyProvider,
            providerType: survey.providerType
          });
        });
        
        // Check survey data
        const dataTransaction = db.transaction(['surveyData'], 'readonly');
        const dataStore = dataTransaction.objectStore('surveyData');
        const dataRequest = dataStore.getAll();
        
        dataRequest.onsuccess = () => {
          const allData = dataRequest.result;
          console.log(`📋 Total data chunks: ${allData.length}`);
          
          if (allData.length === 0) {
            console.log('❌ NO DATA CHUNKS FOUND - This explains "No Data Available"');
            return;
          }
          
          // Get sample data
          const sampleChunk = allData[0];
          if (sampleChunk && sampleChunk.data && sampleChunk.data.length > 0) {
            const sampleRow = sampleChunk.data[0];
            console.log('📋 Sample data row:', {
              specialty: sampleRow.specialty || sampleRow.Specialty,
              region: sampleRow.region || sampleRow.Region || sampleRow.geographic_region,
              providerType: sampleRow.providerType || sampleRow.ProviderType || sampleRow['Provider Type'],
              surveySource: sampleRow.surveySource || sampleRow.type,
              year: sampleRow.surveyYear || sampleRow.year,
              variable: sampleRow.variable
            });
            
            // Check for specific filter matches
            console.log('\n🔍 Checking current filters:');
            
            // Check for Addiction Medicine
            const hasAddiction = allData.some(chunk => 
              chunk.data && chunk.data.some(row => 
                (row.specialty || row.Specialty || '').toLowerCase().includes('addiction')
              )
            );
            console.log(`  - Has Addiction Medicine: ${hasAddiction}`);
            
            // Check for National region
            const hasNational = allData.some(chunk => 
              chunk.data && chunk.data.some(row => 
                (row.region || row.Region || row.geographic_region || '').toLowerCase().includes('national')
              )
            );
            console.log(`  - Has National region: ${hasNational}`);
            
            // Check for Gallagher
            const hasGallagher = allData.some(chunk => 
              chunk.data && chunk.data.some(row => 
                (row.surveySource || row.type || '').toLowerCase().includes('gallagher')
              )
            );
            console.log(`  - Has Gallagher source: ${hasGallagher}`);
            
            // Check for Staff Physician
            const hasStaffPhysician = allData.some(chunk => 
              chunk.data && chunk.data.some(row => 
                (row.providerType || row.ProviderType || row['Provider Type'] || '').toLowerCase().includes('staff')
              )
            );
            console.log(`  - Has Staff Physician: ${hasStaffPhysician}`);
            
            // Check for 2025
            const has2025 = allData.some(chunk => 
              chunk.data && chunk.data.some(row => 
                String(row.surveyYear || row.year || '').includes('2025')
              )
            );
            console.log(`  - Has 2025 data: ${has2025}`);
            
            console.log('\n💡 RECOMMENDATIONS:');
            if (!hasAddiction) {
              console.log('  - Try selecting a different specialty (not Addiction Medicine)');
            }
            if (!hasNational) {
              console.log('  - Try selecting a different region (not National)');
            }
            if (!hasGallagher) {
              console.log('  - Try selecting a different survey source (not Gallagher)');
            }
            if (!hasStaffPhysician) {
              console.log('  - Try selecting a different provider type (not Staff Physician)');
            }
            if (!has2025) {
              console.log('  - Try selecting a different year (not 2025)');
            }
            
            if (hasAddiction && hasNational && hasGallagher && hasStaffPhysician && has2025) {
              console.log('  - All filters should match - there might be a data structure issue');
            }
          }
        };
        
        dataRequest.onerror = () => {
          console.error('❌ Error getting survey data:', dataRequest.error);
        };
      };
      
      surveyRequest.onerror = () => {
        console.error('❌ Error getting surveys:', surveyRequest.error);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the diagnostic
simpleDebug();




