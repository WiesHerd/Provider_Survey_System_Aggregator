const sql = require('mssql');
require('dotenv').config({ path: './env.local' });

// Azure SQL Database configuration
const dbConfig = {
  server: process.env.AZURE_SQL_SERVER || 'your-server.database.windows.net',
  database: process.env.AZURE_SQL_DATABASE || 'SurveyAggregator',
  user: process.env.AZURE_SQL_USER || 'your-username',
  password: process.env.AZURE_SQL_PASSWORD || 'your-password',
  options: {
    encrypt: true, // Required for Azure
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

// Connection pool
let pool = null;

// Initialize database connection pool
async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to Azure SQL Database...');
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to Azure SQL Database');
    
    // Create tables if they don't exist
    await createTables();
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Create database tables
async function createTables() {
  try {
    console.log('🏗️ Creating database tables...');
    
    // Surveys table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='surveys' AND xtype='U')
      CREATE TABLE surveys (
        id NVARCHAR(36) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        year INT,
        type NVARCHAR(100),
        uploadDate NVARCHAR(50),
        row_count INT,
        specialty_count INT,
        data_points INT,
        colorAccent NVARCHAR(10),
        metadata NVARCHAR(MAX)
      )
    `);

    // Survey data table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='survey_data' AND xtype='U')
      CREATE TABLE survey_data (
        id NVARCHAR(36) PRIMARY KEY,
        surveyId NVARCHAR(36),
        specialty NVARCHAR(255),
        providerType NVARCHAR(255),
        region NVARCHAR(255),
        tcc FLOAT,
        cf FLOAT,
        wrvu FLOAT,
        count INT,
        rawData NVARCHAR(MAX),
        FOREIGN KEY (surveyId) REFERENCES surveys(id)
      )
    `);

    // Ensure rawData column exists for existing deployments
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE Name = N'rawData' AND Object_ID = Object_ID(N'survey_data')
      )
      ALTER TABLE survey_data ADD rawData NVARCHAR(MAX)
    `);

    // Specialty mappings table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='specialty_mappings' AND xtype='U')
      CREATE TABLE specialty_mappings (
        id NVARCHAR(36) PRIMARY KEY,
        sourceSpecialty NVARCHAR(255),
        mappedSpecialty NVARCHAR(255),
        createdDate NVARCHAR(50)
      )
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

// Get database connection
async function getConnection() {
  if (!pool) {
    await initializeDatabase();
  }
  return pool;
}

// Close database connection
async function closeConnection() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Database connection closed');
  }
}

module.exports = {
  getConnection,
  closeConnection,
  initializeDatabase
};
