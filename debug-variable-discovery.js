/**
 * Diagnostic script to debug variable discovery
 * Run this in the browser console on the benchmarking screen
 */

(async function() {
  console.log('🔍 Variable Discovery Diagnostic\n');
  console.log('=' .repeat(50));
  
  try {
    // Import the service (if available globally) or access via window
    const VariableDiscoveryService = window.VariableDiscoveryService;
    
    if (!VariableDiscoveryService) {
      console.log('⚠️ VariableDiscoveryService not available globally');
      console.log('💡 Opening browser console on the benchmarking screen...');
      return;
    }
    
    const service = VariableDiscoveryService.getInstance();
    
    // Clear cache first
    console.log('\n1️⃣ Clearing cache...');
    service.clearCache();
    
    // Discover variables
    console.log('\n2️⃣ Discovering variables...');
    const startTime = performance.now();
    const discovered = await service.discoverAllVariables();
    const duration = performance.now() - startTime;
    
    console.log(`\n✅ Discovery complete in ${duration.toFixed(2)}ms`);
    console.log(`📊 Found ${discovered.length} variables\n`);
    
    // Group by category
    const byCategory = {
      compensation: [],
      productivity: [],
      ratio: [],
      other: []
    };
    
    discovered.forEach(v => {
      byCategory[v.category].push(v);
    });
    
    console.log('📋 Variables by category:');
    Object.entries(byCategory).forEach(([category, vars]) => {
      if (vars.length > 0) {
        console.log(`\n  ${category.toUpperCase()} (${vars.length}):`);
        vars.forEach(v => {
          console.log(`    - ${v.normalizedName} (${v.name})`);
          console.log(`      Sources: ${v.availableSources.join(', ')}`);
          console.log(`      Records: ${v.recordCount}`);
        });
      }
    });
    
    // Check specifically for ASA
    console.log('\n\n🔍 Checking for ASA variables:');
    const asaVariables = discovered.filter(v => 
      v.normalizedName.includes('asa') || 
      v.name.toLowerCase().includes('asa')
    );
    
    if (asaVariables.length === 0) {
      console.log('❌ NO ASA variables found!\n');
      console.log('🔍 Checking raw data columns...');
      
      // Try to check actual data
      const dataService = window.DataService || window.getDataService?.();
      if (dataService) {
        const surveys = await dataService.getAllSurveys();
        const sullivanCotter = surveys.find(s => s.type === 'SullivanCotter');
        
        if (sullivanCotter) {
          console.log(`\n📊 Checking Sullivan Cotter survey: ${sullivanCotter.name}`);
          const surveyData = await dataService.getSurveyData(sullivanCotter.id, {}, { limit: 5 });
          
          if (surveyData.rows.length > 0) {
            const firstRow = surveyData.rows[0];
            const data = firstRow.data || firstRow;
            const columns = Object.keys(data);
            
            console.log('\n📋 All columns in first row:');
            columns.sort().forEach(col => {
              const value = data[col];
              const isASA = col.toLowerCase().includes('asa');
              const matchesPattern = /^(.+)_p(25|50|75|90)$/i.test(col);
              console.log(`  ${isASA ? '🔍' : '  '} ${col} = ${value} ${matchesPattern ? '(matches pattern)' : ''}`);
            });
            
            const asaColumns = columns.filter(col => col.toLowerCase().includes('asa'));
            console.log(`\n🔍 Columns containing "ASA": ${asaColumns.length}`);
            asaColumns.forEach(col => {
              console.log(`  - ${col}`);
            });
            
            const asaPatternColumns = columns.filter(col => {
              const match = col.match(/^(.+)_p(25|50|75|90)$/i);
              return match && match[1].toLowerCase().includes('asa');
            });
            console.log(`\n🔍 Columns matching pattern *_p25/p50/p75/p90 with "ASA": ${asaPatternColumns.length}`);
            asaPatternColumns.forEach(col => {
              const match = col.match(/^(.+)_p(25|50|75|90)$/i);
              const baseName = match[1];
              const normalized = window.normalizeVariableName?.(baseName) || 'not available';
              console.log(`  - ${col} → base: "${baseName}" → normalized: "${normalized}"`);
            });
          }
        }
      }
    } else {
      console.log(`✅ Found ${asaVariables.length} ASA variable(s):`);
      asaVariables.forEach(v => {
        console.log(`\n  ✅ ${v.normalizedName} (${v.name})`);
        console.log(`     Category: ${v.category}`);
        console.log(`     Sources: ${v.availableSources.join(', ')}`);
        console.log(`     Records: ${v.recordCount}`);
        console.log(`     Format: ${v.format}`);
        console.log(`     Data Quality: ${(v.dataQuality * 100).toFixed(1)}%`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n💡 Tips:');
    console.log('  - If ASA is not found, check the column names in your data');
    console.log('  - Columns must match pattern: *_p25, *_p50, *_p75, *_p90');
    console.log('  - The base name is normalized using normalizeVariableName()');
    console.log('  - "ASA" should normalize to "asa_units"');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
})();

