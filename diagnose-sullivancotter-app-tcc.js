/**
 * Diagnostic script to check Sullivan Cotter APP data structure
 * and identify why TCC is showing as asterisks
 */

const { getDataService } = require('./src/services/DataService');

async function diagnoseSullivanCotterAPP() {
  console.log('🔍 Diagnosing Sullivan Cotter APP TCC Issue...\n');
  
  try {
    const dataService = getDataService();
    
    // Step 1: Find Sullivan Cotter APP surveys
    const surveys = await dataService.getAllSurveys();
    const sullivanCotterAPP = surveys.filter(s => {
      const name = (s.name || '').toLowerCase();
      const type = (s.type || '').toLowerCase();
      return (name.includes('sullivan') || name.includes('cotter') || type.includes('sullivan')) &&
             (s.providerType === 'APP' || name.includes('app'));
    });
    
    console.log(`📊 Found ${sullivanCotterAPP.length} Sullivan Cotter APP survey(s):\n`);
    
    if (sullivanCotterAPP.length === 0) {
      console.log('❌ No Sullivan Cotter APP surveys found!');
      return;
    }
    
    // Step 2: Check each survey's data structure
    for (const survey of sullivanCotterAPP) {
      console.log(`\n🔍 Analyzing Survey: ${survey.name}`);
      console.log(`   ID: ${survey.id}`);
      console.log(`   Type: ${survey.type}`);
      console.log(`   Provider Type: ${survey.providerType}`);
      console.log(`   Source: ${survey.source || 'N/A'}`);
      console.log(`   Data Category: ${survey.dataCategory || 'N/A'}`);
      
      // Get sample data rows
      const surveyData = await dataService.getSurveyData(survey.id, {}, { limit: 5 });
      
      if (surveyData.rows.length === 0) {
        console.log('   ⚠️  No data rows found!');
        continue;
      }
      
      console.log(`   ✅ Found ${surveyData.rows.length} sample rows\n`);
      
      // Step 3: Analyze first row structure
      const firstRow = surveyData.rows[0];
      const rowData = firstRow.data || firstRow;
      
      console.log('   📋 Row Structure Analysis:');
      console.log(`   - All column names (${Object.keys(rowData).length} total):`);
      Object.keys(rowData).forEach(key => {
        console.log(`     • ${key}`);
      });
      
      // Step 4: Check for TCC-related columns
      console.log('\n   🎯 TCC-Related Columns:');
      const tccColumns = Object.keys(rowData).filter(key => {
        const lower = key.toLowerCase();
        return lower.includes('tcc') || 
               (lower.includes('total') && (lower.includes('cash') || lower.includes('comp'))) ||
               lower.includes('compensation');
      });
      
      if (tccColumns.length > 0) {
        tccColumns.forEach(col => {
          const value = rowData[col];
          console.log(`     ✅ ${col}: ${value} (type: ${typeof value})`);
        });
      } else {
        console.log('     ❌ No TCC-related columns found!');
      }
      
      // Step 5: Check for percentile pattern columns (WIDE format)
      console.log('\n   📊 Percentile Pattern Columns (WIDE format):');
      const percentilePattern = /^(.+)_(p25|p50|p75|p90|25th|50th|75th|90th)$/i;
      const percentileColumns = Object.keys(rowData).filter(key => percentilePattern.test(key));
      
      if (percentileColumns.length > 0) {
        console.log(`     ✅ Found ${percentileColumns.length} percentile columns:`);
        percentileColumns.forEach(col => {
          const match = col.match(percentilePattern);
          const varName = match ? match[1] : 'unknown';
          const percentile = match ? match[2] : 'unknown';
          const value = rowData[col];
          console.log(`       • ${col} → Variable: "${varName}", Percentile: ${percentile}, Value: ${value}`);
        });
        
        // Check specifically for TCC percentile columns
        const tccPercentileColumns = percentileColumns.filter(col => {
          const match = col.match(percentilePattern);
          const varName = match ? match[1].toLowerCase() : '';
          return varName.includes('tcc') || 
                 (varName.includes('total') && (varName.includes('cash') || varName.includes('comp'))) ||
                 varName === 'compensation';
        });
        
        if (tccPercentileColumns.length > 0) {
          console.log(`\n     ✅ TCC Percentile Columns Found (${tccPercentileColumns.length}):`);
          tccPercentileColumns.forEach(col => {
            const value = rowData[col];
            console.log(`       • ${col}: ${value}`);
          });
        } else {
          console.log(`\n     ❌ No TCC percentile columns found in WIDE format!`);
        }
      } else {
        console.log('     ❌ No percentile pattern columns found (not WIDE format)');
      }
      
      // Step 6: Check for LONG format (variable field)
      console.log('\n   📝 LONG Format Check:');
      const variableField = rowData.variable || rowData.Variable || rowData.benchmark || rowData.Benchmark;
      if (variableField) {
        console.log(`     ✅ Found variable field: "${variableField}"`);
        console.log(`     - p25: ${rowData.p25 || rowData['25th%'] || 'N/A'}`);
        console.log(`     - p50: ${rowData.p50 || rowData['50th%'] || rowData.Median || 'N/A'}`);
        console.log(`     - p75: ${rowData.p75 || rowData['75th%'] || 'N/A'}`);
        console.log(`     - p90: ${rowData.p90 || rowData['90th%'] || 'N/A'}`);
      } else {
        console.log('     ❌ No variable field found (not LONG format)');
      }
      
      // Step 7: Check all rows for TCC data
      console.log('\n   🔍 Checking All Sample Rows for TCC Data:');
      let rowsWithTCC = 0;
      surveyData.rows.forEach((row, idx) => {
        const rData = row.data || row;
        const hasTCC = Object.keys(rData).some(key => {
          const lower = key.toLowerCase();
          return (lower.includes('tcc') && (lower.includes('p50') || lower.includes('50th'))) ||
                 (lower.includes('total') && lower.includes('cash') && (lower.includes('p50') || lower.includes('50th')));
        });
        
        if (hasTCC) {
          rowsWithTCC++;
          if (idx < 3) { // Show first 3 rows with TCC
            console.log(`     ✅ Row ${idx + 1} has TCC data`);
            Object.keys(rData).filter(k => {
              const lower = k.toLowerCase();
              return lower.includes('tcc') || (lower.includes('total') && lower.includes('cash'));
            }).forEach(col => {
              console.log(`        - ${col}: ${rData[col]}`);
            });
          }
        }
      });
      
      console.log(`\n     📊 Summary: ${rowsWithTCC}/${surveyData.rows.length} rows have TCC-related columns`);
    }
    
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

// Run if called directly
if (require.main === module) {
  diagnoseSullivanCotterAPP().catch(console.error);
}

module.exports = { diagnoseSullivanCotterAPP };
