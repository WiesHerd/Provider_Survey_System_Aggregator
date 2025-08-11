const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
  });
}

async function testRegionalAnalytics() {
  try {
    console.log('🔍 Testing Regional Analytics Data Loading...\n');
    
    // 1. Get all surveys
    console.log('📋 Getting surveys...');
    const surveys = await makeRequest('http://localhost:3001/api/surveys');
    console.log(`✅ Found ${surveys.length} surveys:`, surveys.map(s => ({ id: s.id, type: s.surveyProvider })));
    
    // 2. Get specialty mappings
    console.log('\n📋 Getting specialty mappings...');
    const mappings = await makeRequest('http://localhost:3001/api/mappings/specialty');
    const allergyMapping = mappings.find(m => m.standardizedName === 'Allergy & Immunology');
    console.log(`✅ Found ${mappings.length} specialty mappings`);
    console.log('🔍 Allergy & Immunology mapping:', allergyMapping);
    
    // 3. Test data loading for each survey with limit
    console.log('\n📊 Testing data loading for each survey...');
    let totalRows = 0;
    let allergyRows = 0;
    
    for (const survey of surveys) {
      console.log(`\n🔍 Loading data for survey: ${survey.id} (${survey.surveyProvider})`);
      const data = await makeRequest(`http://localhost:3001/api/survey/${survey.id}/data?limit=10000`);
      
      if (data && data.rows) {
        console.log(`✅ Loaded ${data.rows.length} rows from ${survey.surveyProvider}`);
        totalRows += data.rows.length;
        
        // Check for Allergy & Immunology data
        const allergyData = data.rows.filter(row => {
          const rowSpecialty = row.specialty || row.normalizedSpecialty || '';
          return allergyMapping && allergyMapping.sourceSpecialties.some(spec => 
            spec.specialty === rowSpecialty && spec.surveySource === survey.surveyProvider
          );
        });
        
        if (allergyData.length > 0) {
          console.log(`🎯 Found ${allergyData.length} Allergy & Immunology rows in ${survey.surveyProvider}`);
          console.log('📋 Sample rows:', allergyData.slice(0, 2).map(row => ({
            specialty: row.specialty,
            geographicRegion: row.geographicRegion,
            tcc_p50: row.tcc_p50,
            cf_p50: row.cf_p50
          })));
          allergyRows += allergyData.length;
        } else {
          console.log(`❌ No Allergy & Immunology data found in ${survey.surveyProvider}`);
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total rows loaded: ${totalRows}`);
    console.log(`- Allergy & Immunology rows: ${allergyRows}`);
    
  } catch (error) {
    console.error('❌ Error testing Regional Analytics:', error.message);
  }
}

testRegionalAnalytics();
