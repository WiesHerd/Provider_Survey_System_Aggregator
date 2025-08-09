const { getConnection, closeConnection } = require('./config/database');

async function testConnection() {
  console.log('🧪 Testing Azure SQL Database connection...');
  
  try {
    // Test connection
    const db = await getConnection();
    console.log('✅ Connection successful!');
    
    // Test simple query
    const result = await db.request().query('SELECT 1 as test');
    console.log('✅ Query test successful:', result.recordset[0]);
    
    // Test table creation
    console.log('🏗️ Testing table creation...');
    await db.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='test_table' AND xtype='U')
      CREATE TABLE test_table (
        id INT PRIMARY KEY,
        name NVARCHAR(50)
      )
    `);
    console.log('✅ Table creation test successful');
    
    // Clean up test table
    await db.request().query('DROP TABLE IF EXISTS test_table');
    console.log('✅ Cleanup successful');
    
    console.log('\n🎉 All tests passed! Azure SQL Database is ready.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('1. Check your .env file has correct Azure credentials');
    console.error('2. Verify Azure SQL Server firewall allows your IP');
    console.error('3. Ensure server name includes .database.windows.net');
    console.error('4. Check username and password are correct');
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Run the test
testConnection();

