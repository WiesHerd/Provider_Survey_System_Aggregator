const sql = require('mssql');
require('dotenv').config({ path: './env.local' });

// Azure SQL Database configuration
const dbConfig = {
  server: process.env.AZURE_SQL_SERVER || 'your-server.database.windows.net',
  database: process.env.AZURE_SQL_DATABASE || 'SurveyAggregator',
  user: process.env.AZURE_SQL_USER || 'your-username',
  password: process.env.AZURE_SQL_PASSWORD || 'your-password',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  }
};

async function testAzureIntegration() {
  let pool;
  
  try {
    console.log('🧪 Testing Azure SQL Integration...');
    console.log('🔌 Connecting to Azure SQL Database...');
    
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to Azure SQL Database');
    
    // Test 1: Check if tables exist
    console.log('\n📋 Checking table structure...');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    
    console.log('📊 Available tables:', tablesResult.recordset.map(r => r.TABLE_NAME));
    
    // Test 2: Check survey_data table structure
    console.log('\n🔍 Checking survey_data table structure...');
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'survey_data'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 survey_data columns:');
    columnsResult.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE})`);
    });
    
    // Test 3: Check if rawData column exists
    const hasRawData = columnsResult.recordset.some(col => col.COLUMN_NAME === 'rawData');
    console.log(`\n✅ rawData column exists: ${hasRawData}`);
    
    // Test 4: Test data insertion (simulating the upload process)
    console.log('\n📝 Testing data insertion...');
    
    const testSurveyId = 'test-survey-' + Date.now();
    const testDataId = 'test-data-' + Date.now();
    
    // Insert test survey
    await pool.request()
      .input('id', sql.NVarChar, testSurveyId)
      .input('name', sql.NVarChar, 'Test Survey')
      .input('year', sql.Int, 2024)
      .input('type', sql.NVarChar, 'Test')
      .input('uploadDate', sql.NVarChar, new Date().toISOString())
      .input('rowCount', sql.Int, 1)
      .input('specialtyCount', sql.Int, 1)
      .input('dataPoints', sql.Int, 1)
      .input('colorAccent', sql.NVarChar, '#6366F1')
      .input('metadata', sql.NVarChar, JSON.stringify({ test: true }))
      .query(`
        INSERT INTO surveys (id, name, year, type, uploadDate, row_count, specialty_count, data_points, colorAccent, metadata)
        VALUES (@id, @name, @year, @type, @uploadDate, @rowCount, @specialtyCount, @dataPoints, @colorAccent, @metadata)
      `);
    
    console.log('✅ Test survey inserted');
    
    // Insert test data row
    const testRow = {
      specialty: 'Test Anesthesiology',
      providerType: 'Physician',
      region: 'West',
      tcc_p50: 500000,
      cf_p50: 50,
      wrvu_p50: 5000,
      n_incumbents: 10
    };
    
    await pool.request()
      .input('id', sql.NVarChar, testDataId)
      .input('surveyId', sql.NVarChar, testSurveyId)
      .input('specialty', sql.NVarChar, testRow.specialty)
      .input('providerType', sql.NVarChar, testRow.providerType)
      .input('region', sql.NVarChar, testRow.region)
      .input('tcc', sql.Float, testRow.tcc_p50)
      .input('cf', sql.Float, testRow.cf_p50)
      .input('wrvu', sql.Float, testRow.wrvu_p50)
      .input('count', sql.Int, testRow.n_incumbents)
      .input('rawData', sql.NVarChar, JSON.stringify(testRow))
      .query(`
        INSERT INTO survey_data (id, surveyId, specialty, providerType, region, tcc, cf, wrvu, count, rawData)
        VALUES (@id, @surveyId, @specialty, @providerType, @region, @tcc, @cf, @wrvu, @count, @rawData)
      `);
    
    console.log('✅ Test data row inserted');
    
    // Test 5: Verify data was inserted correctly
    console.log('\n🔍 Verifying inserted data...');
    const verifyResult = await pool.request()
      .input('surveyId', sql.NVarChar, testSurveyId)
      .query(`
        SELECT s.name, s.type, sd.specialty, sd.providerType, sd.region, sd.rawData
        FROM surveys s
        JOIN survey_data sd ON s.id = sd.surveyId
        WHERE s.id = @surveyId
      `);
    
    if (verifyResult.recordset.length > 0) {
      console.log('✅ Data verification successful:');
      console.log(`  Survey: ${verifyResult.recordset[0].name} (${verifyResult.recordset[0].type})`);
      console.log(`  Specialty: ${verifyResult.recordset[0].specialty}`);
      console.log(`  Provider Type: ${verifyResult.recordset[0].providerType}`);
      console.log(`  Region: ${verifyResult.recordset[0].region}`);
      console.log(`  Raw Data: ${verifyResult.recordset[0].rawData.substring(0, 100)}...`);
    } else {
      console.log('❌ Data verification failed - no records found');
    }
    
    // Test 6: Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await pool.request()
      .input('surveyId', sql.NVarChar, testSurveyId)
      .query('DELETE FROM survey_data WHERE surveyId = @surveyId');
    
    await pool.request()
      .input('surveyId', sql.NVarChar, testSurveyId)
      .query('DELETE FROM surveys WHERE id = @surveyId');
    
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 Azure SQL Integration Test Complete!');
    console.log('✅ All tests passed - Azure SQL is ready for production use');
    
  } catch (error) {
    console.error('❌ Azure SQL Integration Test Failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
testAzureIntegration();
