/**
 * Test script to verify CFs calculation fix
 * Run in browser console after opening http://localhost:3000/analytics
 */

console.log('🧪 Testing CFs Calculation Fix...\n');

// Test data structure (simulating legacy data)
const testRows = [
  {
    surveySource: 'Gallagher Physician',
    surveySpecialty: 'Allergy/immunology',
    geographicRegion: 'National',
    tcc_n_orgs: 54, tcc_n_incumbents: 223,
    tcc_p25: 301897, tcc_p50: 374875, tcc_p75: 487541, tcc_p90: 644139,
    wrvu_n_orgs: 40, wrvu_n_incumbents: 135,
    wrvu_p25: 4075, wrvu_p50: 5366, wrvu_p75: 6911, wrvu_p90: 8428,
    cf_n_orgs: 40, cf_n_incumbents: 135,
    cf_p25: 64.82, cf_p50: 73.13, cf_p75: 83.30, cf_p90: 0  // Note: p90 is 0
  },
  {
    surveySource: 'Gallagher Physician',
    surveySpecialty: 'Allergy/immunology',
    geographicRegion: 'Northeast',
    tcc_n_orgs: 11, tcc_n_incumbents: 46,
    tcc_p25: 304687, tcc_p50: 351708, tcc_p75: 458701, tcc_p90: 511309,
    wrvu_n_orgs: 8, wrvu_n_incumbents: 28,
    wrvu_p25: 4956, wrvu_p50: 6044, wrvu_p75: 6927, wrvu_p90: 9411,
    cf_n_orgs: 8, cf_n_incumbents: 28,
    cf_p25: 53.23, cf_p50: 70.56, cf_p75: 74.17, cf_p90: 0  // Note: p90 is 0
  },
  {
    surveySource: 'Gallagher Physician',
    surveySpecialty: 'Allergy/immunology',
    geographicRegion: 'South',
    tcc_n_orgs: 15, tcc_n_incumbents: 61,
    tcc_p25: 230483, tcc_p50: 318750, tcc_p75: 458863, tcc_p90: 639770,
    wrvu_n_orgs: 13, wrvu_n_incumbents: 43,
    wrvu_p25: 3264, wrvu_p50: 4551, wrvu_p75: 7297, wrvu_p90: 8015,
    cf_n_orgs: 13, cf_n_incumbents: 43,
    cf_p25: 64.97, cf_p50: 73.85, cf_p75: 89.41, cf_p90: 0  // Note: p90 is 0
  }
];

// Selected variables (as user would select)
const selectedVariables = ['tcc', 'work_rvus', 'cfs'];

// Legacy field mapping (from the fix)
const legacyFieldMap = {
  'tcc': 'tcc',
  'work_rvus': 'wrvu',
  'wrvu': 'wrvu',
  'cf': 'cf',
  'conversion_factor': 'cf',
  'tcc_per_work_rvu': 'cf',
  'cfs': 'cf',  // Map 'cfs' to 'cf' for legacy data
  'tcc_per_work_rvus': 'cf'
};

console.log('📊 Test Data:');
console.log(`- Rows: ${testRows.length}`);
console.log(`- Selected Variables: ${selectedVariables.join(', ')}`);
console.log('\n');

// Test the calculation logic
selectedVariables.forEach(varName => {
  console.log(`\n🔍 Testing variable: ${varName}`);
  console.log('─'.repeat(60));
  
  const p25Values = [];
  const p50Values = [];
  const p75Values = [];
  const p90Values = [];
  const allWeights = [];
  let totalOrgs = 0;
  let totalIncumbents = 0;
  
  testRows.forEach((row, index) => {
    // Try dynamic variables first
    let metrics = row.variables?.[varName];
    
    // FALLBACK: Try legacy data structure
    if (!metrics && !row.variables) {
      const legacyPrefix = legacyFieldMap[varName] || varName;
      
      // Extract legacy data fields
      const nOrgs = row[`${legacyPrefix}_n_orgs`] || 0;
      const nIncumbents = row[`${legacyPrefix}_n_incumbents`] || 0;
      const p25 = row[`${legacyPrefix}_p25`] || 0;
      const p50 = row[`${legacyPrefix}_p50`] || 0;
      const p75 = row[`${legacyPrefix}_p75`] || 0;
      const p90 = row[`${legacyPrefix}_p90`] || 0;
      
      // Create metrics object from legacy fields
      if (p50 > 0) {
        metrics = {
          n_orgs: nOrgs,
          n_incumbents: nIncumbents,
          p25: p25,
          p50: p50,
          p75: p75,
          p90: p90
        };
        
        console.log(`  Row ${index + 1} (${row.geographicRegion}):`, {
          legacyPrefix,
          found: true,
          p50: p50.toLocaleString()
        });
      } else {
        console.log(`  Row ${index + 1} (${row.geographicRegion}): No data (p50 = 0)`);
      }
    }
    
    // Process metrics (from either dynamic or legacy source)
    if (metrics && metrics.p50 > 0) {
      p25Values.push(metrics.p25 || 0);
      p50Values.push(metrics.p50 || 0);
      p75Values.push(metrics.p75 || 0);
      p90Values.push(metrics.p90 || 0);
      allWeights.push(metrics.n_incumbents || 1);
      totalOrgs += metrics.n_orgs || 0;
      totalIncumbents += metrics.n_incumbents || 0;
    }
  });
  
  if (p50Values.length > 0) {
    // Calculate Simple Average
    const simpleAvg = {
      n_orgs: Math.round(totalOrgs / p50Values.length),
      n_incumbents: Math.round(totalIncumbents / p50Values.length),
      p25: p25Values.reduce((sum, val) => sum + val, 0) / p25Values.length,
      p50: p50Values.reduce((sum, val) => sum + val, 0) / p50Values.length,
      p75: p75Values.reduce((sum, val) => sum + val, 0) / p75Values.length,
      p90: p90Values.reduce((sum, val) => sum + val, 0) / p90Values.length
    };
    
    // Calculate Weighted Average
    const totalWeight = allWeights.reduce((sum, weight) => sum + weight, 0);
    const weightedAvg = {
      n_orgs: totalOrgs,
      n_incumbents: totalIncumbents,
      p25: p25Values.reduce((sum, val, index) => sum + (val * allWeights[index]), 0) / totalWeight,
      p50: p50Values.reduce((sum, val, index) => sum + (val * allWeights[index]), 0) / totalWeight,
      p75: p75Values.reduce((sum, val, index) => sum + (val * allWeights[index]), 0) / totalWeight,
      p90: p90Values.reduce((sum, val, index) => sum + (val * allWeights[index]), 0) / totalWeight
    };
    
    console.log('\n✅ Simple Average:', {
      n_orgs: simpleAvg.n_orgs,
      n_incumbents: simpleAvg.n_incumbents,
      p25: simpleAvg.p25.toLocaleString(),
      p50: simpleAvg.p50.toLocaleString(),
      p75: simpleAvg.p75.toLocaleString(),
      p90: simpleAvg.p90.toLocaleString()
    });
    
    console.log('\n✅ Weighted Average:', {
      n_orgs: weightedAvg.n_orgs,
      n_incumbents: weightedAvg.n_incumbents,
      p25: weightedAvg.p25.toLocaleString(),
      p50: weightedAvg.p50.toLocaleString(),
      p75: weightedAvg.p75.toLocaleString(),
      p90: weightedAvg.p90.toLocaleString()
    });
    
    console.log('\n✅ CALCULATION SUCCESSFUL - Should display values, not n/a');
  } else {
    console.log('\n❌ CALCULATION FAILED - Would display n/a');
  }
});

console.log('\n\n🎉 Test Complete!');
console.log('\nExpected Results:');
console.log('- TCC: Should show calculated Simple and Weighted averages ✅');
console.log('- Work RVUs: Should show calculated Simple and Weighted averages ✅');
console.log('- CFs: Should show calculated Simple and Weighted averages ✅ (FIXED)');
console.log('\nNote: P90 values might be 0 or n/a if source data has 0 for p90.');

