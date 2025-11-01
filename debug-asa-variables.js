/**
 * Diagnostic script to check for ASA variables in Sullivan Cotter data
 * Run this in the browser console to see what column names actually exist
 */

(async function() {
  console.log('🔍 Checking for ASA variables in Sullivan Cotter data...\n');
  
  try {
    // Open IndexedDB
    const request = indexedDB.open('SurveyAggregatorDB', 1);
    
    request.onsuccess = async (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['surveys', 'survey_data'], 'readonly');
      const surveyStore = transaction.objectStore('surveys');
      const dataStore = transaction.objectStore('survey_data');
      
      // Find Sullivan Cotter survey
      const surveyIndex = surveyStore.index('type');
      const getAllRequest = surveyIndex.getAll('SullivanCotter');
      
      getAllRequest.onsuccess = async () => {
        const surveys = getAllRequest.result;
        console.log(`Found ${surveys.length} Sullivan Cotter survey(s)\n`);
        
        if (surveys.length === 0) {
          console.log('❌ No Sullivan Cotter surveys found');
          return;
        }
        
        // Get data from first Sullivan Cotter survey
        const survey = surveys[0];
        console.log(`Checking survey: ${survey.name} (ID: ${survey.id})\n`);
        
        const dataIndex = dataStore.index('surveyId');
        const dataRequest = dataIndex.getAll(survey.id);
        
        dataRequest.onsuccess = () => {
          const allRows = dataRequest.result;
          console.log(`Found ${allRows.length} data rows\n`);
          
          if (allRows.length === 0) {
            console.log('❌ No data rows found');
            return;
          }
          
          // Check first few rows for column names
          console.log('📊 Checking column names in data rows...\n');
          
          const columnNames = new Set();
          const asaColumns = [];
          
          // Check first 10 rows
          const sampleRows = allRows.slice(0, Math.min(10, allRows.length));
          
          sampleRows.forEach((row, index) => {
            const data = row.data || {};
            const keys = Object.keys(data);
            
            keys.forEach(key => {
              columnNames.add(key);
              
              // Check if column contains "ASA"
              if (key.toLowerCase().includes('asa')) {
                asaColumns.push({
                  row: index,
                  column: key,
                  value: data[key]
                });
              }
            });
          });
          
          console.log('✅ All unique column names found:');
          Array.from(columnNames).sort().forEach(col => {
            console.log(`   - ${col}`);
          });
          
          console.log('\n🔍 Columns containing "ASA":');
          if (asaColumns.length === 0) {
            console.log('   ❌ No columns containing "ASA" found');
          } else {
            asaColumns.forEach(item => {
              console.log(`   ✅ Row ${item.row}: "${item.column}" = ${item.value}`);
            });
          }
          
          // Check for percentile patterns with ASA
          console.log('\n🔍 Checking for percentile patterns (ASA_p25, ASA_p50, etc.):');
          const percentilePattern = /asa.*p(25|50|75|90)|p(25|50|75|90).*asa/i;
          const asaPercentileColumns = Array.from(columnNames).filter(col => 
            percentilePattern.test(col)
          );
          
          if (asaPercentileColumns.length === 0) {
            console.log('   ❌ No ASA percentile columns found matching pattern *_p25, *_p50, etc.');
            console.log('   💡 This explains why ASA is not being discovered!');
          } else {
            console.log('   ✅ Found ASA percentile columns:');
            asaPercentileColumns.forEach(col => {
              console.log(`      - ${col}`);
            });
          }
          
          // Check exact pattern expected by VariableDiscoveryService
          console.log('\n🔍 Checking exact pattern expected by VariableDiscoveryService:');
          console.log('   Pattern: /^(.+)_p(25|50|75|90)$/i');
          const exactPattern = /^(.+)_p(25|50|75|90)$/i;
          const matchingColumns = Array.from(columnNames).filter(col => {
            const match = col.match(exactPattern);
            if (match && match[1].toLowerCase().includes('asa')) {
              return true;
            }
            return false;
          });
          
          if (matchingColumns.length === 0) {
            console.log('   ❌ No columns match the exact pattern expected');
            console.log('   💡 VariableDiscoveryService only detects variables with pattern: *_p25, *_p50, *_p75, *_p90');
          } else {
            console.log('   ✅ Found matching columns:');
            matchingColumns.forEach(col => {
              const match = col.match(exactPattern);
              const baseName = match[1].toLowerCase();
              console.log(`      - ${col} → base name: "${baseName}"`);
            });
          }
          
          db.close();
        };
        
        dataRequest.onerror = () => {
          console.error('❌ Error reading data:', dataRequest.error);
          db.close();
        };
      };
      
      getAllRequest.onerror = () => {
        console.error('❌ Error reading surveys:', getAllRequest.error);
        db.close();
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();

