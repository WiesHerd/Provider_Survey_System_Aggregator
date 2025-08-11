const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'survey_data.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Debugging Regional Data Transformation...\n');

// Simulate the frontend data loading process
db.all("SELECT * FROM survey_data WHERE specialty LIKE '%Allergy%' OR specialty LIKE '%Immunology%' LIMIT 5", [], (err, rows) => {
  if (err) {
    console.error('❌ Error querying data:', err);
    return;
  }
  
  console.log('📊 Raw database rows:');
  rows.forEach((row, index) => {
    try {
      const parsedData = JSON.parse(row.data);
      console.log(`Row ${index + 1}:`);
      console.log(`  - specialty: "${row.specialty}"`);
      console.log(`  - region: "${row.region}"`);
      console.log(`  - tcc_p50: ${parsedData.tcc_p50}`);
      console.log(`  - provider_type: "${parsedData.provider_type}"`);
      console.log(`  - geographic_region: "${parsedData.geographic_region}"`);
      console.log('');
    } catch (e) {
      console.log(`Row ${index + 1}: Error parsing data - ${e.message}`);
    }
  });
  
  // Check what the transformation should look like
  console.log('🔄 Simulating transformation...');
  const transformedRows = rows.map(row => {
    try {
      const parsedData = JSON.parse(row.data);
      return {
        specialty: row.specialty,
        geographicRegion: parsedData.geographic_region || row.region,
        tcc_p50: parsedData.tcc_p50,
        providerType: parsedData.provider_type,
        surveySource: 'SullivanCotter' // Assuming this is the source
      };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
  
  console.log('📋 Transformed rows:');
  transformedRows.forEach((row, index) => {
    console.log(`Row ${index + 1}:`);
    console.log(`  - specialty: "${row.specialty}"`);
    console.log(`  - geographicRegion: "${row.geographicRegion}"`);
    console.log(`  - tcc_p50: ${row.tcc_p50}`);
    console.log(`  - providerType: "${row.providerType}"`);
    console.log('');
  });
  
  // Check regional filtering
  const regions = ['National', 'Northeast', 'Midwest', 'South', 'West'];
  console.log('🔍 Regional filtering test:');
  regions.forEach(region => {
    const regionRows = region === 'National' 
      ? transformedRows 
      : transformedRows.filter(r => r.geographicRegion === region);
    
    console.log(`  ${region}: ${regionRows.length} rows`);
    if (regionRows.length > 0) {
      const avgTcc = regionRows.reduce((sum, r) => sum + (Number(r.tcc_p50) || 0), 0) / regionRows.length;
      console.log(`    Average TCC P50: $${avgTcc.toLocaleString()}`);
    }
  });
  
  db.close();
});
